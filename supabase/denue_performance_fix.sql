-- =====================================================
-- FIX DEFINITIVO: Timeout en businesses_in_bounds
-- 
-- Causa: ST_Intersects(location::geometry, ...) es lento
-- incluso con GiST en 103K+ filas de business_candidates.
--
-- Solución: Usar comparación simple de lat/lng con 
-- operadores < > (usa B-tree index, mucho más rápido)
-- =====================================================

-- 1. Asegurar B-tree indexes en lat/lng (rapidísimos)
CREATE INDEX IF NOT EXISTS idx_candidates_lat ON business_candidates (lat);
CREATE INDEX IF NOT EXISTS idx_candidates_lng ON business_candidates (lng);
CREATE INDEX IF NOT EXISTS idx_candidates_modstatus ON business_candidates (moderation_status);
CREATE INDEX IF NOT EXISTS idx_businesses_lat ON businesses (latitude);
CREATE INDEX IF NOT EXISTS idx_businesses_lng ON businesses (longitude);

-- 2. Índice compuesto parcial para la consulta más común
CREATE INDEX IF NOT EXISTS idx_candidates_pending_latlon
  ON business_candidates (lat, lng)
  WHERE moderation_status = 'pending' AND lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_approved_latlon
  ON businesses (latitude, longitude)
  WHERE status = 'approved' AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. REEMPLAZAR la función RPC con versión optimizada
-- Usa lat/lng directamente en vez de ST_Intersects
DROP FUNCTION IF EXISTS public.businesses_in_bounds(double precision, double precision, double precision, double precision, text, integer);

CREATE OR REPLACE FUNCTION public.businesses_in_bounds(
  west DOUBLE PRECISION,
  south DOUBLE PRECISION,
  east DOUBLE PRECISION,
  north DOUBLE PRECISION,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 200
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  category TEXT,
  city_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_claimed BOOLEAN,
  is_verified BOOLEAN,
  source_type TEXT,
  address TEXT,
  phone TEXT
)
LANGUAGE sql
STABLE
SET statement_timeout = '8s'
AS $$
  (
    -- Negocios nativos de Geobooker (pocos, rápidos)
    SELECT
      b.id,
      b.name,
      b.slug,
      b.category,
      b.city_name,
      b.latitude AS lat,
      b.longitude AS lng,
      COALESCE(b.is_claimed, false) AS is_claimed,
      COALESCE(b.is_verified, false) AS is_verified,
      COALESCE(b.source_type, 'native') AS source_type,
      b.address,
      b.phone
    FROM businesses b
    WHERE b.status = 'approved'
      AND COALESCE(b.is_visible, true) = true
      AND COALESCE(b.business_status, 'active') = 'active'
      AND (p_category IS NULL OR b.category = p_category)
      AND b.latitude  BETWEEN south AND north
      AND b.longitude BETWEEN west  AND east
    LIMIT 100
  )
  UNION ALL
  (
    -- Negocios DENUE (muchos — optimizado con lat/lng directo)
    SELECT
      c.id,
      c.name,
      c.slug,
      c.category_normalized AS category,
      c.city_name,
      c.lat,
      c.lng,
      false AS is_claimed,
      false AS is_verified,
      COALESCE(c.source_type, 'seed_denue') AS source_type,
      c.address_line AS address,
      c.phone
    FROM business_candidates c
    WHERE c.moderation_status = 'pending'
      AND (p_category IS NULL OR c.category_normalized = p_category)
      AND c.lat  BETWEEN south AND north
      AND c.lng  BETWEEN west  AND east
    LIMIT GREATEST(1, LEAST(p_limit, 500))
  )
  ORDER BY
    is_verified DESC,
    is_claimed DESC,
    name ASC
  LIMIT GREATEST(1, LEAST(p_limit, 500));
$$;

-- 4. Permisos
GRANT EXECUTE ON FUNCTION public.businesses_in_bounds TO anon, authenticated;

-- 5. ANALYZE para estadísticas
ANALYZE business_candidates;
ANALYZE businesses;

-- 6. Test rápido (CDMX viewport)
SELECT COUNT(*) as total_results FROM businesses_in_bounds(
  -99.20, 19.35, -99.10, 19.45
);

-- 7. Recargar schema
NOTIFY pgrst, 'reload schema';
