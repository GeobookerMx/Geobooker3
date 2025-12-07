-- ==========================================================
-- TABLA DE MAPEO: STRIPE PRICES
-- ==========================================================
-- Relaciona cada espacio publicitario con su price_id de Stripe

CREATE TABLE IF NOT EXISTS ad_space_stripe_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_space_id UUID REFERENCES ad_spaces(id) ON DELETE CASCADE,
  stripe_price_id TEXT NOT NULL UNIQUE,
  stripe_product_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ad_space_stripe_prices_space 
  ON ad_space_stripe_prices(ad_space_id);

CREATE INDEX IF NOT EXISTS idx_ad_space_stripe_prices_price 
  ON ad_space_stripe_prices(stripe_price_id);

-- Comentarios
COMMENT ON TABLE ad_space_stripe_prices IS 'Mapeo entre espacios publicitarios y precios de Stripe';
COMMENT ON COLUMN ad_space_stripe_prices.stripe_price_id IS 'ID del precio en Stripe (price_xxx)';
COMMENT ON COLUMN ad_space_stripe_prices.stripe_product_id IS 'ID del producto en Stripe (prod_xxx)';

-- ==========================================================
-- FUNCIÓN HELPER: Obtener precio de Stripe para un espacio
-- ==========================================================
CREATE OR REPLACE FUNCTION get_stripe_price_for_space(p_ad_space_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_price_id TEXT;
BEGIN
  SELECT stripe_price_id INTO v_price_id
  FROM ad_space_stripe_prices
  WHERE ad_space_id = p_ad_space_id
  AND is_active = true
  LIMIT 1;
  
  RETURN v_price_id;
END;
$$ LANGUAGE plpgsql;

-- Uso: SELECT get_stripe_price_for_space('uuid-del-espacio');

-- ==========================================================
-- VERIFICACIÓN
-- ==========================================================
SELECT 
  'Tabla de precios Stripe creada ✅' as mensaje,
  COUNT(*) as total_registros
FROM ad_space_stripe_prices;
