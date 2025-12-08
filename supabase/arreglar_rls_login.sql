-- =============================================
-- EMERGENCIA: ARREGLAR RLS PARA LOGIN
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- PASO 1: Ver estado de RLS en tablas críticas
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'subscription_plans', 'businesses', 'ad_campaigns', 'ad_spaces', 'stripe_prices')
ORDER BY tablename;

-- PASO 2: Ver políticas actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- PASO 3: Asegurar políticas de lectura pública para tablas necesarias

-- subscription_plans - lectura pública
DROP POLICY IF EXISTS "Public read subscription_plans" ON subscription_plans;
CREATE POLICY "Public read subscription_plans" ON subscription_plans
  FOR SELECT USING (true);

-- stripe_prices - lectura pública
DROP POLICY IF EXISTS "Public read stripe_prices" ON stripe_prices;
CREATE POLICY "Public read stripe_prices" ON stripe_prices
  FOR SELECT USING (true);

-- ad_spaces - lectura pública
DROP POLICY IF EXISTS "Public Read Ad Spaces" ON ad_spaces;
CREATE POLICY "Public Read Ad Spaces" ON ad_spaces
  FOR SELECT USING (true);

-- user_profiles - usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
CREATE POLICY "Users view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- user_profiles - usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_profiles - insertar perfil al registrarse
DROP POLICY IF EXISTS "Users insert own profile" ON user_profiles;
CREATE POLICY "Users insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- PASO 4: Si aún no funciona, deshabilitar temporalmente RLS (SOLO PARA DEBUG)
-- ⚠️ DESCOMENTAR SOLO SI ES NECESARIO
-- ALTER TABLE subscription_plans DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE stripe_prices DISABLE ROW LEVEL SECURITY;

-- PASO 5: Verificar que las políticas se crearon
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'subscription_plans', 'stripe_prices', 'ad_spaces')
ORDER BY tablename, policyname;
