-- =====================================================
-- DENUE Integration — Sprint 2: Map RPC Update
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Actualizar la función para que retorne TANTO negocios nativos 
-- (tabla businesses) COMO candidatos pendientes (tabla business_candidates)
CREATE OR REPLACE FUNCTION public.businesses_in_bounds(
  west DOUBLE PRECISION,
  south DOUBLE PRECISION,
  east DOUBLE PRECISION,
  north DOUBLE PRECISION,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 300
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
AS $$
  (
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
    WHERE COALESCE(b.business_status, 'active') = 'active'
      AND b.status = 'approved'
      AND COALESCE(b.is_visible, true) = true
      AND (p_category IS NULL OR b.category = p_category)
      AND b.latitude IS NOT NULL
      AND b.longitude IS NOT NULL
      AND ST_Intersects(
        b.location::geometry,
        ST_MakeEnvelope(west, south, east, north, 4326)
      )
  )
  UNION ALL
  (
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
      AND c.lat IS NOT NULL
      AND c.lng IS NOT NULL
      AND ST_Intersects(
        c.location::geometry,
        ST_MakeEnvelope(west, south, east, north, 4326)
      )
  )
  ORDER BY
    is_verified DESC,
    is_claimed DESC,
    name ASC
  LIMIT GREATEST(1, LEAST(p_limit, 1000));
$$;

GRANT EXECUTE ON FUNCTION public.businesses_in_bounds TO anon, authenticated;
