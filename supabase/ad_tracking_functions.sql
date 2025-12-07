-- =====================================================
-- Funciones RPC para Tracking de Anuncios
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Función para incrementar impresiones
CREATE OR REPLACE FUNCTION increment_ad_impression(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ad_campaigns
  SET impressions = impressions + 1
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar clicks
CREATE OR REPLACE FUNCTION increment_ad_click(campaign_id UUID)
RETURNS void AS $$
DECLARE
  current_impressions INTEGER;
  current_clicks INTEGER;
  new_ctr DECIMAL(5,2);
BEGIN
  -- Incrementar clicks
  UPDATE ad_campaigns
  SET clicks = clicks + 1
  WHERE id = campaign_id;
  
  -- Recalcular CTR
  SELECT impressions, clicks INTO current_impressions, current_clicks
  FROM ad_campaigns
  WHERE id = campaign_id;
  
  IF current_impressions > 0 THEN
    new_ctr := ((current_clicks::DECIMAL / current_impressions) * 100);
    
    UPDATE ad_campaigns
    SET ctr = new_ctr
    WHERE id = campaign_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION increment_ad_impression IS 'Incrementa el contador de impresiones de una campaña';
COMMENT ON FUNCTION increment_ad_click IS 'Incrementa clicks y recalcula CTR automáticamente';
