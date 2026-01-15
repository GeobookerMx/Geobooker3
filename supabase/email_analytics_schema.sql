-- Tabla para Email Analytics (tracking de eventos)
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS email_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_email_analytics_message_id ON email_analytics(message_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_recipient ON email_analytics(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_analytics_event_type ON email_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_email_analytics_timestamp ON email_analytics(timestamp DESC);

-- Vista para métricas agregadas
CREATE OR REPLACE VIEW email_metrics_summary AS
SELECT 
    DATE(timestamp) as date,
    COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
    COUNT(*) FILTER (WHERE event_type = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE event_type = 'opened') as opened,
    COUNT(*) FILTER (WHERE event_type = 'clicked') as clicked,
    COUNT(*) FILTER (WHERE event_type = 'bounced') as bounced,
    COUNT(*) FILTER (WHERE event_type = 'complained') as complained,
    
    -- Tasas calculadas
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'delivered')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'sent'), 0) * 100, 
        2
    ) as delivery_rate,
    
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'opened')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'delivered'), 0) * 100, 
        2
    ) as open_rate,
    
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'clicked')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'opened'), 0) * 100, 
        2
    ) as click_rate,
    
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'bounced')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'sent'), 0) * 100, 
        2
    ) as bounce_rate

FROM email_analytics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Consultar métricas
SELECT * FROM email_metrics_summary;

-- Métricas por contacto individual
CREATE OR REPLACE VIEW contact_email_engagement AS
SELECT 
    mc.id as contact_id,
    mc.email,
    mc.company_name,
    mc.tier,
    COUNT(*) FILTER (WHERE ea.event_type = 'delivered') as emails_delivered,
    COUNT(*) FILTER (WHERE ea.event_type = 'opened') as emails_opened,
    COUNT(*) FILTER (WHERE ea.event_type = 'clicked') as emails_clicked,
    ROUND(
        COUNT(*) FILTER (WHERE ea.event_type = 'opened')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE ea.event_type = 'delivered'), 0) * 100,
        2
    ) as open_rate,
    MAX(ea.timestamp) FILTER (WHERE ea.event_type = 'opened') as last_opened_at
FROM marketing_contacts mc
LEFT JOIN email_analytics ea ON ea.recipient_email = mc.email
WHERE mc.email IS NOT NULL
GROUP BY mc.id, mc.email, mc.company_name, mc.tier
ORDER BY emails_opened DESC;

-- Ver contactos más engaged
SELECT * FROM contact_email_engagement
WHERE emails_opened > 0
LIMIT 20;
