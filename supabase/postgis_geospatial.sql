-- supabase/postgis_geospatial.sql
-- P0.3: Consultas geoespaciales eficientes con PostGIS
-- Ejecutar en Supabase SQL Editor

-- 1) Verificar que PostGIS está habilitado (Supabase lo incluye por defecto)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2) Agregar columna geográfica a businesses
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS geog geography(Point, 4326);

-- 3) Crear índice GIST para búsquedas rápidas
CREATE INDEX IF NOT EXISTS businesses_geog_gix 
ON businesses USING gist (geog);

-- 4) Trigger para mantener geog sincronizado con lat/lng
CREATE OR REPLACE FUNCTION update_business_geog()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geog := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS businesses_geog_trigger ON businesses;
CREATE TRIGGER businesses_geog_trigger
BEFORE INSERT OR UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION update_business_geog();

-- 5) Actualizar registros existentes
UPDATE businesses 
SET geog = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND geog IS NULL;

-- 6) Función para buscar negocios en un bounding box (rápido)
CREATE OR REPLACE FUNCTION public.get_businesses_in_bounds(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  lim integer default 200
)
RETURNS SETOF businesses
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM businesses
  WHERE geog IS NOT NULL
    AND ST_Intersects(
      geog::geometry,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
    AND status = 'approved'
    AND is_visible = true
  ORDER BY id
  LIMIT lim;
$$;

-- 7) Función para buscar negocios cerca de un punto (radio en km)
CREATE OR REPLACE FUNCTION public.get_businesses_nearby(
  user_lng double precision,
  user_lat double precision,
  radius_km double precision default 5,
  lim integer default 100
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  address text,
  latitude numeric,
  longitude numeric,
  phone text,
  is_featured boolean,
  owner_id uuid,
  updated_at timestamptz,
  distance_km double precision
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    b.id,
    b.name,
    b.category,
    b.address,
    b.latitude,
    b.longitude,
    b.phone,
    b.is_featured,
    b.owner_id,
    b.updated_at,
    ST_Distance(
      b.geog,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 as distance_km
  FROM businesses b
  WHERE b.geog IS NOT NULL
    AND b.status = 'approved'
    AND (b.is_visible IS NULL OR b.is_visible = true)
    AND ST_DWithin(
      b.geog,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000  -- Convertir km a metros
    )
  ORDER BY distance_km
  LIMIT lim;
$$;

-- 8) Función auxiliar: calcular distancia entre 2 puntos
CREATE OR REPLACE FUNCTION public.haversine_distance(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
RETURNS double precision
LANGUAGE sql IMMUTABLE
AS $$
  SELECT ST_Distance(
    ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
  ) / 1000;  -- Retorna en km
$$;

COMMENT ON FUNCTION get_businesses_in_bounds IS 'Obtener negocios dentro de un bounding box (para mapa)';
COMMENT ON FUNCTION get_businesses_nearby IS 'Obtener negocios cercanos a un punto con distancia';
COMMENT ON FUNCTION haversine_distance IS 'Calcular distancia en km entre 2 coordenadas';
