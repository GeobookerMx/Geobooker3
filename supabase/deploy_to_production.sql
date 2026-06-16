-- ================================================================
-- DEPLOYMENT SCRIPT PARA PRODUCCIÓN
-- Ejecutar COMPLETO en Supabase SQL Editor (producción)
-- Fecha: 2026-01-21
-- ================================================================

-- 1. CREAR TABLA crm_settings (con RLS modificado para acceso público en lectura)
CREATE TABLE IF NOT EXISTS crm_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Lectura pública (necesaria para WhatsAppService sin auth)
DROP POLICY IF EXISTS "Public read access to CRM settings" ON crm_settings;
CREATE POLICY "Public read access to CRM settings"
    ON crm_settings 
    FOR SELECT
    USING (true);

-- Policy: Escritura solo admin (separadas por operación debido a sintaxis RLS)
DROP POLICY IF EXISTS "Admin write access to CRM settings" ON crm_settings;
DROP POLICY IF EXISTS "Admin insert access to CRM settings" ON crm_settings;
DROP POLICY IF EXISTS "Admin update access to CRM settings" ON crm_settings;
DROP POLICY IF EXISTS "Admin delete access to CRM settings" ON crm_settings;

-- INSERT: solo acepta WITH CHECK
CREATE POLICY "Admin insert access to CRM settings"
    ON crm_settings 
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

-- UPDATE: acepta USING y WITH CHECK
CREATE POLICY "Admin update access to CRM settings"
    ON crm_settings 
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

-- DELETE: solo acepta USING
CREATE POLICY "Admin delete access to CRM settings"
    ON crm_settings 
    FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_crm_settings_key ON crm_settings(setting_key);

-- Crear trigger para updated_at
CREATE OR REPLACE FUNCTION update_crm_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_crm_settings_timestamp ON crm_settings;
CREATE TRIGGER update_crm_settings_timestamp
    BEFORE UPDATE ON crm_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_settings_timestamp();

-- 2. INSERTAR CONFIGURACIONES POR DEFECTO
INSERT INTO crm_settings (setting_key, setting_value, description) VALUES
(
    'whatsapp_business',
    '{
        "phone": "525526702368",
        "display_number": "+52 55 2670 2368",
        "default_message": "¡Hola! Te contacto de Geobooker. ¿Cómo podemos ayudarte a crecer tu negocio?"
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
    'email_senders',
    '[
        {
            "name": "Geobooker Ads",
            "email": "hola@geobooker.com.mx",
            "signature": "<div style=\"margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;\"><p><strong>Equipo de Ventas</strong><br>Geobooker - Tu Buscador de Negocios<br>📧 ventasgeobooker@gmail.com<br>📱 WhatsApp: +52 55 2670 2368<br>🌐 <a href=\"https://geobooker.com.mx\">geobooker.com.mx</a></p></div>",
            "use_for": ["default", "commercial", "enterprise", "tier_AAA", "tier_AA", "tier_A", "tier_B"]
        }
    ]'::jsonb,
    'Email sender configurations with signatures'
),
(
    'unsubscribe_settings',
    '{
        "footer_text": "Si no deseas recibir más correos, puedes darte de baja aquí",
        "support_email": "soporte@geobooker.com.mx"
    }'::jsonb,
    'Unsubscribe and compliance settings'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- 3. VERIFICAR TABLAS NECESARIAS
DO $$
BEGIN
    -- Verificar marketing_contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_contacts') THEN
        RAISE NOTICE '❌ FALTA: marketing_contacts - Ejecutar marketing_automation.sql';
    ELSE
        RAISE NOTICE '✅ OK: marketing_contacts existe';
    END IF;

    -- Verificar email_queue
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_queue') THEN
        RAISE NOTICE '❌ FALTA: email_queue - Ejecutar marketing_automation.sql';
    ELSE
        RAISE NOTICE '✅ OK: email_queue existe';
    END IF;

    -- Verificar whatsapp_queue
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_queue') THEN
        RAISE NOTICE '❌ FALTA: whatsapp_queue - Ejecutar marketing_automation.sql';
    ELSE
        RAISE NOTICE '✅ OK: whatsapp_queue existe';
    END IF;

    -- Verificar campaign_history
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_history') THEN
        RAISE NOTICE '❌ FALTA: campaign_history - Ejecutar marketing_automation.sql';
    ELSE
        RAISE NOTICE '✅ OK: campaign_history existe';
    END IF;
END $$;

-- 4. VERIFICAR FUNCIONES RPC
DO $$
BEGIN
    -- Verificar generate_daily_email_queue
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_daily_email_queue') THEN
        RAISE NOTICE '❌ FALTA: generate_daily_email_queue() - Ejecutar generate_email_queue.sql';
    ELSE
        RAISE NOTICE '✅ OK: generate_daily_email_queue() existe';
    END IF;

    -- Verificar generate_whatsapp_queue
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_whatsapp_queue') THEN
        RAISE NOTICE '⚠️ OPCIONAL: generate_whatsapp_queue() - Ejecutar generate_whatsapp_queue.sql';
    ELSE
        RAISE NOTICE '✅ OK: generate_whatsapp_queue() existe';
    END IF;
END $$;

-- 5. MOSTRAR RESULTADO FINAL
SELECT 
    '✅ DEPLOYMENT COMPLETED - crm_settings creado con RLS público para lectura' as status,
    NOW() as executed_at;

-- 6. VERIFICAR CONFIGURACIONES GUARDADAS
SELECT 
    setting_key, 
    setting_value,
    created_at
FROM crm_settings
ORDER BY setting_key;
