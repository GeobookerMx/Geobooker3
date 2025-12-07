-- ==========================================================
-- CAMPAÑAS DEMO PARA TODOS LOS ESPACIOS PUBLICITARIOS
-- ==========================================================
-- Este script crea 1 campaña de ejemplo para cada uno de los 7 espacios
-- Ejecuta esto en Supabase para ver los anuncios en tu PWA

-- ==========================================================
-- 1. HERO BANNER (Banner Principal)
-- ==========================================================
WITH space_hero AS (SELECT id FROM ad_spaces WHERE name = 'hero_banner' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, budget)
SELECT 
  (SELECT id FROM space_hero),
  'Café Central',
  'demo@cafecentral.com',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'active',
  'global',
  5000.00
WHERE NOT EXISTS (
  SELECT 1 FROM ad_campaigns WHERE advertiser_name = 'Café Central'
);

INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '☕ ¡Despierta con Café Central!', 
  'El mejor café de especialidad en tu ciudad. 2x1 todas las mañanas.', 
  'Ver Promoción', 
  'https://google.com',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80'
FROM ad_campaigns 
WHERE advertiser_name = 'Café Central'
AND NOT EXISTS (
  SELECT 1 FROM ad_creatives WHERE campaign_id = (SELECT id FROM ad_campaigns WHERE advertiser_name = 'Café Central')
);

-- ==========================================================
-- 2. FEATURED CAROUSEL (Carrusel Destacado)
-- ==========================================================
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

INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '🍕 Auténtica Pizza Italiana', 
  'Horno de leña y recetas tradicionales. Reserva ahora y obtén 10% de descuento.', 
  'Reservar Mesa', 
  'https://google.com',
  'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80'
FROM ad_campaigns 
WHERE advertiser_name = 'La Trattoria'
AND NOT EXISTS (
  SELECT 1 FROM ad_creatives WHERE campaign_id = (SELECT id FROM ad_campaigns WHERE advertiser_name = 'La Trattoria')
);

-- ==========================================================
-- 3. SPONSORED RESULTS (Resultados Patrocinados)
-- ==========================================================
WITH space_sponsored AS (SELECT id FROM ad_spaces WHERE name = 'sponsored_results' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, budget)
SELECT
  (SELECT id FROM space_sponsored),
  'Farmacia 24h',
  'demo@farmacia24h.com',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'active',
  'country',
  3000.00
WHERE NOT EXISTS (
  SELECT 1 FROM ad_campaigns WHERE advertiser_name = 'Farmacia 24h'
);

INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '💊 Farmacia 24 Horas - Servicio a Domicilio', 
  'Abierto toda la noche. Entrega en 30 minutos o menos.', 
  'Ver Ubicación', 
  'https://google.com',
  'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=800&q=80'
FROM ad_campaigns 
WHERE advertiser_name = 'Farmacia 24h'
AND NOT EXISTS (
  SELECT 1 FROM ad_creatives WHERE campaign_id = (SELECT id FROM ad_campaigns WHERE advertiser_name = 'Farmacia 24h')
);

-- ==========================================================
-- 4. SPONSORED RESULTS FULLWIDTH (Resultados Patrocinados Ancho Completo)
-- ==========================================================
WITH space_fullwidth AS (SELECT id FROM ad_spaces WHERE name = 'sponsored_results_fullwidth' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, budget)
SELECT
  (SELECT id FROM space_fullwidth),
  'AutoLavado Express',
  'demo@autolavado.com',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'active',
  'global',
  1500.00
WHERE NOT EXISTS (
  SELECT 1 FROM ad_campaigns WHERE advertiser_name = 'AutoLavado Express'
);

INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '🚗 Lavado Completo $99 - AutoLavado Express', 
  'Lavado + encerado + aspirado. Sin cita previa.', 
  'Ver Promoción', 
  'https://google.com',
  'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80'
FROM ad_campaigns 
WHERE advertiser_name = 'AutoLavado Express'
AND NOT EXISTS (
  SELECT 1 FROM ad_creatives WHERE campaign_id = (SELECT id FROM ad_campaigns WHERE advertiser_name = 'AutoLavado Express')
);

