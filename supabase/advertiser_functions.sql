-- ==========================================================
-- FUNCIONES PARA EL PORTAL DE ANUNCIANTES (SELF-SERVICE)
-- ==========================================================

-- Función segura para crear una campaña en estado de borrador (pendiente de pago)
-- Se ejecuta con privilegios de definer para saltar RLS restrictivas de escritura directa
CREATE OR REPLACE FUNCTION create_draft_campaign(
  p_space_id UUID,
  p_advertiser_name TEXT,
  p_advertiser_email TEXT,
  p_geographic_scope TEXT,
  p_target_location TEXT,
  p_audience_targeting JSONB,
  p_budget DECIMAL,
  p_creative_title TEXT,
  p_creative_description TEXT,
  p_creative_url TEXT,
  p_creative_cta TEXT,
  p_creative_image TEXT
)
RETURNS UUID AS $$
DECLARE
  v_campaign_id UUID;
  v_start_date DATE := CURRENT_DATE;
  v_end_date DATE := CURRENT_DATE + INTERVAL '30 days'; -- Default 30 días, ajustable después
BEGIN
  -- 1. Insertar la Campaña como 'pending_payment'
  INSERT INTO ad_campaigns (
    ad_space_id,
    advertiser_name,
    advertiser_email,
    start_date,
    end_date,
    status, -- IMPORTANTE: pending_payment
    geographic_scope,
    target_location,
    audience_targeting,
    budget
  ) VALUES (
    p_space_id,
    p_advertiser_name,
    p_advertiser_email,
    v_start_date,
    v_end_date,
    'pending_payment',
    p_geographic_scope,
    p_target_location,
    p_audience_targeting,
    p_budget
  ) RETURNING id INTO v_campaign_id;

  -- 2. Insertar el Creativo Asociado
  INSERT INTO ad_creatives (
    campaign_id,
    title,
    description,
    cta_url,
    cta_text,
    image_url
  ) VALUES (
    v_campaign_id,
    p_creative_title,
    p_creative_description,
    p_creative_url,
    p_creative_cta,
    p_creative_image
  );

  -- 3. Retornar el ID para procesar el pago
  RETURN v_campaign_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
