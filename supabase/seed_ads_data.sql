-- ==========================================================
-- SEED DATA: DATOS DE PRUEBA PARA ANUNCIOS
-- Ejecuta esto en Supabase SQL Editor para ver los anuncios
-- ==========================================================

-- 1. Asegurar que existen los espacios publicitarios básicos
INSERT INTO ad_spaces (name, display_name, type, position, size_desktop, size_mobile, price_monthly, max_slots)
VALUES 
  ('hero_banner', 'Banner Principal', '1ra_plana', 'top', '728x90', '320x100', 1500.00, 5),
  ('featured_carousel', 'Carrusel Destacado', '1ra_plana', 'middle', '280x200', '280x200', 800.00, 10),
  ('sponsored_result', 'Resultados Patrocinados', '1ra_plana', 'list', '100%', '100%', 1.50, 3), -- CPC
  ('bottom_banner', 'Banner Inferior Sticky', '2da_plana', 'bottom', '728x90', '320x50', 1000.00, 1),
  ('interstitial', 'Pantalla Completa', 'interstitial', 'fullscreen', '800x600', 'fullscreen', 5000.00, 1)
ON CONFLICT (name) DO NOTHING;

-- 2. Insertar Campañas de Prueba (Activas Hoy)

-- CAMPAÑA 1: Hero Banner (Cafetería)
WITH space_hero AS (SELECT id FROM ad_spaces WHERE name = 'hero_banner' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, target_location, budget, audience_targeting)
VALUES (
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
);

-- CAMPAÑA 2: Carrusel (Restaurante Italiano)
WITH space_carousel AS (SELECT id FROM ad_spaces WHERE name = 'featured_carousel' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, budget)
VALUES (
  (SELECT id FROM space_carousel),
  'La Trattoria',
  'demo@trattoria.com',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'active',
  'global',
  2000.00
);

-- CAMPAÑA 3: Sticky Footer (Promoción App)
WITH space_sticky AS (SELECT id FROM ad_spaces WHERE name = 'bottom_banner' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, budget)
VALUES (
  (SELECT id FROM space_sticky),
  'Geobooker App',
  'promo@geobooker.com',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'active',
  'global',
  10000.00
);

-- 3. Insertar Creativos (Lo que se ve)

-- Creativo para Hero Banner
INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '☕ ¡Despierta con Café Central!', 
  'El mejor café de especialidad en tu ciudad. 2x1 todas las mañanas.', 
  'Ver Promoción', 
  'https://google.com',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80'
FROM ad_campaigns WHERE advertiser_name = 'Café Central Demo';

-- Creativo para Carrusel
INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '🍕 Auténtica Pizza Italiana', 
  'Horno de leña y recetas tradicionales.', 
  'Reservar Mesa', 
  'https://google.com',
  'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80'
FROM ad_campaigns WHERE advertiser_name = 'La Trattoria';

-- Creativo para Sticky
INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '📱 Descarga nuestra App Móvil', 
  'Lleva Geobooker a todos lados. Disponible en iOS y Android.', 
  'Descargar Gratis', 
  'https://google.com',
  NULL -- Sin imagen para probar formato texto
FROM ad_campaigns WHERE advertiser_name = 'Geobooker App';
