-- ====================================================================
-- SQL Script: update_ad_spaces_pricing.sql
-- Description: Recreates all rows in ad_spaces for the launch promo
--              pricing cap ($2,999 MXN max).
-- ====================================================================

-- 1. Clear existing spaces (or old configurations)
DELETE FROM ad_spaces;

-- 2. Insert new launch spaces
INSERT INTO ad_spaces (
  name, 
  display_name, 
  type, 
  position, 
  size_desktop, 
  size_mobile, 
  price_monthly, 
  max_slots, 
  is_active,
  description
) VALUES
  (
    'destacado_basico',
    'Destacado Básico',
    'local',
    'list_featured',
    'Responsive',
    'Responsive',
    199.00,
    50,
    true,
    'Mejor posición y visibilidad en su categoría de negocio local.'
  ),
  (
    'pin_patrocinado',
    'Pin Patrocinado en Mapa',
    'map',
    'map_pin',
    'pin',
    'pin',
    299.00,
    50,
    true,
    'Pin visual destacado en el mapa interactivo de Geobooker.'
  ),
  (
    'tarjeta_patrocinada',
    'Tarjeta Patrocinada Local',
    'local',
    'search_card',
    'Responsive',
    'Responsive',
    499.00,
    20,
    true,
    'Aparece en la parte superior en los resultados de búsqueda local.'
  ),
  (
    'impulso_local',
    'Impulso Local',
    'local',
    'search_boost',
    'Responsive',
    'Responsive',
    799.00,
    20,
    true,
    'Resultados prioritarios por categoría de ciudad con botón CTA directo.'
  ),
  (
    'sponsor_categoria',
    'Sponsor de Categoría',
    'premium',
    'category_sponsor',
    '728x90',
    '320x100',
    1499.00,
    5,
    true,
    'Patrocinio exclusivo de una categoría local completa en tu ciudad.'
  ),
  (
    'sponsor_ciudad',
    'Sponsor de Ciudad / Zona',
    'premium',
    'city_sponsor',
    '970x250',
    '320x100',
    2499.00,
    3,
    true,
    'Domina tu ciudad o zona con hero banner principal, pin y tarjeta patrocinada.'
  ),
  (
    'max_espacio',
    'Máximo Espacio Publicitario',
    'premium',
    'hero_space',
    '970x250',
    '320x100',
    2999.00,
    3,
    true,
    'Hero banner principal rotativo en la página principal + mapa + destacado.'
  ),
  (
    'enterprise',
    'Enterprise / Global / Multi-País',
    'enterprise',
    'custom',
    'Personalizado',
    'Personalizado',
    0.00, -- Cotización / Custom Quote
    5,
    true,
    'Campañas internacionales multi-ciudad o multi-país bajo cotización especial.'
  );

-- 3. Verify
SELECT id, name, display_name, price_monthly, max_slots, is_active FROM ad_spaces ORDER BY price_monthly ASC;
