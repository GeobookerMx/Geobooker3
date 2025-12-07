-- ==========================================================
-- EXPANSIÓN GEOGRÁFICA COMPLETA
-- ==========================================================
-- América Latina + Top 10 Europa + Canadá + Todos los Estados de USA
-- Ejecuta este script DESPUÉS de geographic_segmentation.sql

-- ==========================================================
-- 1. AMÉRICA LATINA (19 países)
-- ==========================================================

-- MÉXICO - LOS 32 ESTADOS COMPLETOS
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  -- Ya existentes del script base (mantener por si acaso)
  ('MX', 'CMX', 'Ciudad de México', 'Mexico City'),
  ('MX', 'JAL', 'Jalisco', 'Jalisco'),
  ('MX', 'NL', 'Nuevo León', 'Nuevo Leon'),
  ('MX', 'QRO', 'Querétaro', 'Queretaro'),
  ('MX', 'GTO', 'Guanajuato', 'Guanajuato'),
  ('MX', 'PUE', 'Puebla', 'Puebla'),
  ('MX', 'YUC', 'Yucatán', 'Yucatan'),
  ('MX', 'QR', 'Quintana Roo', 'Quintana Roo'),
  ('MX', 'BCN', 'Baja California', 'Baja California'),
  ('MX', 'CHI', 'Chihuahua', 'Chihuahua'),
  
  -- Estados adicionales (completar los 32)
  ('MX', 'AGS', 'Aguascalientes', 'Aguascalientes'),
  ('MX', 'BCS', 'Baja California Sur', 'Baja California Sur'),
  ('MX', 'CAM', 'Campeche', 'Campeche'),
  ('MX', 'CHP', 'Chiapas', 'Chiapas'),
  ('MX', 'COA', 'Coahuila', 'Coahuila'),
  ('MX', 'COL', 'Colima', 'Colima'),
  ('MX', 'DUR', 'Durango', 'Durango'),
  ('MX', 'MEX', 'Estado de México', 'State of Mexico'),
  ('MX', 'GRO', 'Guerrero', 'Guerrero'),
  ('MX', 'HGO', 'Hidalgo', 'Hidalgo'),
  ('MX', 'MIC', 'Michoacán', 'Michoacan'),
  ('MX', 'MOR', 'Morelos', 'Morelos'),
  ('MX', 'NAY', 'Nayarit', 'Nayarit'),
  ('MX', 'OAX', 'Oaxaca', 'Oaxaca'),
  ('MX', 'SIN', 'Sinaloa', 'Sinaloa'),
  ('MX', 'SLP', 'San Luis Potosí', 'San Luis Potosi'),
  ('MX', 'SON', 'Sonora', 'Sonora'),
  ('MX', 'TAB', 'Tabasco', 'Tabasco'),
  ('MX', 'TAM', 'Tamaulipas', 'Tamaulipas'),
  ('MX', 'TLX', 'Tlaxcala', 'Tlaxcala'),
  ('MX', 'VER', 'Veracruz', 'Veracruz'),
  ('MX', 'ZAC', 'Zacatecas', 'Zacatecas')
ON CONFLICT (country_code, code) DO NOTHING;

