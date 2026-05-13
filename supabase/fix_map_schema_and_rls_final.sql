-- ====================================================================
-- SCRIPT SQL DEFINITIVO: CORRECCIÓN DE MAPA, COLUMNAS Y RLS EN SUPABASE
-- ====================================================================
-- Ejecutar en Supabase SQL Editor
-- Resuelve el problema del mapa vacío en la web y app nativa
-- ====================================================================

-- 1. AÑADIR COLUMNAS FALTANTES A LA TABLA businesses DE FORMA SEGURA
DO $$
BEGIN
  -- Slug único para rutas/SEO
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'slug') THEN
    ALTER TABLE businesses ADD COLUMN slug TEXT;
  END IF;

  -- Columna geográfica PostGIS nativa
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'location') THEN
    ALTER TABLE businesses ADD COLUMN location GEOGRAPHY(POINT, 4326);
  END IF;

  -- Estado del negocio (diferente a status de moderación)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'business_status') THEN
    ALTER TABLE businesses ADD COLUMN business_status TEXT DEFAULT 'active';
  END IF;

  -- Verificación oficial
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_verified') THEN
    ALTER TABLE businesses ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;

  -- Reclamo de negocio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_claimed') THEN
    ALTER TABLE businesses ADD COLUMN is_claimed BOOLEAN DEFAULT false;
  END IF;

  -- Tipo de fuente
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'source_type') THEN
    ALTER TABLE businesses ADD COLUMN source_type TEXT DEFAULT 'native';
  END IF;

  -- Visibilidad digital (toggle en dashboard)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_visible') THEN
    ALTER TABLE businesses ADD COLUMN is_visible BOOLEAN DEFAULT true;
  END IF;

  -- Segmentación geográfica
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'city_name') THEN
    ALTER TABLE businesses ADD COLUMN city_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'state_code') THEN
    ALTER TABLE businesses ADD COLUMN state_code TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'postal_code') THEN
    ALTER TABLE businesses ADD COLUMN postal_code TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'subcategory') THEN
    ALTER TABLE businesses ADD COLUMN subcategory TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'estrato') THEN
    ALTER TABLE businesses ADD COLUMN estrato TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'country_code') THEN
    ALTER TABLE businesses ADD COLUMN country_code TEXT DEFAULT 'MX';
  END IF;
END $$;

-- 2. POBLAR Y SINCRONIZAR LA COLUMNA GEOGRÁFICA (PostGIS)
UPDATE businesses
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;

-- Crear o asegurar el índice espacial GiST en location
CREATE INDEX IF NOT EXISTS idx_businesses_location_gist ON businesses USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_businesses_slug_final ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_visible_final ON businesses(is_visible);

-- 3. TRIGGER PARA AUTO-POBLAR location AL INSERTAR O ACTUALIZAR COORDENADAS
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

-- ====================================================================
-- 4. APERTURA DE ROW LEVEL SECURITY (RLS) PARA EL MAPA
-- ====================================================================

-- Habilitar explícitamente lectura pública a candidatos DENUE pendientes
ALTER TABLE business_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view pending candidates" ON business_candidates;
CREATE POLICY "Public can view pending candidates"
  ON business_candidates FOR SELECT
  TO public
  USING (moderation_status = 'pending');

-- Asegurar que la lectura pública de negocios nativos contemple is_visible
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved businesses" ON businesses;
CREATE POLICY "Public can view approved businesses"
  ON businesses FOR SELECT
  TO public
  USING (status = 'approved' AND COALESCE(is_visible, true) = true);

-- ====================================================================
-- ✅ LISTO: Esquemas y accesos habilitados con éxito
-- ====================================================================
