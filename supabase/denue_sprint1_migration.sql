-- =====================================================
-- DENUE Integration — Sprint 1: PostGIS + Staging Tables
-- Ejecutar en Supabase SQL Editor (en orden)
-- =====================================================

-- =====================================================
-- 1. ACTIVAR PostGIS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================
-- 2. TABLA: import_batches
--    Auditoría de cada lote importado (DENUE, Overture, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,           -- 'denue', 'overture', 'csv_manual'
  source_version TEXT,                 -- 'DENUE_2025_01' o 'overture_2025-03'
  import_type TEXT NOT NULL DEFAULT 'bootstrap',  -- 'bootstrap', 'sync', 'manual'
  country_code TEXT NOT NULL DEFAULT 'MX',
  state_code TEXT,                     -- '09' para CDMX, '15' para Edomex
  city_name TEXT,
  file_name TEXT,                      -- nombre del archivo procesado
  row_count_raw INTEGER DEFAULT 0,     -- filas leídas del archivo
  row_count_staged INTEGER DEFAULT 0,  -- filas insertadas en staging
  row_count_candidates INTEGER DEFAULT 0,
  row_count_published INTEGER DEFAULT 0,
  row_count_duplicates INTEGER DEFAULT 0,
  row_count_errors INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'staging', 'normalizing', 'deduplicating', 'publishing', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_import_batches_status ON import_batches(status);
CREATE INDEX idx_import_batches_source ON import_batches(source_name, state_code);

-- RLS: solo admins
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage import_batches"
  ON import_batches FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- =====================================================
-- 3. TABLA: staging_denue
--    Dato crudo del INEGI, tal como viene del archivo
-- =====================================================
CREATE TABLE IF NOT EXISTS staging_denue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,

  -- Identificadores DENUE
  clee TEXT,                          -- Clave Única del Establecimiento
  denue_id TEXT,                      -- ID numérico del DENUE

  -- Datos crudos principales
  nombre TEXT,
  razon_social TEXT,
  actividad_nombre TEXT,              -- Nombre de la actividad económica
  actividad_codigo TEXT,              -- Código SCIAN
  estrato TEXT,                       -- Tamaño: '0 a 5', '6 a 10', etc.
  tipo TEXT,                          -- Tipo de establecimiento

  -- Dirección cruda
  tipo_vialidad TEXT,
  calle TEXT,
  num_exterior TEXT,
  num_interior TEXT,
  colonia TEXT,
  cp TEXT,
  localidad TEXT,
  municipio TEXT,
  entidad TEXT,
  ubicacion_texto TEXT,               -- Dirección compuesta

  -- Contacto
  telefono TEXT,
  correo_e TEXT,
  sitio_internet TEXT,

  -- Ubicación
  latitud TEXT,                       -- Text porque viene como string del CSV
  longitud TEXT,

  -- Payload completo original
  raw_payload JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_staging_denue_batch ON staging_denue(import_batch_id);
CREATE INDEX idx_staging_denue_clee ON staging_denue(clee);
CREATE INDEX idx_staging_denue_denue_id ON staging_denue(denue_id);

-- RLS: solo admins
ALTER TABLE staging_denue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage staging_denue"
  ON staging_denue FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- =====================================================
-- 4. TABLA: business_candidates
--    Dato normalizado, listo para revisión/publicación
-- =====================================================
CREATE TABLE IF NOT EXISTS business_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL,

  -- Trazabilidad de fuente
  source_type TEXT NOT NULL DEFAULT 'seed_denue',   -- seed_denue, seed_overture
  source_record_id TEXT,              -- denue_id o overture_id original
  clee TEXT,                          -- CLEE del DENUE (null para otras fuentes)
  denue_id TEXT,                      -- ID numérico del DENUE

  -- Datos normalizados
  name TEXT NOT NULL,
  slug TEXT,
  category_raw TEXT,                  -- Categoría original del DENUE
  category_normalized TEXT,           -- Categoría mapeada a Geobooker
  subcategory TEXT,

  -- Ubicación normalizada
  country_code TEXT NOT NULL DEFAULT 'MX',
  state_code TEXT,
  municipality_code TEXT,
  city_name TEXT,
  address_line TEXT,
  postal_code TEXT,

  -- Contacto
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Coordenadas
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326),

  -- Metadata de calidad
  estrato TEXT,                       -- Tamaño del negocio según DENUE
  confidence_score DECIMAL(3,2) DEFAULT 0.50,  -- 0.00 a 1.00
  attribution_text TEXT DEFAULT 'Fuente: INEGI, DENUE',

  -- Estado de moderación
  moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'duplicate', 'merged')),
  moderation_notes TEXT,
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMP WITH TIME ZONE,

  -- Payload
  raw_payload JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_candidates_batch ON business_candidates(import_batch_id);
