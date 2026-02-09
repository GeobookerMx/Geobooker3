-- ==========================================================
-- POLÍTICAS RLS SEGURAS PARA GEOBOOKER (VERSIÓN CORREGIDA)
-- ==========================================================
-- Ejecutar en Supabase SQL Editor
-- Corregido: ad_campaigns usa advertiser_email, no user_id
-- ==========================================================

-- ==========================================================
-- 1. FUNCIÓN HELPER: Verificar si es admin
-- ==========================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- 2. POLÍTICAS PARA AD_CAMPAIGNS
-- (Nota: Esta tabla usa advertiser_email, NO user_id)
-- ==========================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view own campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Users can create campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Admins full access" ON ad_campaigns;
DROP POLICY IF EXISTS "Public can view active campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Users view own campaigns by email" ON ad_campaigns;
DROP POLICY IF EXISTS "Admins full access campaigns" ON ad_campaigns;

-- Campañas activas son públicas (para mostrar anuncios)
CREATE POLICY "Public can view active campaigns"
    ON ad_campaigns FOR SELECT
    TO public
    USING (status = 'active');

-- Usuarios autenticados pueden crear campañas
CREATE POLICY "Authenticated users can create campaigns"
    ON ad_campaigns FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Usuarios pueden ver sus propias campañas (por email)
CREATE POLICY "Users view own campaigns by email"
    ON ad_campaigns FOR SELECT
    TO authenticated
    USING (
        advertiser_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Admins pueden hacer todo
CREATE POLICY "Admins full access campaigns"
    ON ad_campaigns FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ==========================================================
-- 3. POLÍTICAS PARA STORAGE (AD-CREATIVES)
-- ==========================================================

-- Asegurar bucket existe y es público
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-creatives', 'ad-creatives', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Eliminar políticas antiguas de storage
DROP POLICY IF EXISTS "Public read ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Auth users manage ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete ad creatives" ON storage.objects;

-- Lectura pública (para mostrar anuncios)
CREATE POLICY "Public read ad creatives"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'ad-creatives');

-- Upload para usuarios autenticados
CREATE POLICY "Auth users upload ad creatives"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'ad-creatives');

-- Update para usuarios autenticados
CREATE POLICY "Auth users manage ad creatives"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'ad-creatives');

-- Delete para usuarios autenticados
CREATE POLICY "Auth users delete ad creatives"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'ad-creatives');

-- ==========================================================
-- 4. POLÍTICAS PARA USER_PROFILES
-- ==========================================================

-- Asegurar que RLS está habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Usuario puede ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Usuario puede actualizar su propio perfil
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON user_profiles FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- ==========================================================
-- 5. POLÍTICAS PARA BUSINESSES
-- ==========================================================

-- Asegurar que RLS está habilitado
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Owners can view own businesses" ON businesses;
DROP POLICY IF EXISTS "Public can view approved businesses" ON businesses;

-- Dueño puede ver sus negocios
CREATE POLICY "Owners can view own businesses"
    ON businesses FOR SELECT
    USING (auth.uid() = owner_id);

-- Público puede ver negocios aprobados y visibles
CREATE POLICY "Public can view approved businesses"
    ON businesses FOR SELECT
    USING (status = 'approved' AND is_visible = true);

-- ==========================================================
-- 6. VERIFICACIÓN
-- ==========================================================

-- Ver estado de RLS
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('ad_campaigns', 'user_profiles', 'businesses', 'user_recommendations')
ORDER BY tablename;

-- Ver políticas de ad_campaigns
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'ad_campaigns'
ORDER BY policyname;

-- Ver bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'ad-creatives';

-- ==========================================================
-- ✅ LISTO - Políticas seguras aplicadas
-- ==========================================================
