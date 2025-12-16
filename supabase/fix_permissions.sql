-- ==========================================================
-- SCRIPT DE EMERGENCIA: REPARACIÓN DE PERMISOS (RLS)
-- Ejecuta esto para que los datos sean visibles.
-- ==========================================================

-- 1. PUBLICIDAD: Permitir que TODOS vean los espacios publicitarios (Soluciona página en blanco)
ALTER TABLE ad_spaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Ad Spaces" ON ad_spaces;
CREATE POLICY "Public Read Ad Spaces" ON ad_spaces FOR SELECT USING (true);

-- 2. CAMPAÑAS: Permitir ver campañas (Soluciona que no se vean los anuncios)
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Active Campaigns" ON ad_campaigns;
CREATE POLICY "Public Read Active Campaigns" ON ad_campaigns FOR SELECT USING (true); -- Ojo: status='active' en prod

-- 3. ADMIN: Permitir que los admins se lean a sí mismos (Soluciona Login Admin)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Self Read" ON admin_users;
CREATE POLICY "Admin Self Read" ON admin_users FOR SELECT USING (auth.uid() = id);

-- 4. INSERTAR TU USUARIO COMO ADMIN (Si no existe)
-- Inserta automáticamente al usuario autenticado actual como admin si ejecuta esto desde la consola SQL de Supabase
-- NOTA: Esto solo funciona si ya existe en auth.users.
-- Si esto falla, ignóralo, lo importante son las políticas de arriba.
-- 4. INSERTAR TU USUARIO COMO ADMIN (SEGURO)
-- Solo inserta si el email coincide con los administradores reales
INSERT INTO admin_users (id, email, role)
SELECT id, email, 'superadmin'
FROM auth.users
WHERE email IN ('juan.pablo.pg@hotmail.com', 'jpvaness85@gmail.com')
ON CONFLICT (id) DO NOTHING;