-- Ciudades adicionales de México (complementando las existentes)
WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'MX')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'MX', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  -- Ciudades ya incluidas en script base
  (CASE WHEN r.code = 'CMX' THEN 'Ciudad de México' END, 'Mexico City', 9200000),
  (CASE WHEN r.code = 'CMX' THEN 'Coyoacán' END, 'Coyoacan', 600000),
  (CASE WHEN r.code = 'CMX' THEN 'Polanco' END, 'Polanco', 400000),
  (CASE WHEN r.code = 'JAL' THEN 'Guadalajara' END, 'Guadalajara', 1500000),
  (CASE WHEN r.code = 'JAL' THEN 'Zapopan' END, 'Zapopan', 1400000),
  (CASE WHEN r.code = 'JAL' THEN 'Puerto Vallarta' END, 'Puerto Vallarta', 290000),
  (CASE WHEN r.code = 'NL' THEN 'Monterrey' END, 'Monterrey', 1140000),
  (CASE WHEN r.code = 'NL' THEN 'San Pedro Garza García' END, 'San Pedro Garza Garcia', 130000),
  (CASE WHEN r.code = 'QRO' THEN 'Querétaro' END, 'Queretaro', 960000),
  (CASE WHEN r.code = 'QR' THEN 'Cancún' END, 'Cancun', 900000),
  (CASE WHEN r.code = 'QR' THEN 'Playa del Carmen' END, 'Playa del Carmen', 300000),
  (CASE WHEN r.code = 'QR' THEN 'Tulum' END, 'Tulum', 50000),
  
  -- Ciudades adicionales de otros estados
  (CASE WHEN r.code = 'MEX' THEN 'Toluca' END, 'Toluca', 870000),
  (CASE WHEN r.code = 'MEX' THEN 'Ecatepec' END, 'Ecatepec', 1600000),
  (CASE WHEN r.code = 'PUE' THEN 'Puebla' END, 'Puebla', 1600000),
  (CASE WHEN r.code = 'GTO' THEN 'León' END, 'Leon', 1600000),
  (CASE WHEN r.code = 'YUC' THEN 'Mérida' END, 'Merida', 900000),
  (CASE WHEN r.code = 'CHI' THEN 'Chihuahua' END, 'Chihuahua', 880000),
  (CASE WHEN r.code = 'CHI' THEN 'Ciudad Juárez' END, 'Ciudad Juarez', 1500000),
  (CASE WHEN r.code = 'BCN' THEN 'Tijuana' END, 'Tijuana', 1800000),
  (CASE WHEN r.code = 'BCN' THEN 'Mexicali' END, 'Mexicali', 990000),
  (CASE WHEN r.code = 'SIN' THEN 'Culiacán' END, 'Culiacan', 900000),
  (CASE WHEN r.code = 'SON' THEN 'Hermosillo' END, 'Hermosillo', 900000),
  (CASE WHEN r.code = 'TAM' THEN 'Reynosa' END, 'Reynosa', 700000),
  (CASE WHEN r.code = 'VER' THEN 'Veracruz' END, 'Veracruz', 607000),
  (CASE WHEN r.code = 'OAX' THEN 'Oaxaca' END, 'Oaxaca', 265000),
  (CASE WHEN r.code = 'MIC' THEN 'Morelia' END, 'Morelia', 785000),
  (CASE WHEN r.code = 'AGS' THEN 'Aguascalientes' END, 'Aguascalientes', 950000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL
ON CONFLICT DO NOTHING;


-- ARGENTINA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('AR', 'BA', 'Buenos Aires', 'Buenos Aires'),
  ('AR', 'CBA', 'Córdoba', 'Cordoba'),
  ('AR', 'SF', 'Santa Fe', 'Santa Fe'),
  ('AR', 'MZA', 'Mendoza', 'Mendoza'),
  ('AR', 'TUC', 'Tucumán', 'Tucuman')
ON CONFLICT (country_code, code) DO NOTHING;


WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'AR')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'AR', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'BA' THEN 'Buenos Aires' END, 'Buenos Aires', 3000000),
  (CASE WHEN r.code = 'BA' THEN 'La Plata' END, 'La Plata', 750000),
  (CASE WHEN r.code = 'CBA' THEN 'Córdoba' END, 'Cordoba', 1400000),
  (CASE WHEN r.code = 'SF' THEN 'Rosario' END, 'Rosario', 1200000),
  (CASE WHEN r.code = 'MZA' THEN 'Mendoza' END, 'Mendoza', 115000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- COLOMBIA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('CO', 'DC', 'Bogotá D.C.', 'Bogota'),
  ('CO', 'ANT', 'Antioquia', 'Antioquia'),
  ('CO', 'VAC', 'Valle del Cauca', 'Valle del Cauca'),
  ('CO', 'ATL', 'Atlántico', 'Atlantico'),
  ('CO', 'SAN', 'Santander', 'Santander')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'CO')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'CO', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'DC' THEN 'Bogotá' END, 'Bogota', 7400000),
  (CASE WHEN r.code = 'ANT' THEN 'Medellín' END, 'Medellin', 2500000),
  (CASE WHEN r.code = 'VAC' THEN 'Cali' END, 'Cali', 2200000),
  (CASE WHEN r.code = 'ATL' THEN 'Barranquilla' END, 'Barranquilla', 1200000),
  (CASE WHEN r.code = 'SAN' THEN 'Bucaramanga' END, 'Bucaramanga', 530000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- CHILE
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('CL', 'RM', 'Región Metropolitana', 'Metropolitan Region'),
  ('CL', 'VS', 'Valparaíso', 'Valparaiso'),
  ('CL', 'BI', 'Biobío', 'Biobio'),
  ('CL', 'AR', 'Araucanía', 'Araucania')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'CL')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'CL', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'RM' THEN 'Santiago' END, 'Santiago', 6200000),
  (CASE WHEN r.code = 'VS' THEN 'Valparaíso' END, 'Valparaiso', 900000),
  (CASE WHEN r.code = 'BI' THEN 'Concepción' END, 'Concepcion', 220000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- PERÚ
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('PE', 'LIM', 'Lima', 'Lima'),
  ('PE', 'CUS', 'Cusco', 'Cusco'),
  ('PE', 'ARE', 'Arequipa', 'Arequipa'),
  ('PE', 'LAL', 'La Libertad', 'La Libertad')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'PE')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'PE', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'LIM' THEN 'Lima' END, 'Lima', 9700000),
  (CASE WHEN r.code = 'CUS' THEN 'Cusco' END, 'Cusco', 430000),
  (CASE WHEN r.code = 'ARE' THEN 'Arequipa' END, 'Arequipa', 870000),
  (CASE WHEN r.code = 'LAL' THEN 'Trujillo' END, 'Trujillo', 800000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- ECUADOR
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('EC', 'P', 'Pichincha', 'Pichincha'),
  ('EC', 'G', 'Guayas', 'Guayas'),
  ('EC', 'A', 'Azuay', 'Azuay')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'EC')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'EC', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'P' THEN 'Quito' END, 'Quito', 2000000),
  (CASE WHEN r.code = 'G' THEN 'Guayaquil' END, 'Guayaquil', 2700000),
  (CASE WHEN r.code = 'A' THEN 'Cuenca' END, 'Cuenca', 330000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- VENEZUELA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('VE', 'DC', 'Distrito Capital', 'Capital District'),
  ('VE', 'MI', 'Miranda', 'Miranda'),
  ('VE', 'ZU', 'Zulia', 'Zulia'),
  ('VE', 'CA', 'Carabobo', 'Carabobo')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'VE')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'VE', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'DC' THEN 'Caracas' END, 'Caracas', 3000000),
  (CASE WHEN r.code = 'ZU' THEN 'Maracaibo' END, 'Maracaibo', 2100000),
  (CASE WHEN r.code = 'CA' THEN 'Valencia' END, 'Valencia', 1400000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- BOLIVIA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('BO', 'LP', 'La Paz', 'La Paz'),
  ('BO', 'SC', 'Santa Cruz', 'Santa Cruz'),
  ('BO', 'CB', 'Cochabamba', 'Cochabamba')
ON CONFLICT (country_code, code) DO NOTHING;

-- PARAGUAY
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('PY', 'ASU', 'Asunción', 'Asuncion'),
  ('PY', 'CE', 'Central', 'Central'),
  ('PY', 'AA', 'Alto Paraná', 'Alto Parana')
ON CONFLICT (country_code, code) DO NOTHING;

-- URUGUAY
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('UY', 'MO', 'Montevideo', 'Montevideo'),
  ('UY', 'CA', 'Canelones', 'Canelones'),
  ('UY', 'MA', 'Maldonado', 'Maldonado')
ON CONFLICT (country_code, code) DO NOTHING;

-- BRASIL
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('BR', 'SP', 'São Paulo', 'Sao Paulo'),
  ('BR', 'RJ', 'Rio de Janeiro', 'Rio de Janeiro'),
  ('BR', 'MG', 'Minas Gerais', 'Minas Gerais'),
  ('BR', 'BA', 'Bahia', 'Bahia'),
  ('BR', 'PR', 'Paraná', 'Parana'),
  ('BR', 'RS', 'Rio Grande do Sul', 'Rio Grande do Sul')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'BR')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'BR', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'SP' THEN 'São Paulo' END, 'Sao Paulo', 12300000),
  (CASE WHEN r.code = 'RJ' THEN 'Rio de Janeiro' END, 'Rio de Janeiro', 6700000),
  (CASE WHEN r.code = 'MG' THEN 'Belo Horizonte' END, 'Belo Horizonte', 2500000),
  (CASE WHEN r.code = 'BA' THEN 'Salvador' END, 'Salvador', 2900000),
  (CASE WHEN r.code = 'PR' THEN 'Curitiba' END, 'Curitiba', 1900000),
  (CASE WHEN r.code = 'RS' THEN 'Porto Alegre' END, 'Porto Alegre', 1500000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- CENTROAMÉRICA

-- COSTA RICA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('CR', 'SJ', 'San José', 'San Jose'),
  ('CR', 'AL', 'Alajuela', 'Alajuela'),
  ('CR', 'GU', 'Guanacaste', 'Guanacaste')
ON CONFLICT (country_code, code) DO NOTHING;

-- PANAMÁ
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('PA', 'PAN', 'Panamá', 'Panama'),
  ('PA', 'CHI', 'Chiriquí', 'Chiriqui'),
  ('PA', 'COL', 'Colón', 'Colon')
ON CONFLICT (country_code, code) DO NOTHING;

-- GUATEMALA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('GT', 'GU', 'Guatemala', 'Guatemala'),
  ('GT', 'SA', 'Sacatepéquez', 'Sacatepequez'),
  ('GT', 'QZ', 'Quetzaltenango', 'Quetzaltenango')
ON CONFLICT (country_code, code) DO NOTHING;

-- EL SALVADOR
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('SV', 'SS', 'San Salvador', 'San Salvador'),
  ('SV', 'LA', 'La Libertad', 'La Libertad'),
  ('SV', 'SA', 'Santa Ana', 'Santa Ana')
ON CONFLICT (country_code, code) DO NOTHING;

-- HONDURAS
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('HN', 'FM', 'Francisco Morazán', 'Francisco Morazan'),
  ('HN', 'CR', 'Cortés', 'Cortes'),
  ('HN', 'AT', 'Atlántida', 'Atlantida')
ON CONFLICT (country_code, code) DO NOTHING;

-- NICARAGUA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('NI', 'MN', 'Managua', 'Managua'),
  ('NI', 'LE', 'León', 'Leon'),
  ('NI', 'GR', 'Granada', 'Granada')
ON CONFLICT (country_code, code) DO NOTHING;

-- REPÚBLICA DOMINICANA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('DO', 'DN', 'Distrito Nacional', 'National District'),
  ('DO', 'SD', 'Santiago', 'Santiago'),
  ('DO', 'LP', 'La Altagracia', 'La Altagracia')
ON CONFLICT (country_code, code) DO NOTHING;

-- PUERTO RICO (Territorio USA)
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('PR', 'SJ', 'San Juan', 'San Juan'),
  ('PR', 'BAY', 'Bayamón', 'Bayamon'),
  ('PR', 'PON', 'Ponce', 'Ponce')
ON CONFLICT (country_code, code) DO NOTHING;

-- CUBA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('CU', 'HAB', 'La Habana', 'Havana'),
  ('CU', 'SCU', 'Santiago de Cuba', 'Santiago de Cuba'),
  ('CU', 'CAM', 'Camagüey', 'Camaguey')
ON CONFLICT (country_code, code) DO NOTHING;

-- ==========================================================
-- 2. TOP 10 ECONOMÍAS DE EUROPA
-- ==========================================================

-- ALEMANIA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('DE', 'BE', 'Berlín', 'Berlin'),
  ('DE', 'BY', 'Baviera', 'Bavaria'),
  ('DE', 'HE', 'Hesse', 'Hesse'),
  ('DE', 'NW', 'Renania del Norte-Westfalia', 'North Rhine-Westphalia'),
  ('DE', 'HH', 'Hamburgo', 'Hamburg')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'DE')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'DE', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'BE' THEN 'Berlín' END, 'Berlin', 3700000),
  (CASE WHEN r.code = 'BY' THEN 'Múnich' END, 'Munich', 1500000),
  (CASE WHEN r.code = 'HE' THEN 'Fráncfort' END, 'Frankfurt', 750000),
  (CASE WHEN r.code = 'NW' THEN 'Colonia' END, 'Cologne', 1100000),
  (CASE WHEN r.code = 'HH' THEN 'Hamburgo' END, 'Hamburg', 1800000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- FRANCIA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('FR', 'IDF', 'Île-de-France', 'Ile-de-France'),
  ('FR', 'ARA', 'Auvernia-Ródano-Alpes', 'Auvergne-Rhone-Alpes'),
  ('FR', 'PAC', 'Provenza-Alpes-Costa Azul', 'Provence-Alpes-Cote d Azur'),
  ('FR', 'OCC', 'Occitania', 'Occitanie'),
  ('FR', 'BRE', 'Bretaña', 'Brittany')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'FR')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'FR', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'IDF' THEN 'París' END, 'Paris', 2200000),
  (CASE WHEN r.code = 'ARA' THEN 'Lyon' END, 'Lyon', 520000),
  (CASE WHEN r.code = 'PAC' THEN 'Marsella' END, 'Marseille', 870000),
  (CASE WHEN r.code = 'OCC' THEN 'Toulouse' END, 'Toulouse', 480000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- ITALIA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('IT', 'LAZ', 'Lacio', 'Lazio'),
  ('IT', 'LOM', 'Lombardía', 'Lombardy'),
  ('IT', 'CAM', 'Campania', 'Campania'),
  ('IT', 'SIC', 'Sicilia', 'Sicily'),
  ('IT', 'TOS', 'Toscana', 'Tuscany')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'IT')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'IT', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'LAZ' THEN 'Roma' END, 'Rome', 2800000),
  (CASE WHEN r.code = 'LOM' THEN 'Milán' END, 'Milan', 1400000),
  (CASE WHEN r.code = 'CAM' THEN 'Nápoles' END, 'Naples', 960000),
  (CASE WHEN r.code = 'TOS' THEN 'Florencia' END, 'Florence', 380000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- REINO UNIDO
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('GB', 'ENG', 'Inglaterra', 'England'),
  ('GB', 'SCT', 'Escocia', 'Scotland'),
  ('GB', 'WLS', 'Gales', 'Wales'),
  ('GB', 'NIR', 'Irlanda del Norte', 'Northern Ireland')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'GB')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'GB', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'ENG' THEN 'Londres' END, 'London', 9000000),
  (CASE WHEN r.code = 'ENG' THEN 'Birmingham' END, 'Birmingham', 1100000),
  (CASE WHEN r.code = 'ENG' THEN 'Manchester' END, 'Manchester', 550000),
  (CASE WHEN r.code = 'SCT' THEN 'Edimburgo' END, 'Edinburgh', 530000),
  (CASE WHEN r.code = 'SCT' THEN 'Glasgow' END, 'Glasgow', 630000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- PAÍSES BAJOS
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('NL', 'NH', 'Holanda Septentrional', 'North Holland'),
  ('NL', 'ZH', 'Holanda Meridional', 'South Holland'),
  ('NL', 'UT', 'Utrecht', 'Utrecht'),
  ('NL', 'NB', 'Brabante Septentrional', 'North Brabant')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'NL')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'NL', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'NH' THEN 'Ámsterdam' END, 'Amsterdam', 870000),
  (CASE WHEN r.code = 'ZH' THEN 'La Haya' END, 'The Hague', 550000),
  (CASE WHEN r.code = 'ZH' THEN 'Róterdam' END, 'Rotterdam', 650000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- SUIZA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('CH', 'ZH', 'Zúrich', 'Zurich'),
  ('CH', 'GE', 'Ginebra', 'Geneva'),
  ('CH', 'BE', 'Berna', 'Bern'),
  ('CH', 'VD', 'Vaud', 'Vaud')
ON CONFLICT (country_code, code) DO NOTHING;

-- POLONIA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('PL', 'MZ', 'Mazovia', 'Mazovia'),
  ('PL', 'SL', 'Silesia', 'Silesia'),
  ('PL', 'WP', 'Gran Polonia', 'Greater Poland')
ON CONFLICT (country_code, code) DO NOTHING;

-- BÉLGICA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('BE', 'BRU', 'Bruselas', 'Brussels'),
  ('BE', 'VLG', 'Flandes', 'Flanders'),
  ('BE', 'WAL', 'Valonia', 'Wallonia')
ON CONFLICT (country_code, code) DO NOTHING;

-- AUSTRIA
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('AT', 'VIE', 'Viena', 'Vienna'),
  ('AT', 'TYR', 'Tirol', 'Tyrol'),
  ('AT', 'STY', 'Estiria', 'Styria')
ON CONFLICT (country_code, code) DO NOTHING;

-- PORTUGAL (ya incluido en España en script anterior, pero agregando más regiones)
INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('PT', 'LIS', 'Lisboa', 'Lisbon'),
  ('PT', 'OPO', 'Oporto', 'Porto'),
  ('PT', 'ALG', 'Algarve', 'Algarve')
ON CONFLICT (country_code, code) DO NOTHING;

-- ==========================================================
-- 3. CANADÁ (13 provincias y territorios)
-- ==========================================================

INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('CA', 'ON', 'Ontario', 'Ontario'),
  ('CA', 'QC', 'Quebec', 'Quebec'),
  ('CA', 'BC', 'Columbia Británica', 'British Columbia'),
  ('CA', 'AB', 'Alberta', 'Alberta'),
  ('CA', 'MB', 'Manitoba', 'Manitoba'),
  ('CA', 'SK', 'Saskatchewan', 'Saskatchewan'),
  ('CA', 'NS', 'Nueva Escocia', 'Nova Scotia'),
  ('CA', 'NB', 'Nuevo Brunswick', 'New Brunswick'),
  ('CA', 'NL', 'Terranova y Labrador', 'Newfoundland and Labrador'),
  ('CA', 'PE', 'Isla del Príncipe Eduardo', 'Prince Edward Island'),
  ('CA', 'YT', 'Yukón', 'Yukon'),
  ('CA', 'NT', 'Territorios del Noroeste', 'Northwest Territories'),
  ('CA', 'NU', 'Nunavut', 'Nunavut')
ON CONFLICT (country_code, code) DO NOTHING;

WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'CA')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'CA', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'ON' THEN 'Toronto' END, 'Toronto', 2900000),
  (CASE WHEN r.code = 'ON' THEN 'Ottawa' END, 'Ottawa', 1000000),
  (CASE WHEN r.code = 'QC' THEN 'Montreal' END, 'Montreal', 1800000),
  (CASE WHEN r.code = 'QC' THEN 'Quebec City' END, 'Quebec City', 550000),
  (CASE WHEN r.code = 'BC' THEN 'Vancouver' END, 'Vancouver', 680000),
  (CASE WHEN r.code = 'AB' THEN 'Calgary' END, 'Calgary', 1300000),
  (CASE WHEN r.code = 'AB' THEN 'Edmonton' END, 'Edmonton', 980000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- ==========================================================
-- 4. TODOS LOS ESTADOS DE USA (43 estados adicionales)
-- ==========================================================

-- Ya existen: CA, TX, FL, NY, IL, AZ, NV
-- Agregando los 43 restantes:

INSERT INTO geographic_regions (country_code, code, name, name_en) VALUES
  ('US', 'AL', 'Alabama', 'Alabama'),
  ('US', 'AK', 'Alaska', 'Alaska'),
  ('US', 'AR', 'Arkansas', 'Arkansas'),
  ('US', 'CO', 'Colorado', 'Colorado'),
  ('US', 'CT', 'Connecticut', 'Connecticut'),
  ('US', 'DE', 'Delaware', 'Delaware'),
  ('US', 'GA', 'Georgia', 'Georgia'),
  ('US', 'HI', 'Hawái', 'Hawaii'),
  ('US', 'ID', 'Idaho', 'Idaho'),
  ('US', 'IN', 'Indiana', 'Indiana'),
  ('US', 'IA', 'Iowa', 'Iowa'),
  ('US', 'KS', 'Kansas', 'Kansas'),
  ('US', 'KY', 'Kentucky', 'Kentucky'),
  ('US', 'LA', 'Luisiana', 'Louisiana'),
  ('US', 'ME', 'Maine', 'Maine'),
  ('US', 'MD', 'Maryland', 'Maryland'),
  ('US', 'MA', 'Massachusetts', 'Massachusetts'),
  ('US', 'MI', 'Míchigan', 'Michigan'),
  ('US', 'MN', 'Minnesota', 'Minnesota'),
  ('US', 'MS', 'Misisipi', 'Mississippi'),
  ('US', 'MO', 'Misuri', 'Missouri'),
  ('US', 'MT', 'Montana', 'Montana'),
  ('US', 'NE', 'Nebraska', 'Nebraska'),
  ('US', 'NH', 'Nuevo Hampshire', 'New Hampshire'),
  ('US', 'NJ', 'Nueva Jersey', 'New Jersey'),
  ('US', 'NM', 'Nuevo México', 'New Mexico'),
  ('US', 'NC', 'Carolina del Norte', 'North Carolina'),
  ('US', 'ND', 'Dakota del Norte', 'North Dakota'),
  ('US', 'OH', 'Ohio', 'Ohio'),
  ('US', 'OK', 'Oklahoma', 'Oklahoma'),
  ('US', 'OR', 'Oregón', 'Oregon'),
  ('US', 'PA', 'Pensilvania', 'Pennsylvania'),
  ('US', 'RI', 'Rhode Island', 'Rhode Island'),
  ('US', 'SC', 'Carolina del Sur', 'South Carolina'),
  ('US', 'SD', 'Dakota del Sur', 'South Dakota'),
  ('US', 'TN', 'Tennessee', 'Tennessee'),
  ('US', 'UT', 'Utah', 'Utah'),
  ('US', 'VT', 'Vermont', 'Vermont'),
  ('US', 'VA', 'Virginia', 'Virginia'),
  ('US', 'WA', 'Washington', 'Washington'),
  ('US', 'WV', 'Virginia Occidental', 'West Virginia'),
  ('US', 'WI', 'Wisconsin', 'Wisconsin'),
  ('US', 'WY', 'Wyoming', 'Wyoming')
ON CONFLICT (country_code, code) DO NOTHING;

-- Ciudades principales de estados adicionales de USA
WITH regions AS (SELECT id, code FROM geographic_regions WHERE country_code = 'US')
INSERT INTO geographic_cities (region_id, country_code, name, name_en, population)
SELECT r.id, 'US', c.name, c.name_en, c.population
FROM regions r
CROSS JOIN LATERAL (VALUES 
  (CASE WHEN r.code = 'GA' THEN 'Atlanta' END, 'Atlanta', 500000),
  (CASE WHEN r.code = 'WA' THEN 'Seattle' END, 'Seattle', 750000),
  (CASE WHEN r.code = 'MA' THEN 'Boston' END, 'Boston', 690000),
  (CASE WHEN r.code = 'CO' THEN 'Denver' END, 'Denver', 710000),
  (CASE WHEN r.code = 'PA' THEN 'Filadelfia' END, 'Philadelphia', 1600000),
  (CASE WHEN r.code = 'OR' THEN 'Portland' END, 'Portland', 650000),
  (CASE WHEN r.code = 'MI' THEN 'Detroit' END, 'Detroit', 670000),
  (CASE WHEN r.code = 'TN' THEN 'Nashville' END, 'Nashville', 690000),
  (CASE WHEN r.code = 'NC' THEN 'Charlotte' END, 'Charlotte', 880000),
  (CASE WHEN r.code = 'OH' THEN 'Columbus' END, 'Columbus', 900000)
) AS c(name, name_en, population) WHERE c.name IS NOT NULL;

-- ==========================================================
-- VERIFICACIÓN FINAL
-- ==========================================================

SELECT 
  '=== RESUMEN POR REGIÓN ===' as titulo,
  'América Latina' as region,
  COUNT(DISTINCT r.country_code) as paises,
  COUNT(DISTINCT r.id) as regiones,
  COUNT(c.id) as ciudades
FROM geographic_regions r
LEFT JOIN geographic_cities c ON r.id = c.region_id
WHERE r.country_code IN ('MX','AR','CO','CL','PE','EC','VE','BO','PY','UY','BR','CR','PA','GT','SV','HN','NI','DO','PR','CU')
UNION ALL
SELECT 
  '=== RESUMEN POR REGIÓN ===' as titulo,
  'Europa (Top 10)' as region,
  COUNT(DISTINCT r.country_code) as paises,
  COUNT(DISTINCT r.id) as regiones,
  COUNT(c.id) as ciudades
FROM geographic_regions r
LEFT JOIN geographic_cities c ON r.id = c.region_id
WHERE r.country_code IN ('ES','DE','FR','IT','GB','NL','CH','PL','BE','AT','PT')
UNION ALL
SELECT 
  '=== RESUMEN POR REGIÓN ===' as titulo,
  'Norteamérica' as region,
  COUNT(DISTINCT r.country_code) as paises,
  COUNT(DISTINCT r.id) as regiones,
  COUNT(c.id) as ciudades
FROM geographic_regions r
LEFT JOIN geographic_cities c ON r.id = c.region_id
WHERE r.country_code IN ('US','CA','MX')
ORDER BY region;
