-- =============================================
-- CORRECCIONES DE AUDITORÍA - SISTEMA DE PAGOS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- PASO 1: Actualizar precios en ad_spaces (precios de lanzamiento)
UPDATE ad_spaces SET price_monthly = 9000 WHERE name = 'hero_banner';
UPDATE ad_spaces SET price_monthly = 5000 WHERE name = 'featured_carousel';
UPDATE ad_spaces SET price_monthly = 15 WHERE name = 'sponsored_results'; -- Por clic
UPDATE ad_spaces SET price_monthly = 2000 WHERE name = 'recommended_section';
UPDATE ad_spaces SET price_monthly = 6000 WHERE name = 'bottom_banner';
UPDATE ad_spaces SET price_monthly = 30000 WHERE name = 'interstitial';
UPDATE ad_spaces SET price_monthly = 12 WHERE name = 'sponsored_results_fullwidth'; -- Por clic

-- PASO 2: Agregar columnas faltantes a subscription_plans (si existen)
DO $$
BEGIN
  -- Agregar columna billing_interval si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' AND column_name = 'billing_interval') THEN
    ALTER TABLE subscription_plans ADD COLUMN billing_interval TEXT DEFAULT 'month';
  END IF;
  
  -- Agregar columna features si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' AND column_name = 'features') THEN
    ALTER TABLE subscription_plans ADD COLUMN features JSONB DEFAULT '[]';
  END IF;
  
  -- Agregar columna stripe_product_id si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' AND column_name = 'stripe_product_id') THEN
    ALTER TABLE subscription_plans ADD COLUMN stripe_product_id TEXT;
  END IF;
END $$;

-- PASO 3: Insertar/Actualizar planes de suscripción con product_ids reales
INSERT INTO subscription_plans (code, name, price_mxn, stripe_product_id, billing_interval, features)
VALUES 
  ('premium_monthly', 'Geobooker Premium - Mensual', 119, 'prod_TZFLVDcHQt4iyn', 'month', 
   '["Negocios ilimitados", "20 fotos por negocio", "Redes sociales", "Badge verificado", "Prioridad en mapa", "Estadísticas avanzadas"]'::jsonb),
  ('premium_annual_launch', 'Geobooker Premium - Anual Lanzamiento', 999, 'prod_TZFbZKAZMjnRaT', 'year',
   '["Todo lo de mensual", "Ahorro 30%", "Precio congelado", "Early Adopter badge"]'::jsonb),
  ('premium_annual', 'Geobooker Premium - Anual', 1188, 'prod_TZFcCQJgSTveo5', 'year',
   '["Todo lo de mensual", "Ahorro 17%"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  stripe_product_id = EXCLUDED.stripe_product_id,
  price_mxn = EXCLUDED.price_mxn,
  features = EXCLUDED.features,
  billing_interval = EXCLUDED.billing_interval;

-- PASO 4: Verificar resultados
SELECT '=== PRECIOS DE ESPACIOS PUBLICITARIOS ===' as info;
SELECT name, display_name, price_monthly as precio_mxn FROM ad_spaces ORDER BY price_monthly DESC;

SELECT '=== PLANES DE SUSCRIPCIÓN ===' as info;
SELECT code, name, price_mxn, stripe_product_id FROM subscription_plans;
