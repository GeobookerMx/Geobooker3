-- =========================================
-- CRM Email System Schema
-- =========================================

-- Tabla de contactos importados desde CSV
CREATE TABLE IF NOT EXISTS crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT NOT NULL,
    company TEXT,
    position TEXT,
    tier TEXT DEFAULT 'A' CHECK (tier IN ('AAA', 'AA', 'A', 'B')),
    phone TEXT,
    city TEXT,
    postal_code TEXT,
    neighborhood TEXT,
    website TEXT,
    employee_count TEXT,
    company_type TEXT,
    source_file TEXT,
    notes TEXT,
    last_contacted_at TIMESTAMPTZ,
    contact_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de cuentas de remitente
CREATE TABLE IF NOT EXISTS crm_email_senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    signature_html TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de historial de emails enviados
CREATE TABLE IF NOT EXISTS crm_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
    sender_email TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    template_name TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    resend_email_id TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tier ON crm_contacts(tier);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts(company);
CREATE INDEX IF NOT EXISTS idx_crm_email_logs_contact ON crm_email_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_logs_sent_at ON crm_email_logs(sent_at DESC);

-- RLS
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_email_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_email_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo admins pueden acceder
CREATE POLICY "Admins can manage crm_contacts" ON crm_contacts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage crm_email_senders" ON crm_email_senders
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage crm_email_logs" ON crm_email_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

-- Insertar remitentes iniciales
INSERT INTO crm_email_senders (email, display_name, is_default, signature_html) VALUES
(
    'juanpablopg@geobooker.com.mx',
    'Juan Pablo Peña García',
    TRUE,
    '<div style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;">
        <p style="margin:0;font-weight:600;color:#1f2937;">Juan Pablo Peña García</p>
        <p style="margin:2px 0;color:#6b7280;font-size:14px;">CEO & Fundador</p>
        <p style="margin:2px 0;font-weight:600;color:#3b82f6;">Geobooker</p>
        <p style="margin:12px 0 0 0;font-size:13px;color:#4b5563;">
            📞 +52 5513047404<br>
            🌐 geobooker.com.mx | geobooker.com<br>
            📍 México
        </p>
    </div>'
),
(
    'ventasgeobooker@gmail.com',
    'Ventas Geobooker',
    FALSE,
    '<div style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;">
        <p style="margin:0;font-weight:600;color:#1f2937;">Equipo de Ventas</p>
        <p style="margin:2px 0;font-weight:600;color:#3b82f6;">Geobooker</p>
        <p style="margin:12px 0 0 0;font-size:13px;color:#4b5563;">
            📞 +52 5513047404<br>
            🌐 geobooker.com.mx | geobooker.com<br>
            📍 México
        </p>
    </div>'
)
ON CONFLICT (email) DO NOTHING;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_crm_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_crm_contacts_updated_at ON crm_contacts;
CREATE TRIGGER trigger_crm_contacts_updated_at
    BEFORE UPDATE ON crm_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_contacts_updated_at();
