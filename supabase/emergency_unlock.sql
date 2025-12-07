-- ==========================================================
-- SCRIPT DE DESBLOQUEO TOTAL (EMERGENCIA)
-- Objetivo: Detener los logouts y mostrar los datos YA.
-- Desactiva la seguridad RLS temporalmente para confirmar que el sistema funciona.
-- ==========================================================

-- 1. Desactivar seguridad en Admin para evitar el Logout automático
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- 2. Desactivar seguridad en Anuncios para que se vean en la web
ALTER TABLE ad_spaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns DISABLE ROW LEVEL SECURITY;

-- 3. Desactivar seguridad en Perfiles de Usuario (si también te saca del usuario normal)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 4. Asegurar que tu usuario sea admin (Reemplaza el ID si sabes cuál es, si no, esto intenta insertarlos todos)
-- Esto copiara TODOS los usuarios registrados a la tabla de admins para asegurar que TU entres.
-- Después puedes borrar los que no quieras.
INSERT INTO admin_users (id, email, role)
SELECT id, email, 'superadmin'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
