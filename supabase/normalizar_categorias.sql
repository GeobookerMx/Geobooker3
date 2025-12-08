-- ===========================================
-- NORMALIZAR CATEGORÍAS Y SUBCATEGORÍAS
-- Ejecutar en Supabase SQL Editor
-- ===========================================

-- Primero, ver qué categorías existen actualmente
SELECT DISTINCT category, COUNT(*) as total
FROM businesses
GROUP BY category
ORDER BY total DESC;

-- ===========================================
-- PASO 1: Agregar columnas si no existen
-- ===========================================
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS subcategory TEXT;

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_subcategory ON businesses(subcategory);

-- ===========================================
-- PASO 2: MAPEO DE CATEGORÍAS
-- Ajusta según lo que tengas en tu BD
-- ===========================================

-- Restaurantes y comida
UPDATE businesses 
SET category = 'restaurantes'
WHERE LOWER(category) IN (
    'restaurante', 'restaurantes', 'comida', 'food', 'restaurant',
    'taqueria', 'tacos', 'cocina', 'loncheria', 'fonda'
);

-- Bares y cafeterías
UPDATE businesses 
SET category = 'bares'
WHERE LOWER(category) IN (
    'bar', 'bares', 'cafeteria', 'cafeterías', 'cafe', 'café',
    'cantina', 'cervecería', 'antro', 'club'
);

-- Tiendas y comercios
UPDATE businesses 
SET category = 'tiendas'
WHERE LOWER(category) IN (
    'tienda', 'tiendas', 'comercio', 'shop', 'store', 'abarrotes',
    'minisuper', 'super', 'ropa', 'boutique', 'papelería'
);

-- Servicios profesionales
UPDATE businesses 
SET category = 'servicios'
WHERE LOWER(category) IN (
    'servicio', 'servicios', 'service', 'profesional', 'consultoria',
    'abogado', 'contador', 'notaria', 'despacho'
);

-- Hogar, reparaciones y autos (NUEVA - Talleres, vulcanizadoras, etc.)
UPDATE businesses 
SET category = 'hogar_autos'
WHERE LOWER(category) IN (
    'taller', 'mecanico', 'mecánico', 'vulcanizadora', 'auto', 'autos',
    'carro', 'carros', 'reparacion', 'reparación', 'plomero', 'plomería',
    'electricista', 'cerrajero', 'carpintero', 'herrería', 'herrero',
    'lavado', 'lavado de autos', 'limpieza'
);

-- Salud y belleza
UPDATE businesses 
SET category = 'salud'
WHERE LOWER(category) IN (
    'salud', 'health', 'belleza', 'beauty', 'gimnasio', 'gym',
    'spa', 'clinica', 'clínica', 'doctor', 'dentista', 'farmacia',
    'barberia', 'barbería', 'salon', 'salón', 'estetica', 'estética'
);

-- Entretenimiento
UPDATE businesses 
SET category = 'entretenimiento'
WHERE LOWER(category) IN (
    'entretenimiento', 'entertainment', 'cine', 'teatro', 'parque',
    'boliche', 'billar', 'karaoke', 'deporte', 'deportes', 'cancha'
);

-- Educación
UPDATE businesses 
SET category = 'educacion'
WHERE LOWER(category) IN (
    'educacion', 'educación', 'education', 'escuela', 'school',
    'curso', 'cursos', 'academia', 'idiomas', 'guardería'
);

-- ===========================================
-- PASO 3: Verificar resultados
-- ===========================================
SELECT 
    category, 
    subcategory,
    COUNT(*) as total
FROM businesses
GROUP BY category, subcategory
ORDER BY category, total DESC;

-- ===========================================
-- OPCIONAL: Crear negocios de prueba
-- (Para asegurar que hay contenido en cada categoría)
-- ===========================================

-- Ejemplo: Agregar un gimnasio de prueba
-- INSERT INTO businesses (
--     name, 
--     category, 
--     subcategory, 
--     description, 
--     address, 
--     latitude, 
--     longitude, 
--     status,
--     tags
-- ) VALUES (
--     'Gimnasio Fitness Pro',
--     'salud',
--     'Gimnasios',
--     'El mejor gimnasio de la zona con equipo de última generación',
--     'Av. Insurgentes Sur 123, CDMX',
--     19.4326,
--     -99.1332,
--     'approved',
--     ARRAY['24_hours', 'parking', 'wifi']
-- );

-- ===========================================
-- LISTA DE CATEGORÍAS VÁLIDAS
-- ===========================================
-- category (ID)      |  Nombre en UI
-- -------------------|------------------
-- restaurantes       |  Restaurantes & Comida
-- bares             |  Bares y Cafeterías
-- tiendas           |  Tiendas & Comercios
-- servicios         |  Servicios Profesionales
-- hogar_autos       |  Hogar, Reparaciones & Autos
-- salud             |  Salud y Belleza
-- entretenimiento   |  Entretenimiento
-- educacion         |  Educación
