-- ============================================
-- Campos para Tracking de Marketing y A/B Testing
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Agregar campos de tracking a crm_contacts
ALTER TABLE crm_contacts
ADD COLUMN IF NOT EXISTS wa_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS wa_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS wa_template TEXT,                    -- Template usado (A, B, C)
ADD COLUMN IF NOT EXISTS wa_responded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS wa_response_type TEXT CHECK (wa_response_type IN ('positive', 'negative', 'neutral', 'opt_out')),
ADD COLUMN IF NOT EXISTS wa_response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_template TEXT,                 -- Template usado para A/B
ADD COLUMN IF NOT EXISTS email_opened BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS campaign_id TEXT,                    -- Para agrupar por campaña
ADD COLUMN IF NOT EXISTS ab_group TEXT CHECK (ab_group IN ('A', 'B', 'C', 'control'));

-- Índices para consultas rápidas de analytics
CREATE INDEX IF NOT EXISTS idx_crm_wa_sent ON crm_contacts(wa_sent) WHERE wa_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_crm_email_sent ON crm_contacts(email_sent) WHERE email_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_crm_wa_template ON crm_contacts(wa_template) WHERE wa_template IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_campaign ON crm_contacts(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_response_type ON crm_contacts(wa_response_type) WHERE wa_response_type IS NOT NULL;

-- Comentarios descriptivos
COMMENT ON COLUMN crm_contacts.wa_sent IS 'Flag si se envió WhatsApp';
COMMENT ON COLUMN crm_contacts.wa_template IS 'Template de WhatsApp usado (A, B, C) para A/B testing';
COMMENT ON COLUMN crm_contacts.wa_response_type IS 'Tipo de respuesta: positive, negative, neutral, opt_out';
COMMENT ON COLUMN crm_contacts.ab_group IS 'Grupo de A/B testing asignado';
COMMENT ON COLUMN crm_contacts.campaign_id IS 'ID para agrupar leads por campaña de marketing';

-- Vista para analytics de campañas
CREATE OR REPLACE VIEW crm_campaign_analytics AS
SELECT 
    campaign_id,
    wa_template,
    ab_group,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE wa_sent = TRUE) as wa_sent_count,
    COUNT(*) FILTER (WHERE wa_responded = TRUE) as wa_response_count,
    COUNT(*) FILTER (WHERE wa_response_type = 'positive') as wa_positive_count,
    COUNT(*) FILTER (WHERE wa_response_type = 'opt_out') as wa_optout_count,
    COUNT(*) FILTER (WHERE email_sent = TRUE) as email_sent_count,
    COUNT(*) FILTER (WHERE email_opened = TRUE) as email_opened_count,
    COUNT(*) FILTER (WHERE email_clicked = TRUE) as email_clicked_count,
    ROUND(
        COUNT(*) FILTER (WHERE wa_responded = TRUE)::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE wa_sent = TRUE), 0) * 100, 2
    ) as wa_response_rate,
    ROUND(
        COUNT(*) FILTER (WHERE email_opened = TRUE)::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE email_sent = TRUE), 0) * 100, 2
    ) as email_open_rate
FROM crm_contacts
WHERE campaign_id IS NOT NULL
GROUP BY campaign_id, wa_template, ab_group
ORDER BY campaign_id, wa_template;

-- Función para asignar grupo A/B automáticamente
CREATE OR REPLACE FUNCTION assign_ab_group()
RETURNS TRIGGER AS $$
BEGIN
    -- Asigna grupo A o B aleatoriamente si no está asignado
    IF NEW.ab_group IS NULL THEN
        NEW.ab_group := CASE WHEN random() < 0.5 THEN 'A' ELSE 'B' END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar A/B group en insert
DROP TRIGGER IF EXISTS trg_assign_ab_group ON crm_contacts;
CREATE TRIGGER trg_assign_ab_group
    BEFORE INSERT ON crm_contacts
    FOR EACH ROW
    EXECUTE FUNCTION assign_ab_group();

SELECT 'Campos de tracking agregados exitosamente' as status;
