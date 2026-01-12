-- ==========================================================
-- FIX: Agregar columna creative_url si no existe y actualizar campañas
-- Ejecuta este script en Supabase SQL Editor
-- ==========================================================

-- 1. Agregar columna creative_url si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad_campaigns' AND column_name = 'creative_url'
    ) THEN
        ALTER TABLE ad_campaigns ADD COLUMN creative_url TEXT;
    END IF;
END $$;

-- 2. Verificar qué columnas tiene la tabla
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ad_campaigns' 
ORDER BY ordinal_position;

-- 3. Actualizar las campañas existentes con URLs de imagen
UPDATE ad_campaigns SET creative_url = 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800'
WHERE advertiser_name = 'AutoSpa Puebla';

UPDATE ad_campaigns SET creative_url = 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800'
WHERE advertiser_name = 'Farmacia San José';

UPDATE ad_campaigns SET creative_url = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'
WHERE advertiser_name = 'Pizzería Bella Napoli';

UPDATE ad_campaigns SET creative_url = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800'
WHERE advertiser_name = 'Salón Glamour';

UPDATE ad_campaigns SET creative_url = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800'
WHERE advertiser_name = 'Taller Mecánico El Rápido';

UPDATE ad_campaigns SET creative_url = 'https://youtube.com/shorts/-BN3aPWT4kI'
WHERE advertiser_name = 'Geobooker';

UPDATE ad_campaigns SET creative_url = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800'
WHERE advertiser_name = 'Geobooker Premium';

-- 4. Verificar que las URLs se aplicaron
SELECT advertiser_name, creative_url, headline 
FROM ad_campaigns 
WHERE is_demo = true;
