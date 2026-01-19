-- ==========================================================
-- FIX SCAN & INVITE - Verify tables and update limits
-- Ejecutar en Supabase SQL Editor
-- ==========================================================

-- 1. Verificar si las tablas existen
SELECT 'scan_runs exists' as status, COUNT(*) as count FROM scan_runs;
SELECT 'scan_leads exists' as status, COUNT(*) as count FROM scan_leads;
SELECT 'scan_lead_contacts exists' as status, COUNT(*) as count FROM scan_lead_contacts;

-- 2. Actualizar límite diario a 10 (para WhatsApp nacional)
UPDATE scan_user_limits SET daily_outreach_limit = 10;

-- 3. Verificar que el admin tiene permisos
SELECT u.email, sul.daily_outreach_limit, sul.can_scan 
FROM scan_user_limits sul 
JOIN auth.users u ON u.id = sul.user_id;

-- 4. Si no hay registro para el admin, crearlo
INSERT INTO scan_user_limits (user_id, daily_outreach_limit, can_scan)
SELECT id, 10, true FROM auth.users WHERE email = 'jpvaness85@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET can_scan = true, daily_outreach_limit = 10;

-- 5. Verificar RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename LIKE 'scan%';
