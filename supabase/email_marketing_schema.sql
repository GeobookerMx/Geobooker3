-- =========================================
-- Email Marketing Schema for Geobooker
-- =========================================

-- Tabla de plantillas de email
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de campañas de email
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template_id UUID REFERENCES email_templates(id),
    target_tier TEXT NOT NULL CHECK (target_tier IN ('A', 'AA', 'AAA', 'ALL')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Tabla de log de emails enviados (para tracking)
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES email_campaigns(id),
    recipient_email TEXT NOT NULL,
    business_id UUID REFERENCES businesses(id),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    resend_email_id TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);

-- RLS Policies
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver/modificar plantillas y campañas
CREATE POLICY "Admins can manage email_templates" ON email_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage email_campaigns" ON email_campaigns
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can view email_logs" ON email_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

-- Función para actualizar estadísticas de campaña
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'opened' AND OLD.status != 'opened' THEN
        UPDATE email_campaigns 
        SET open_count = open_count + 1 
        WHERE id = NEW.campaign_id;
    ELSIF NEW.status = 'clicked' AND OLD.status != 'clicked' THEN
        UPDATE email_campaigns 
        SET click_count = click_count + 1 
        WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar stats
DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON email_logs;
CREATE TRIGGER trigger_update_campaign_stats
    AFTER UPDATE ON email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_stats();
