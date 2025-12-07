-- ==========================================================
-- VERIFICAR Y CREAR CAMPAÑAS DE PRUEBA
-- ==========================================================
-- Este script verifica si existen campañas activas y las crea si no existen

-- 1. VER SI HAY CAMPAÑAS ACTIVAS
SELECT 
  '=== CAMPAÑAS ACTIVAS ===' as titulo,
  c.id,
  c.advertiser_name,
  c.status,
  s.display_name as espacio,
  c.start_date,
  c.end_date
FROM ad_campaigns c
JOIN ad_spaces s ON c.ad_space_id = s.id
WHERE c.status = 'active'
AND c.start_date <= CURRENT_DATE
AND c.end_date >= CURRENT_DATE;

-- 2. VER SI HAY CREATIVOS
SELECT 
  '=== CREATIVOS ===' as titulo,
  cr.id,
  cr.title,
  c.advertiser_name,
  cr.image_url
FROM ad_creatives cr
JOIN ad_campaigns c ON cr.campaign_id = c.id
WHERE c.status = 'active';

-- ==========================================================
-- SI NO HAY CAMPAÑAS, EJECUTA LO SIGUIENTE:
-- ==========================================================

-- 3. CREAR CAMPAÑAS DE PRUEBA (Solo ejecutar si no existen)

-- CAMPAÑA 1: Hero Banner (Cafetería)
WITH space_hero AS (SELECT id FROM ad_spaces WHERE name = 'hero_banner' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, target_location, budget, audience_targeting)
SELECT 
  (SELECT id FROM space_hero),
  'Café Central Demo',
  'demo@cafecentral.com',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'active',
  'country',
  'Mexico',
  5000.00,
  '{"countries": ["MX"]}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM ad_campaigns WHERE advertiser_name = 'Café Central Demo'
);

-- CAMPAÑA 2: Carrusel (Restaurante Italiano)
WITH space_carousel AS (SELECT id FROM ad_spaces WHERE name = 'featured_carousel' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, budget)
SELECT
  (SELECT id FROM space_carousel),
  'La Trattoria',
  'demo@trattoria.com',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'active',
  'global',
  2000.00
WHERE NOT EXISTS (
  SELECT 1 FROM ad_campaigns WHERE advertiser_name = 'La Trattoria'
);

-- CAMPAÑA 3: Bottom Banner (Promoción App)
WITH space_sticky AS (SELECT id FROM ad_spaces WHERE name = 'bottom_banner' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, budget)
SELECT
  (SELECT id FROM space_sticky),
  'Geobooker App',
  'promo@geobooker.com',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'active',
  'global',
  10000.00
WHERE NOT EXISTS (
  SELECT 1 FROM ad_campaigns WHERE advertiser_name = 'Geobooker App'
);

-- 4. INSERTAR CREATIVOS (Lo que se ve)

-- Creativo para Hero Banner
INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '☕ ¡Despierta con Café Central!', 
  'El mejor café de especialidad en tu ciudad. 2x1 todas las mañanas.', 
  'Ver Promoción', 
  'https://google.com',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80'
FROM ad_campaigns 
WHERE advertiser_name = 'Café Central Demo'
AND NOT EXISTS (
  SELECT 1 FROM ad_creatives WHERE campaign_id = (SELECT id FROM ad_campaigns WHERE advertiser_name = 'Café Central Demo')
);

-- Creativo para Carrusel
INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '🍕 Auténtica Pizza Italiana', 
  'Horno de leña y recetas tradicionales.', 
  'Reservar Mesa', 
  'https://google.com',
  'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80'
FROM ad_campaigns 
WHERE advertiser_name = 'La Trattoria'
AND NOT EXISTS (
  SELECT 1 FROM ad_creatives WHERE campaign_id = (SELECT id FROM ad_campaigns WHERE advertiser_name = 'La Trattoria')
);

-- Creativo para Sticky
INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '📱 Descarga nuestra App Móvil', 
  'Lleva Geobooker a todos lados. Disponible en iOS y Android.', 
  'Descargar Gratis', 
  'https://google.com',
  NULL -- Sin imagen para probar formato texto
FROM ad_campaigns 
WHERE advertiser_name = 'Geobooker App'
AND NOT EXISTS (
  SELECT 1 FROM ad_creatives WHERE campaign_id = (SELECT id FROM ad_campaigns WHERE advertiser_name = 'Geobooker App')
);

-- 5. VERIFICACIÓN FINAL
SELECT 
  '=== VERIFICACIÓN FINAL ===' as titulo,
  COUNT(DISTINCT c.id) as campanas_activas,
  COUNT(DISTINCT cr.id) as creativos
FROM ad_campaigns c
LEFT JOIN ad_creatives cr ON c.id = cr.campaign_id
WHERE c.status = 'active'
AND c.start_date <= CURRENT_DATE
AND c.end_date >= CURRENT_DATE;

-- Resultado esperado: 3 campañas activas, 3 creativos