CREATE INDEX idx_candidates_status ON business_candidates(moderation_status);
CREATE INDEX idx_candidates_clee ON business_candidates(clee);
CREATE INDEX idx_candidates_denue_id ON business_candidates(denue_id);
CREATE INDEX idx_candidates_source ON business_candidates(source_type);
CREATE INDEX idx_candidates_location ON business_candidates USING GIST (location);
CREATE INDEX idx_candidates_slug ON business_candidates(slug);

-- RLS: solo admins
ALTER TABLE business_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage business_candidates"
  ON business_candidates FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- =====================================================
-- 5. AGREGAR COLUMNAS A businesses (si no existen)
-- =====================================================
DO $$
BEGIN
  -- Slug único para SEO
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'slug'
  ) THEN
    ALTER TABLE businesses ADD COLUMN slug TEXT;
  END IF;

  -- Columna geográfica PostGIS
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'location'
  ) THEN
    ALTER TABLE businesses ADD COLUMN location GEOGRAPHY(POINT, 4326);
  END IF;

  -- Estado del negocio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_status'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_status TEXT DEFAULT 'active';
  END IF;

  -- Verificado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE businesses ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;

  -- Ciudad
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'city_name'
  ) THEN
    ALTER TABLE businesses ADD COLUMN city_name TEXT;
  END IF;

  -- Estado (entidad federativa)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'state_code'
  ) THEN
    ALTER TABLE businesses ADD COLUMN state_code TEXT;
  END IF;

  -- Código postal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE businesses ADD COLUMN postal_code TEXT;
  END IF;

  -- Subcategoría
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'subcategory'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE businesses ADD COLUMN subcategory TEXT;
  END IF;

  -- Estrato (tamaño)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'estrato'
  ) THEN
    ALTER TABLE businesses ADD COLUMN estrato TEXT;
  END IF;

  -- País
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE businesses ADD COLUMN country_code TEXT DEFAULT 'MX';
  END IF;
END $$;

-- Poblar location para negocios existentes que ya tienen lat/lng
UPDATE businesses
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;

-- Índice espacial GiST
CREATE INDEX IF NOT EXISTS idx_businesses_location_gist
  ON businesses USING GIST (location);

-- Índice para slug
CREATE INDEX IF NOT EXISTS idx_businesses_slug
  ON businesses(slug);

-- =====================================================
-- 6. FUNCIÓN RPC: businesses_in_bounds
--    Devuelve negocios visibles en el viewport del mapa
-- =====================================================
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
    AND (p_category IS NULL OR b.category = p_category)
    AND b.latitude IS NOT NULL
    AND b.longitude IS NOT NULL
    AND ST_Intersects(
      b.location::geometry,
      ST_MakeEnvelope(west, south, east, north, 4326)
    )
  ORDER BY
    COALESCE(b.is_verified, false) DESC,
    COALESCE(b.is_claimed, false) DESC,
    b.name ASC
  LIMIT GREATEST(1, LEAST(p_limit, 1000));
$$;

-- Permitir que cualquiera llame la función (es pública, para el mapa)
GRANT EXECUTE ON FUNCTION public.businesses_in_bounds TO anon, authenticated;

-- =====================================================
-- 7. TRIGGER: auto-poblar location al INSERT/UPDATE
-- =====================================================
CREATE OR REPLACE FUNCTION update_business_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_business_location ON businesses;
CREATE TRIGGER trg_update_business_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_business_location();

-- =====================================================
-- 8. VERIFICACIÓN
-- =====================================================
SELECT 'PostGIS version' AS check_type, PostGIS_Version() AS result
UNION ALL
SELECT 'import_batches exists', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'import_batches') 
  THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'staging_denue exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staging_denue') 
  THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'business_candidates exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_candidates') 
  THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'businesses.location exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'location') 
  THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'businesses_in_bounds function exists',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'businesses_in_bounds') 
  THEN 'YES' ELSE 'NO' END;
