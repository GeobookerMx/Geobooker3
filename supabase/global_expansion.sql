-- ==============================================================================
-- MIGRACIÓN: INTERNACIONALIZACIÓN Y SEGMENTACIÓN AVANZADA
-- ==============================================================================

-- 1. Actualizar tabla ad_campaigns para segmentación avanzada
-- Agregamos columna JSONB para targeting flexible (país, idioma, dispositivo, intereses)
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS audience_targeting JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ad_campaigns.audience_targeting IS 'JSON con reglas de segmentación: countries, languages, devices, interests';

-- 2. Nueva tabla para Planes de Suscripción Multi-Moneda
-- Centraliza la configuración de precios de Stripe para diferentes regiones
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- 'premium_monthly', 'premium_yearly'
  stripe_product_id TEXT NOT NULL,
  
  -- Precios base para visualización
  price_mxn DECIMAL(10,2),
  price_usd DECIMAL(10,2),
  price_eur DECIMAL(10,2),
  
  -- IDs de precios en Stripe (para el checkout real)
  stripe_price_id_mxn TEXT,
  stripe_price_id_usd TEXT,
  stripe_price_id_eur TEXT,
  
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (cualquiera puede ver precios)
CREATE POLICY "Public plans access" ON subscription_plans
  FOR SELECT USING (true);


-- 3. Función RPC Inteligente para Seleccionar Anuncios Segmentados
-- Esta función reemplaza consultas simples. Recibe el contexto del usuario y encuentra el mejor match.
CREATE OR REPLACE FUNCTION get_targeted_ads(
  p_space_name TEXT,
  p_user_country TEXT DEFAULT NULL,
  p_user_language TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  campaign_id UUID,
  creative_id UUID,
  display_name TEXT,
  title TEXT,
  image_url TEXT,
  cta_url TEXT,
  cta_text TEXT,
  advertiser_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    cr.id as creative_id,
    s.display_name,
    cr.title,
    cr.image_url,
    cr.cta_url,
    cr.cta_text,
    c.advertiser_name
  FROM ad_campaigns c
  JOIN ad_spaces s ON c.ad_space_id = s.id
  LEFT JOIN ad_creatives cr ON cr.campaign_id = c.id
  WHERE 
    s.name = p_space_name
    AND c.status = 'active'
    AND s.is_active = true
    AND c.start_date <= CURRENT_DATE
    AND c.end_date >= CURRENT_DATE
    -- Lógica de Matching JSONB
    AND (
      -- Si targeting está vacío, es global
      c.audience_targeting = '{}'::jsonb
      OR (
        -- Match de País (si está definido en la campaña)
        (NOT (c.audience_targeting ? 'countries') OR (c.audience_targeting->'countries') ? p_user_country)
        AND
        -- Match de Idioma
        (NOT (c.audience_targeting ? 'languages') OR (c.audience_targeting->'languages') ? p_user_language)
        AND
        -- Match de Dispositivo
        (NOT (c.audience_targeting ? 'devices') OR (c.audience_targeting->'devices') ? p_device_type)
      )
    )
  ORDER BY random() -- Rotación aleatoria simple entre los matches
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
