-- ==============================================================================
-- SISTEMA DE MAKEGOODS (COMPENSACIONES) PARA GEOBOOKER ADS
-- ==============================================================================
-- Versión: 1.0
-- Fecha: Enero 2026
-- Descripción: Sistema para gestionar compensaciones cuando las campañas
--              no alcanzan las impresiones prometidas en el contrato.
-- ==============================================================================

-- 1. Agregar campo de número de contrato a campañas existentes
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS contract_number TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS promised_impressions INTEGER;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS target_regions JSONB DEFAULT '[]'::jsonb;

-- Índice para búsqueda rápida por contrato
CREATE INDEX IF NOT EXISTS idx_campaigns_contract ON ad_campaigns(contract_number);

-- Comentarios
COMMENT ON COLUMN ad_campaigns.contract_number IS 'Número único de contrato (ej: ENT-2026-00142)';
COMMENT ON COLUMN ad_campaigns.promised_impressions IS 'Impresiones prometidas en el contrato';
COMMENT ON COLUMN ad_campaigns.target_regions IS 'Regiones objetivo: ["CDMX", "GDL", "MTY"]';


-- 2. Tabla principal de Makegoods
CREATE TABLE IF NOT EXISTS ad_makegoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencia a campaña original
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  contract_number TEXT,
  
  -- Métricas de cumplimiento
  promised_impressions INTEGER NOT NULL,
  delivered_impressions INTEGER NOT NULL,
  deficit_impressions INTEGER GENERATED ALWAYS AS (promised_impressions - delivered_impressions) STORED,
  deficit_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN promised_impressions > 0 
         THEN ROUND(((promised_impressions - delivered_impressions)::DECIMAL / promised_impressions) * 100, 2)
         ELSE 0 
    END
  ) STORED,
  
  -- Tipo de compensación
  compensation_type TEXT NOT NULL DEFAULT 'extension',
  -- 'extension': Extender campaña X días
  -- 'impressions': Impresiones adicionales gratis
  -- 'credit': Crédito para próxima campaña
  -- 'discount': Descuento porcentual
  
  compensation_value TEXT, -- "14 días", "50,000 impresiones", "$500 USD", "20%"
  compensation_details JSONB DEFAULT '{}'::jsonb,
  
  -- Estado del makegood
  status TEXT DEFAULT 'pending',
  -- 'pending': Pendiente de revisión
  -- 'approved': Aprobado por admin
  -- 'applied': Compensación aplicada
  -- 'rejected': Rechazado
  -- 'waived': Cliente renunció a compensación
  
  -- Quién lo procesó
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  -- Fechas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_at TIMESTAMP,
  
  -- Campaña de compensación (si aplica)
  compensation_campaign_id UUID REFERENCES ad_campaigns(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_makegoods_campaign ON ad_makegoods(campaign_id);
CREATE INDEX IF NOT EXISTS idx_makegoods_status ON ad_makegoods(status);
CREATE INDEX IF NOT EXISTS idx_makegoods_contract ON ad_makegoods(contract_number);

-- RLS
ALTER TABLE ad_makegoods ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver/editar makegoods
CREATE POLICY "Admin access makegoods" ON ad_makegoods
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );


