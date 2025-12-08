-- =============================================
-- MAPEAR PRODUCTOS DE STRIPE A GEOBOOKER
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- PASO 1: Crear tabla de precios de Stripe si no existe
CREATE TABLE IF NOT EXISTS stripe_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  stripe_product_id TEXT NOT NULL,
  stripe_price_id TEXT, -- Se llenará después
  price_mxn NUMERIC NOT NULL,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('recurring', 'one_time')),
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year', NULL)),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 2: Insertar los productos de Stripe
INSERT INTO stripe_prices (space_name, display_name, stripe_product_id, price_mxn, billing_type, billing_interval)
VALUES
  -- Suscripciones Premium
  ('premium_monthly', 'Geobooker Premium - Mensual', 'prod_TZFLVDcHQt4iyn', 119, 'recurring', 'month'),
  ('premium_annual_launch', 'Geobooker Premium - Anual Lanzamiento', 'prod_TZFbZKAZMjnRaT', 999, 'recurring', 'year'),
  ('premium_annual', 'Geobooker Premium - Anual', 'prod_TZFcCQJgSTveo5', 1188, 'recurring', 'year'),
  
  -- Espacios Publicitarios
  ('hero_banner', 'Geobooker Ads - Hero Banner', 'prod_TZFcQ2OvsiFthL', 9000, 'recurring', 'month'),
  ('featured_carousel', 'Geobooker Ads - Carrusel Destacado', 'prod_TZFdYHboWeI28L', 5000, 'recurring', 'month'),
  ('sponsored_results', 'Geobooker Ads - Resultados Patrocinados', 'prod_TZFfWtWXO4a3N5', 1500, 'one_time', NULL),
  ('recommended_section', 'Geobooker Ads - Recomendados', 'prod_TZFfXst5TV122j', 2000, 'recurring', 'month'),
  ('bottom_banner', 'Geobooker Ads - Banner Sticky', 'prod_TZFjBMx6K5CEAM', 6000, 'recurring', 'month'),
  ('interstitial', 'Geobooker Ads - Interstitial', 'prod_TZFjzB3j3Ln8sI', 30000, 'recurring', 'month'),
  ('sponsored_results_fullwidth', 'Geobooker Ads - Fullwidth Patrocinado', 'prod_TZFkxuQHajnwnx', 1200, 'one_time', NULL)
ON CONFLICT DO NOTHING;

-- PASO 3: Verificar los datos
SELECT 
  space_name,
  display_name,
  stripe_product_id,
  price_mxn,
  billing_type
FROM stripe_prices
ORDER BY price_mxn DESC;

-- =============================================
-- NOTA: Los price_id se llenarán automáticamente
-- cuando se obtengan de la API de Stripe
-- =============================================
