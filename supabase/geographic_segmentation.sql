-- ==========================================================
-- TABLAS DE REFERENCIA GEOGRÁFICA - SIMPLIFICADO (4 NIVELES)
-- ==========================================================
-- Se implementan solo 4 niveles: GLOBAL → PAÍS → REGIÓN → CIUDAD
-- Eliminando el nivel CONTINENTAL para simplificar la UX

-- 1. Tabla de Regiones/Estados (por país)
CREATE TABLE IF NOT EXISTS geographic_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL, -- Código ISO del país (MX, US, ES, etc.)
  code TEXT NOT NULL, -- Código de región (ej. CMX, CA, MAD)
  name TEXT NOT NULL, -- Nombre completo (ej. "Ciudad de México", "California")
  name_en TEXT, -- Nombre en inglés (opcional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(country_code, code)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_geographic_regions_country 
  ON geographic_regions(country_code);

-- 2. Tabla de Ciudades (por región)
CREATE TABLE IF NOT EXISTS geographic_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES geographic_regions(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL, -- Redundante pero útil para queries rápidas
  name TEXT NOT NULL,
  name_en TEXT, -- Nombre en inglés (opcional)
  population INTEGER, -- Población (opcional, para ordenar)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_geographic_cities_region 
  ON geographic_cities(region_id);
CREATE INDEX IF NOT EXISTS idx_geographic_cities_country 
  ON geographic_cities(country_code);

-- ==========================================================
-- DATOS SEMILLA: MÉXICO
-- ==========================================================

-- Regiones de México
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('MX', 'CMX', 'Ciudad de México', 'Mexico City'),
  ('MX', 'JAL', 'Jalisco', 'Jalisco'),
  ('MX', 'NL', 'Nuevo León', 'Nuevo Leon'),
  ('MX', 'QRO', 'Querétaro', 'Queretaro'),
  ('MX', 'GTO', 'Guanajuato', 'Guanajuato'),
  ('MX', 'PUE', 'Puebla', 'Puebla'),
  ('MX', 'YUC', 'Yucatán', 'Yucatan'),
  ('MX', 'QR', 'Quintana Roo', 'Quintana Roo'),
  ('MX', 'BCN', 'Baja California', 'Baja California'),
  ('MX', 'CHI', 'Chihuahua', 'Chihuahua')
ON CONFLICT (country_code, code) DO NOTHING;

-- Ciudades de México (principales)
WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'MX')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT 
  r.id,
  'MX',
  c.name,
  c.name_en,
  c.population
FROM regions r
CROSS JOIN LATERAL (
  VALUES 
    -- Ciudad de México
    (CASE WHEN r.code = 'CMX' THEN 'Ciudad de México' END, 'Mexico City', 9200000),
    (CASE WHEN r.code = 'CMX' THEN 'Coyoacán' END, 'Coyoacan', 600000),
    (CASE WHEN r.code = 'CMX' THEN 'Polanco' END, 'Polanco', 400000),
    -- Jalisco
    (CASE WHEN r.code = 'JAL' THEN 'Guadalajara' END, 'Guadalajara', 1500000),
    (CASE WHEN r.code = 'JAL' THEN 'Zapopan' END, 'Zapopan', 1400000),
    (CASE WHEN r.code = 'JAL' THEN 'Puerto Vallarta' END, 'Puerto Vallarta', 290000),
    -- Nuevo León
    (CASE WHEN r.code = 'NL' THEN 'Monterrey' END, 'Monterrey', 1140000),
    (CASE WHEN r.code = 'NL' THEN 'San Pedro Garza García' END, 'San Pedro Garza Garcia', 130000),
    -- Querétaro
    (CASE WHEN r.code = 'QRO' THEN 'Querétaro' END, 'Queretaro', 960000),
    -- Quintana Roo
    (CASE WHEN r.code = 'QR' THEN 'Cancún' END, 'Cancun', 900000),
    (CASE WHEN r.code = 'QR' THEN 'Playa del Carmen' END, 'Playa del Carmen', 300000),
    (CASE WHEN r.code = 'QR' THEN 'Tulum' END, 'Tulum', 50000)
) AS c(name, name_en, population)
WHERE c.name IS NOT NULL
ON CONFLICT DO NOTHING;

-- ==========================================================
-- DATOS SEMILLA: ESTADOS UNIDOS
-- ==========================================================

-- Regiones de USA (estados principales)
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('US', 'CA', 'California', 'California'),
  ('US', 'TX', 'Texas', 'Texas'),
  ('US', 'FL', 'Florida', 'Florida'),
  ('US', 'NY', 'New York', 'New York'),
  ('US', 'IL', 'Illinois', 'Illinois'),
  ('US', 'AZ', 'Arizona', 'Arizona'),
  ('US', 'NV', 'Nevada', 'Nevada')
ON CONFLICT (country_code, code) DO NOTHING;

-- Ciudades de USA (principales)
WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'US')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT 
  r.id,
  'US',
  c.name,
  c.name_en,
  c.population