-- 3. Función para verificar si una campaña necesita makegood
CREATE OR REPLACE FUNCTION check_campaign_makegood(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_campaign RECORD;
  v_threshold DECIMAL := 0.95; -- 95% de cumplimiento mínimo
  v_result JSONB;
BEGIN
  -- Obtener datos de campaña
  SELECT 
    id,
    contract_number,
    promised_impressions,
    impressions as delivered_impressions,
    advertiser_name,
    start_date,
    end_date
  INTO v_campaign
  FROM ad_campaigns
  WHERE id = p_campaign_id;
  
  IF v_campaign IS NULL THEN
    RETURN jsonb_build_object('error', 'Campaign not found');
  END IF;
  
  -- Si no tiene impresiones prometidas, no aplica
  IF v_campaign.promised_impressions IS NULL OR v_campaign.promised_impressions = 0 THEN
    RETURN jsonb_build_object(
      'needs_makegood', false,
      'reason', 'No promised impressions defined'
    );
  END IF;
  
  -- Calcular cumplimiento
  DECLARE
    v_delivery_rate DECIMAL;
    v_deficit INTEGER;
  BEGIN
    v_delivery_rate := v_campaign.delivered_impressions::DECIMAL / v_campaign.promised_impressions;
    v_deficit := v_campaign.promised_impressions - v_campaign.delivered_impressions;
    
    v_result := jsonb_build_object(
      'campaign_id', v_campaign.id,
      'contract_number', v_campaign.contract_number,
      'advertiser', v_campaign.advertiser_name,
      'promised', v_campaign.promised_impressions,
      'delivered', v_campaign.delivered_impressions,
      'deficit', v_deficit,
      'delivery_rate', ROUND(v_delivery_rate * 100, 2),
      'threshold', v_threshold * 100,
      'needs_makegood', v_delivery_rate < v_threshold
    );
    
    -- Si necesita makegood, sugerir compensación
    IF v_delivery_rate < v_threshold THEN
      v_result := v_result || jsonb_build_object(
        'suggested_compensation', jsonb_build_object(
          'type', 'impressions',
          'value', v_deficit,
          'alternative', jsonb_build_object(
            'type', 'extension',
            'days', GREATEST(7, CEIL(v_deficit::DECIMAL / 1000)) -- 1 día por cada 1000 impresiones faltantes, mínimo 7
          )
        )
      );
    END IF;
    
    RETURN v_result;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Función para crear makegood automáticamente
CREATE OR REPLACE FUNCTION create_makegood(
  p_campaign_id UUID,
  p_compensation_type TEXT DEFAULT 'impressions',
  p_compensation_value TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_campaign RECORD;
  v_makegood_id UUID;
  v_comp_value TEXT;
BEGIN
  -- Obtener datos de la campaña
  SELECT 
    id,
    contract_number,
    promised_impressions,
    impressions as delivered_impressions
  INTO v_campaign
  FROM ad_campaigns
  WHERE id = p_campaign_id;
  
  IF v_campaign IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;
  
  -- Calcular valor de compensación si no se proporciona
  IF p_compensation_value IS NULL THEN
    IF p_compensation_type = 'impressions' THEN
      v_comp_value := (v_campaign.promised_impressions - v_campaign.delivered_impressions)::TEXT || ' impresiones';
    ELSIF p_compensation_type = 'extension' THEN
      v_comp_value := GREATEST(7, CEIL((v_campaign.promised_impressions - v_campaign.delivered_impressions)::DECIMAL / 1000))::TEXT || ' días';
    ELSE
      v_comp_value := 'Por definir';
    END IF;
  ELSE
    v_comp_value := p_compensation_value;
  END IF;
  
  -- Insertar makegood
  INSERT INTO ad_makegoods (
    campaign_id,
    contract_number,
    promised_impressions,
    delivered_impressions,
    compensation_type,
    compensation_value
  ) VALUES (
    v_campaign.id,
    v_campaign.contract_number,
    v_campaign.promised_impressions,
    v_campaign.delivered_impressions,
    p_compensation_type,
    v_comp_value
  )
  RETURNING id INTO v_makegood_id;
  
  RETURN v_makegood_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Función para generar número de contrato automático
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_contract TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Obtener el siguiente número en secuencia
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(contract_number FROM 10 FOR 5) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM ad_campaigns
  WHERE contract_number LIKE 'ENT-' || v_year || '-%';
  
  v_contract := 'ENT-' || v_year || '-' || LPAD(v_sequence::TEXT, 5, '0');
  
  RETURN v_contract;
END;
$$ LANGUAGE plpgsql;


-- 6. Trigger para asignar contrato automáticamente a campañas enterprise
CREATE OR REPLACE FUNCTION auto_assign_contract()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo para campañas Enterprise sin contrato
  IF NEW.campaign_type IN ('regional', 'national', 'global') 
     AND NEW.contract_number IS NULL THEN
    NEW.contract_number := generate_contract_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_contract ON ad_campaigns;
CREATE TRIGGER trigger_auto_contract
  BEFORE INSERT ON ad_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_contract();


-- 7. Vista para reporte de makegoods pendientes
CREATE OR REPLACE VIEW v_pending_makegoods AS
SELECT 
  mg.id,
  mg.contract_number,
  c.advertiser_name,
  mg.promised_impressions,
  mg.delivered_impressions,
  mg.deficit_impressions,
  mg.deficit_percent,
  mg.compensation_type,
  mg.compensation_value,
  mg.status,
  mg.created_at,
  c.start_date,
  c.end_date
FROM ad_makegoods mg
JOIN ad_campaigns c ON mg.campaign_id = c.id
WHERE mg.status = 'pending'
ORDER BY mg.created_at DESC;


-- ==============================================================================
-- FIN DE MIGRACIÓN MAKEGOODS
-- ==============================================================================
