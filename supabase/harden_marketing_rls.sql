-- ==========================================================
-- BLINDAJE DE SEGURIDAD: MÓDULO DE MARKETING
-- GEOBOOKER - PROTECCIÓN DE DATOS DE CONTACTOS (PII)
-- ==========================================================
-- Este script habilita RLS en las tablas de marketing y 
-- restringe el acceso exclusivamente a administradores.
-- ==========================================================

-- 1. Habilitar RLS en tablas críticas
ALTER TABLE marketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_config ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas antiguas (por si acaso)
DROP POLICY IF EXISTS "Admin only access marketing_contacts" ON marketing_contacts;
DROP POLICY IF EXISTS "Admin only access email_queue" ON email_queue;
DROP POLICY IF EXISTS "Admin only access whatsapp_queue" ON whatsapp_queue;
DROP POLICY IF EXISTS "Admin only access campaign_history" ON campaign_history;
DROP POLICY IF EXISTS "Admin only access email_templates" ON email_templates;
DROP POLICY IF EXISTS "Admin only access automation_config" ON automation_config;

-- 3. Crear políticas restrictivas para ADMINISTRADORES
-- Nota: La función is_admin() ya está definida y es segura.

-- Contactos de Marketing
CREATE POLICY "Admin only access marketing_contacts"
ON marketing_contacts FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Cola de Emails
CREATE POLICY "Admin only access email_queue"
ON email_queue FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Cola de WhatsApp
CREATE POLICY "Admin only access whatsapp_queue"
ON whatsapp_queue FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Historial de Campañas
CREATE POLICY "Admin only access campaign_history"
ON campaign_history FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Plantillas de Email
CREATE POLICY "Admin only access email_templates"
ON email_templates FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Configuración de Automatización
CREATE POLICY "Admin only access automation_config"
ON automation_config FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 4. VERIFICACIÓN
SELECT 
    tablename, 
    rowsecurity as "RLS Activo"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('marketing_contacts', 'email_queue', 'whatsapp_queue', 'campaign_history', 'email_templates', 'automation_config')
ORDER BY tablename;

-- ==========================================================
-- ✅ MÓDULO DE MARKETING BLINDADO CORRECTAMENTE
-- ==========================================================