-- ==========================================================
-- 5. RECOMMENDED SECTION (Recomendados para Ti)
-- ==========================================================
WITH space_recommended AS (SELECT id FROM ad_spaces WHERE name = 'recommended_section' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, budget)
SELECT
  (SELECT id FROM space_recommended),
  'Gimnasio FitLife',
  'demo@fitlife.com',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  'active',
  'global',
  1200.00
WHERE NOT EXISTS (
  SELECT 1 FROM ad_campaigns WHERE advertiser_name = 'Gimnasio FitLife'
);

INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '💪 Primer Mes Gratis - Gimnasio FitLife', 
  'Equipamiento de última generación. Clases grupales incluidas.', 
  'Ver Horarios', 
  'https://google.com',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80'
FROM ad_campaigns 
WHERE advertiser_name = 'Gimnasio FitLife'
AND NOT EXISTS (
  SELECT 1 FROM ad_creatives WHERE campaign_id = (SELECT id FROM ad_campaigns WHERE advertiser_name = 'Gimnasio FitLife')
);

-- ==========================================================
-- 6. BOTTOM BANNER (Banner Inferior Sticky)
-- ==========================================================
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

INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '📱 Descarga nuestra App Móvil', 
  'Lleva Geobooker a todos lados. Disponible en iOS y Android.', 
  'Descargar Gratis', 
  'https://google.com',
  NULL -- Sin imagen para probar formato solo texto
FROM ad_campaigns 
WHERE advertiser_name = 'Geobooker App'
AND NOT EXISTS (
  SELECT 1 FROM ad_creatives WHERE campaign_id = (SELECT id FROM ad_campaigns WHERE advertiser_name = 'Geobooker App')
);

-- ==========================================================
-- 7. INTERSTITIAL (Pantalla Completa)
-- ==========================================================
WITH space_interstitial AS (SELECT id FROM ad_spaces WHERE name = 'interstitial' LIMIT 1)
INSERT INTO ad_campaigns (ad_space_id, advertiser_name, advertiser_email, start_date, end_date, status, geographic_scope, budget)
SELECT
  (SELECT id FROM space_interstitial),
  'MegaOferta Black Friday',
  'demo@megaoferta.com',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  'active',
  'global',
  15000.00
WHERE NOT EXISTS (
  SELECT 1 FROM ad_campaigns WHERE advertiser_name = 'MegaOferta Black Friday'
);

INSERT INTO ad_creatives (campaign_id, title, description, cta_text, cta_url, image_url)
SELECT id, 
  '🔥 BLACK FRIDAY: Hasta 70% de Descuento', 
  'Solo hoy: Descuentos en toda la tienda. No te pierdas esta oportunidad única.', 
  'Ver Ofertas Ahora', 
  'https://google.com',
  'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=1200&q=80'
FROM ad_campaigns 
WHERE advertiser_name = 'MegaOferta Black Friday'
AND NOT EXISTS (
  SELECT 1 FROM ad_creatives WHERE campaign_id = (SELECT id FROM ad_campaigns WHERE advertiser_name = 'MegaOferta Black Friday')
);

-- ==========================================================
-- VERIFICACIÓN FINAL
-- ==========================================================

-- Ver todas las campañas creadas
SELECT 
  '=== CAMPAÑAS ACTIVAS POR ESPACIO ===' as titulo,
  s.display_name as espacio,
  c.advertiser_name as anunciante,
  c.status,
  cr.title as creativo
FROM ad_campaigns c
JOIN ad_spaces s ON c.ad_space_id = s.id
LEFT JOIN ad_creatives cr ON c.id = cr.campaign_id
WHERE c.status = 'active'
AND c.start_date <= CURRENT_DATE
AND c.end_date >= CURRENT_DATE
ORDER BY s.display_name;

-- Resumen
SELECT 
  '=== RESUMEN ===' as titulo,
  COUNT(DISTINCT c.id) as total_campanas,
  COUNT(DISTINCT s.id) as espacios_con_campanas,
  COUNT(DISTINCT cr.id) as total_creativos
FROM ad_campaigns c
JOIN ad_spaces s ON c.ad_space_id = s.id
LEFT JOIN ad_creatives cr ON c.id = cr.campaign_id
WHERE c.status = 'active';

-- Resultado esperado: 7 campañas activas, 7 espacios con campañas, 7 creativos
