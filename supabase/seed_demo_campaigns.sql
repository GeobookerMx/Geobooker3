-- ==========================================================
-- SEED: Campañas de Demostración con Negocios Reales
-- Video principal: https://youtube.com/shorts/-BN3aPWT4kI
-- ==========================================================

-- 1. LIMPIEZA: Eliminar campañas anteriores
DELETE FROM ad_campaigns;

-- ==========================================================
-- � HERO BANNER PRINCIPAL (Video de YouTube)
-- ==========================================================
INSERT INTO ad_campaigns (
    advertiser_name, advertiser_email, 
    status, ad_level, 
    target_countries, start_date, end_date,
    headline, description, 
    cta_text, cta_url, creative_url,
    is_demo, budget, campaign_type
) VALUES (
    'Geobooker', 'ads@geobooker.com.mx',
    'active', 'global',
    NULL, '2026-01-01', '2026-12-31',
    '🚀 Prende tu Negocio en el Mapa', 
    '¡Regístrate gratis y empieza a recibir clientes hoy!',
    'Registrar Negocio', 'https://geobooker.com.mx/business/register',
    'https://youtube.com/shorts/-BN3aPWT4kI',
    true, 0, 'demo'
);

-- ==========================================================
-- 🚗 CARRUSEL - Lava Autos Premium
-- ==========================================================
INSERT INTO ad_campaigns (
    advertiser_name, advertiser_email, 
    status, ad_level, 
    target_countries, start_date, end_date,
    headline, description, 
    cta_text, cta_url, creative_url,
    is_demo, budget, campaign_type
) VALUES (
    'AutoSpa Puebla', 'contacto@autospa.mx',
    'active', 'country',
    '["Mexico", "MX"]'::jsonb, '2026-01-01', '2026-12-31',
    '� Lavado Profesional desde $99', 
    'Dejamos tu auto como nuevo. Servicio express en 30 minutos.',
    'Ver Ubicación', 'https://geobooker.com.mx',
    'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800',
    true, 0, 'demo'
);

-- ==========================================================
-- 💊 CARRUSEL - Farmacia
-- ==========================================================
INSERT INTO ad_campaigns (
    advertiser_name, advertiser_email, 
    status, ad_level, 
    target_countries, start_date, end_date,
    headline, description, 
    cta_text, cta_url, creative_url,
    is_demo, budget, campaign_type
) VALUES (
    'Farmacia San José', 'farmacia@sanjose.mx',
    'active', 'country',
    '["Mexico", "MX"]'::jsonb, '2026-01-01', '2026-12-31',
    '💊 Medicamentos 24 Horas', 
    'Servicio a domicilio gratis en compras mayores a $300.',
    'Llamar Ahora', 'tel:+522221234567',
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800',
    true, 0, 'demo'
);

-- ==========================================================
-- � RESULTADOS PATROCINADOS - Restaurante
-- ==========================================================
INSERT INTO ad_campaigns (
    advertiser_name, advertiser_email, 
    status, ad_level, 
    target_countries, start_date, end_date,
    headline, description, 
    cta_text, cta_url, creative_url,
    is_demo, budget, campaign_type
) VALUES (
    'Pizzería Bella Napoli', 'reservas@bellanapoli.mx',
    'active', 'country',
    '["Mexico", "MX"]'::jsonb, '2026-01-01', '2026-12-31',
    '🍕 2x1 en Pizzas Familiares', 
    'Los martes y jueves, llévate el doble. ¡Reserva tu mesa!',
    'Ver Menú', 'https://geobooker.com.mx',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
    true, 0, 'demo'
);

-- ==========================================================
-- 💇 BANNER INFERIOR - Estética
-- ==========================================================
INSERT INTO ad_campaigns (
    advertiser_name, advertiser_email, 
    status, ad_level, 
    target_countries, start_date, end_date,
    headline, description, 
    cta_text, cta_url, creative_url,
    is_demo, budget, campaign_type
) VALUES (
    'Salón Glamour', 'citas@salonglamour.mx',
    'active', 'country',
    '["Mexico", "MX"]'::jsonb, '2026-01-01', '2026-12-31',
    '� Corte + Tratamiento $250', 
    'Agenda tu cita online y recibe 10% de descuento.',
    'Agendar Cita', 'https://geobooker.com.mx',
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    true, 0, 'demo'
);

-- ==========================================================
-- 🔧 RECOMENDADOS - Mecánico
-- ==========================================================
INSERT INTO ad_campaigns (
    advertiser_name, advertiser_email, 
    status, ad_level, 
    target_countries, start_date, end_date,
    headline, description, 
    cta_text, cta_url, creative_url,
    is_demo, budget, campaign_type
) VALUES (
    'Taller Mecánico El Rápido', 'servicio@elrapido.mx',
    'active', 'country',
    '["Mexico", "MX"]'::jsonb, '2026-01-01', '2026-12-31',
    '🔧 Servicio Mayor $1,500', 
    'Diagnóstico gratis. Afinación, frenos y suspensión.',
    'Cotizar Servicio', 'https://geobooker.com.mx',
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800',
    true, 0, 'demo'
);

-- ==========================================================
-- 🎬 INTERSTITIAL - Pantalla Completa (Video Geobooker)
-- ==========================================================
INSERT INTO ad_campaigns (
    advertiser_name, advertiser_email, 
    status, ad_level, 
    target_countries, start_date, end_date,
    headline, description, 
    cta_text, cta_url, creative_url,
    is_demo, budget, campaign_type
) VALUES (
    'Geobooker Premium', 'premium@geobooker.com.mx',
    'active', 'global',
    NULL, '2026-01-01', '2026-12-31',
    '🎯 ESPACIO PREMIUM DISPONIBLE', 
    '¡Tu marca puede aparecer aquí! Impacto máximo garantizado para grandes marcas.',
    'Contactar Ventas', 'https://geobooker.com.mx/advertise',
    'https://youtube.com/shorts/-BN3aPWT4kI',
    true, 0, 'interstitial'
);

-- ==========================================================
-- VERIFICACIÓN
-- ==========================================================
SELECT 
    advertiser_name, 
    ad_level, 
    headline,
    creative_url,
    is_demo,
    status
FROM ad_campaigns 
ORDER BY ad_level, advertiser_name;