FROM regions r
CROSS JOIN LATERAL (
  VALUES 
    -- California
    (CASE WHEN r.code = 'CA' THEN 'Los Angeles' END, 'Los Angeles', 4000000),
    (CASE WHEN r.code = 'CA' THEN 'San Francisco' END, 'San Francisco', 880000),
    (CASE WHEN r.code = 'CA' THEN 'San Diego' END, 'San Diego', 1400000),
    -- Texas
    (CASE WHEN r.code = 'TX' THEN 'Houston' END, 'Houston', 2300000),
    (CASE WHEN r.code = 'TX' THEN 'Austin' END, 'Austin', 980000),
    (CASE WHEN r.code = 'TX' THEN 'Dallas' END, 'Dallas', 1300000),
    -- Florida
    (CASE WHEN r.code = 'FL' THEN 'Miami' END, 'Miami', 470000),
    (CASE WHEN r.code = 'FL' THEN 'Orlando' END, 'Orlando', 310000),
    -- New York
    (CASE WHEN r.code = 'NY' THEN 'New York City' END, 'New York City', 8300000),
    -- Nevada
    (CASE WHEN r.code = 'NV' THEN 'Las Vegas' END, 'Las Vegas', 650000)
) AS c(name, name_en, population)
WHERE c.name IS NOT NULL
ON CONFLICT DO NOTHING;

-- ==========================================================
-- DATOS SEMILLA: ESPAÑA
-- ==========================================================

-- Regiones de España (comunidades autónomas principales)
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('ES', 'CAT', 'Cataluña', 'Catalonia'),
  ('ES', 'MAD', 'Madrid', 'Madrid'),
  ('ES', 'AND', 'Andalucía', 'Andalusia'),
  ('ES', 'VAL', 'Valencia', 'Valencia'),
  ('ES', 'GAL', 'Galicia', 'Galicia'),
  ('ES', 'PV', 'País Vasco', 'Basque Country')
ON CONFLICT (country_code, code) DO NOTHING;

-- Ciudades de España (principales)
WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'ES')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT 
  r.id,
  'ES',
  c.name,
  c.name_en,
  c.population
FROM regions r
CROSS JOIN LATERAL (
  VALUES 
    -- Cataluña
    (CASE WHEN r.code = 'CAT' THEN 'Barcelona' END, 'Barcelona', 1620000),
    -- Madrid
    (CASE WHEN r.code = 'MAD' THEN 'Madrid' END, 'Madrid', 3200000),
    -- Andalucía
    (CASE WHEN r.code = 'AND' THEN 'Sevilla' END, 'Seville', 690000),
    (CASE WHEN r.code = 'AND' THEN 'Málaga' END, 'Malaga', 580000),
    -- Valencia
    (CASE WHEN r.code = 'VAL' THEN 'Valencia' END, 'Valencia', 800000),
    -- País Vasco
    (CASE WHEN r.code = 'PV' THEN 'Bilbao' END, 'Bilbao', 350000)
) AS c(name, name_en, population)
WHERE c.name IS NOT NULL
ON CONFLICT DO NOTHING;

-- ==========================================================
-- VERIFICACIÓN
-- ==========================================================

-- Ver resumen por país
SELECT 
  r.country_code,
  COUNT(DISTINCT r.id) as regiones,
  COUNT(c.id) as ciudades
FROM geographic_regions r
LEFT JOIN geographic_cities c ON r.id = c.region_id
GROUP BY r.country_code
ORDER BY r.country_code;

