-- ==========================================================
-- CRM Settings Table
-- Stores configuration for email senders and WhatsApp Business
-- ==========================================================

CREATE TABLE IF NOT EXISTS crm_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admin full access to CRM settings"
    ON crm_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid()
        )
    );

-- Insert default settings
INSERT INTO crm_settings (setting_key, setting_value, description) VALUES
(
    'email_senders',
    '[
        {
            "name": "Juan Pablo - CEO",
            "email": "juanpablopg@geobooker.com.mx",
            "signature": "<div style=\"margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;\"><p><strong>Juan Pablo Pérez González</strong><br>CEO & Founder | Geobooker<br>📧 juanpablopg@geobooker.com.mx<br>🌐 <a href=\"https://geobooker.com.mx\">geobooker.com.mx</a></p></div>",
            "use_for": ["partnerships", "enterprise", "tier_AAA"]
        },
        {
            "name": "Equipo Ventas",
            "email": "ventasgeobooker@gmail.com",
            "signature": "<div style=\"margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;\"><p><strong>Equipo de Ventas</strong><br>Geobooker - Tu Buscador de Negocios<br>📧 ventasgeobooker@gmail.com<br>📱 WhatsApp: +52 55 2670 2368<br>🌐 <a href=\"https://geobooker.com.mx\">geobooker.com.mx</a></p></div>",
            "use_for": ["commercial", "tier_AA", "tier_A"]
        }
    ]'::jsonb,
    'Email sender configurations with signatures'
),
(
    'whatsapp_business',
    '{
        "phone": "525526702368",
        "display_number": "+52 55 2670 2368",
        "default_message": "¡Hola! Vi tu perfil en Geobooker y me gustaría platicar sobre cómo pueden ayudarte a crecer. ¿Tienes unos minutos?"
    }'::jsonb,
    'WhatsApp Business configuration'
),
(
    'campaign_limits',
    '{
        "daily_email_limit": 100,
        "daily_whatsapp_limit": 50,
        "batch_size": 10,
        "delay_between_batches_ms": 2000
    }'::jsonb,
    'Campaign sending limits and throttling'
),
(
    'unsubscribe_settings',
    '{
        "footer_text": "Si no deseas recibir más correos, puedes darte de baja aquí",
        "support_email": "soporte@geobooker.com.mx"
    }'::jsonb,
    'Unsubscribe and compliance settings'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_crm_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_settings_timestamp
    BEFORE UPDATE ON crm_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_settings_timestamp();

-- Create index
CREATE INDEX IF NOT EXISTS idx_crm_settings_key ON crm_settings(setting_key);

SELECT 'CRM Settings table created with default configurations' as status;
