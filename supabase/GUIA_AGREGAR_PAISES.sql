-- ==========================================================
-- GUÍA: CÓMO AGREGAR NUEVOS PAÍSES, REGIONES Y CIUDADES
-- ==========================================================

/*
ESTRUCTURA DEL SISTEMA:
- El sistema NO está limitado a ciertos países
- Puedes agregar CUALQUIER país del mundo
- Puedes agregar TODAS las regiones/estados que necesites
- Puedes agregar TODAS las ciudades que necesites

Los datos iniciales (MX, US, ES) son solo un PUNTO DE PARTIDA.
*/

-- ==========================================================
-- 1. AGREGAR UN NUEVO PAÍS
-- ==========================================================

-- Ejemplo: Agregar Colombia

-- Paso 1: Agregar Regiones/Departamentos
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('CO', 'BOG', 'Bogotá', 'Bogota'),
  ('CO', 'ANT', 'Antioquia', 'Antioquia'),
  ('CO', 'VAC', 'Valle del Cauca', 'Valle del Cauca'),
  ('CO', 'ATL', 'Atlántico', 'Atlantico')
ON CONFLICT (country_code, code) DO NOTHING;

-- Paso 2: Agregar Ciudades
WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'CO')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT 
  r.id,
  'CO',
  c.name,
  c.name_en,
  c.population
FROM regions r
CROSS JOIN LATERAL (
  VALUES 
    (CASE WHEN r.code = 'BOG' THEN 'Bogotá' END, 'Bogota', 7400000),
    (CASE WHEN r.code = 'ANT' THEN 'Medellín' END, 'Medellin', 2500000),
    (CASE WHEN r.code = 'VAC' THEN 'Cali' END, 'Cali', 2200000),
    (CASE WHEN r.code = 'ATL' THEN 'Barranquilla' END, 'Barranquilla', 1200000)
) AS c(name, name_en, population)
WHERE c.name IS NOT NULL;

-- ==========================================================
-- 2. AGREGAR MÁS REGIONES A UN PAÍS EXISTENTE
-- ==========================================================

-- Ejemplo: Agregar más estados de USA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('US', 'WA', 'Washington', 'Washington'),
  ('US', 'OR', 'Oregon', 'Oregon'),
  ('US', 'CO', 'Colorado', 'Colorado'),
  ('US', 'MA', 'Massachusetts', 'Massachusetts')
ON CONFLICT (country_code, code) DO NOTHING;

-- ==========================================================
-- 3. AGREGAR MÁS CIUDADES A UNA REGIÓN EXISTENTE
-- ==========================================================

-- Ejemplo: Agregar más ciudades de Jalisco
WITH jal_region AS (
  SELECT id FROM geographic_regions 
  WHERE country_code = 'MX' AND code = 'JAL' 
  LIMIT 1
)
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT 
  jal_region.id,
  'MX',
  name,
  name_en,
  population
FROM jal_region
CROSS JOIN (
  VALUES 
    ('Tlaquepaque', 'Tlaquepaque', 680000),
    ('Tonalá', 'Tonala', 550000),
    ('Lagos de Moreno', 'Lagos de Moreno', 170000),
    ('Tepatitlán', 'Tepatitlan', 140000)
) AS cities(name, name_en, population);

-- ==========================================================
-- 4. PLANTILLA PARA CUALQUIER PAÍS NUEVO
-- ==========================================================

/*
Para agregar un nuevo país completo, usa esta plantilla:

-- 1. Regiones
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('XX', 'REG1', 'Nombre Región 1', 'Region 1'),
  ('XX', 'REG2', 'Nombre Región 2', 'Region 2'),
  ('XX', 'REG3', 'Nombre Región 3', 'Region 3')
ON CONFLICT (country_code, code) DO NOTHING;

-- 2. Ciudades
WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'XX')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT 
  r.id,
  'XX',
  c.name,
  c.name_en,
  c.population
FROM regions r
CROSS JOIN LATERAL (
  VALUES 
    (CASE WHEN r.code = 'REG1' THEN 'Ciudad 1' END, 'City 1', 1000000),
    (CASE WHEN r.code = 'REG1' THEN 'Ciudad 2' END, 'City 2', 500000),
    (CASE WHEN r.code = 'REG2' THEN 'Ciudad 3' END, 'City 3', 750000)
) AS c(name, name_en, population)
WHERE c.name IS NOT NULL;
*/

-- ==========================================================
-- 5. VERIFICAR DATOS DE UN PAÍS ESPECÍFICO
-- ==========================================================

-- Ver todas las regiones de un país
SELECT * FROM geographic_regions 
WHERE country_code = 'MX' 
ORDER BY name;

-- Ver todas las ciudades de un país
SELECT 
  r.name as region,
  c.name as ciudad,
  c.population
FROM geographic_cities c
JOIN geographic_regions r ON c.region_id = r.id
WHERE c.country_code = 'MX'
ORDER BY r.name, c.population DESC;

-- ==========================================================
-- NOTA IMPORTANTE
-- ==========================================================
/*
El sistema está diseñado para ser GLOBAL y ESCALABLE.

Puedes agregar:
✅ Cualquier país del mundo
✅ Todas las regiones/estados necesarios
✅ Todas las ciudades necesarias
✅ Actualizar datos en cualquier momento

Los scripts iniciales solo incluyen datos de ejemplo para:
- México (10 estados, ~12 ciudades)
- USA (7 estados, ~10 ciudades)
- España (6 comunidades, ~6 ciudades)

Pero NO hay límite técnico.
*/
