-- ===========================================
-- AGREGAR COLUMNAS subcategory y tags A businesses
-- Ejecutar en Supabase SQL Editor
-- ===========================================

-- 1. Agregar columna subcategory (texto)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- 2. Agregar columna tags (array de texto para características)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 3. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_subcategory ON businesses(subcategory);
CREATE INDEX IF NOT EXISTS idx_businesses_tags ON businesses USING GIN(tags);

-- 4. Comentarios para documentar
COMMENT ON COLUMN businesses.subcategory IS 'Subcategoría del negocio, ej: Taller Mecánico, Vulcanizadora, etc.';
COMMENT ON COLUMN businesses.tags IS 'Array de características: pet_friendly, 24_hours, accepts_card, delivery, wifi, accessible, parking, factura';

-- ===========================================
-- VERIFICAR QUE SE CREARON CORRECTAMENTE
-- ===========================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'businesses' 
AND column_name IN ('category', 'subcategory', 'tags');

-- ===========================================
-- EJEMPLO: Actualizar un negocio de prueba
-- ===========================================
-- UPDATE businesses 
-- SET subcategory = 'Taller Mecánico',
--     tags = ARRAY['24_hours', 'accepts_card', 'parking']
-- WHERE id = 'TU_ID_AQUI';
