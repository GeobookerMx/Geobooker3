-- ==========================================================
-- ADD PROMOTIONAL PRICING TO AD SPACES
-- Ejecutar en Supabase SQL Editor
-- ==========================================================

-- 1. Añadir columnas para precios promocionales
ALTER TABLE ad_spaces ADD COLUMN IF NOT EXISTS promo_price_monthly DECIMAL(10,2);
ALTER TABLE ad_spaces ADD COLUMN IF NOT EXISTS promo_label TEXT; -- Ej: "🔥 Launch Special", "50% OFF"
ALTER TABLE ad_spaces ADD COLUMN IF NOT EXISTS promo_end_date DATE;

-- 2. Configurar promociones de lanzamiento (EXAMPLE)
UPDATE ad_spaces SET 
    promo_price_monthly = price_monthly * 0.5,
    promo_label = '🚀 50% OFF Lanzamiento',
    promo_end_date = '2026-03-31'
WHERE name IN ('hero_banner', 'featured_carousel', 'bottom_banner', 'recommended_section');

-- Verification
SELECT name, display_name, price_monthly, promo_price_monthly, promo_label FROM ad_spaces;
