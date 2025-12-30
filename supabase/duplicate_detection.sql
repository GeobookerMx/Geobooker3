-- supabase/duplicate_detection.sql
-- P1.3: Detección de duplicados para anti-fraude/spam
-- Ejecutar en Supabase SQL Editor

-- 1) Función para detectar negocios duplicados potenciales
CREATE OR REPLACE FUNCTION public.find_duplicate_businesses(
  p_phone TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_radius_meters INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  distance_meters NUMERIC,
  match_type TEXT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.phone,
    b.address,
    b.latitude,
    b.longitude,
    CASE 
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND b.geog IS NOT NULL THEN
        ST_Distance(
          b.geog,
          ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
        )
      ELSE NULL
    END as distance_meters,
    CASE
      WHEN p_phone IS NOT NULL AND b.phone = p_phone THEN 'exact_phone'
      WHEN p_phone IS NOT NULL AND b.phone LIKE '%' || RIGHT(p_phone, 10) THEN 'similar_phone'
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL 
        AND b.geog IS NOT NULL
        AND ST_DWithin(
          b.geog,
          ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
          p_radius_meters
        ) THEN 'nearby_location'
      WHEN p_name IS NOT NULL 
        AND similarity(LOWER(b.name), LOWER(p_name)) > 0.6 THEN 'similar_name'
      ELSE 'unknown'
    END as match_type
  FROM businesses b
  WHERE b.status = 'approved'
    AND (
      -- Match por teléfono exacto
      (p_phone IS NOT NULL AND b.phone = p_phone)
      -- Match por teléfono similar (últimos 10 dígitos)
      OR (p_phone IS NOT NULL AND b.phone LIKE '%' || RIGHT(p_phone, 10))
      -- Match por ubicación cercana
      OR (p_latitude IS NOT NULL AND p_longitude IS NOT NULL 
          AND b.geog IS NOT NULL
          AND ST_DWithin(
            b.geog,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
            p_radius_meters
          ))
      -- Match por nombre similar (requiere pg_trgm)
      OR (p_name IS NOT NULL AND similarity(LOWER(b.name), LOWER(p_name)) > 0.6)
    )
  ORDER BY distance_meters NULLS LAST
  LIMIT 10;
END;
$$;

-- 2) Crear extensión pg_trgm para similitud de texto (si no existe)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3) Tabla para marcar duplicados detectados
CREATE TABLE IF NOT EXISTS duplicate_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  duplicate_business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL, -- 'exact_phone', 'similar_phone', 'nearby_location', 'similar_name'
  confidence DECIMAL(3,2), -- 0.00 a 1.00
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed_duplicate', 'not_duplicate', 'merged'
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_duplicate_flags_status ON duplicate_flags(status);
CREATE INDEX IF NOT EXISTS idx_duplicate_flags_original ON duplicate_flags(original_business_id);

-- RLS
ALTER TABLE duplicate_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage duplicate_flags"
ON duplicate_flags FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- 4) Trigger para detectar duplicados al crear negocio
CREATE OR REPLACE FUNCTION check_for_duplicates()
RETURNS TRIGGER AS $$
DECLARE
  dup RECORD;
BEGIN
  -- Buscar duplicados potenciales
  FOR dup IN 
    SELECT * FROM public.find_duplicate_businesses(
      NEW.phone,
      NEW.latitude,
      NEW.longitude,
      NEW.name,
      50
    )
    WHERE id != NEW.id
  LOOP
    -- Insertar flag de duplicado
    INSERT INTO duplicate_flags (
      original_business_id,
      duplicate_business_id,
      match_type,
      confidence
    ) VALUES (
      dup.id,
      NEW.id,
      dup.match_type,
      CASE dup.match_type
        WHEN 'exact_phone' THEN 0.95
        WHEN 'similar_phone' THEN 0.70
        WHEN 'nearby_location' THEN 0.60
        WHEN 'similar_name' THEN 0.50
        ELSE 0.30
      END
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Solo activar trigger para negocios aprobados
DROP TRIGGER IF EXISTS check_duplicates_trigger ON businesses;
CREATE TRIGGER check_duplicates_trigger
AFTER INSERT OR UPDATE OF status ON businesses
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION check_for_duplicates();

-- 5) Vista para panel admin de duplicados
CREATE OR REPLACE VIEW admin_duplicates_view AS
SELECT 
  df.*,
  b1.name as original_name,
  b1.phone as original_phone,
  b1.address as original_address,
  b2.name as duplicate_name,
  b2.phone as duplicate_phone,
  b2.address as duplicate_address
FROM duplicate_flags df
LEFT JOIN businesses b1 ON df.original_business_id = b1.id
LEFT JOIN businesses b2 ON df.duplicate_business_id = b2.id
WHERE df.status = 'pending'
ORDER BY df.confidence DESC, df.detected_at DESC;

COMMENT ON TABLE duplicate_flags IS 'Registros de negocios potencialmente duplicados para revisión de admins';
COMMENT ON FUNCTION find_duplicate_businesses IS 'Función para detectar duplicados por teléfono, ubicación o nombre similar';
