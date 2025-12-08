-- =============================================
-- ACTUALIZAR PRICE ID DE PREMIUM MENSUAL
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Agregar columna stripe_price_id_mxn si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' AND column_name = 'stripe_price_id_mxn') THEN
    ALTER TABLE subscription_plans ADD COLUMN stripe_price_id_mxn TEXT;
  END IF;
END $$;

-- Actualizar price_id de Premium Mensual
UPDATE subscription_plans 
SET stripe_price_id_mxn = 'price_1Sc6qYRvtu8q72XsuBdILiPA'
WHERE code = 'premium_monthly';

-- Verificar
SELECT code, name, price_mxn, stripe_product_id, stripe_price_id_mxn 
FROM subscription_plans;
