-- ======================================
-- FIX user_profiles RLS - VERSIÓN SEGURA
-- Ejecutar en Supabase SQL Editor
-- ======================================

-- 1. Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar TODAS las políticas existentes (evitar conflictos)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Public read for basic profile info" ON user_profiles;
DROP POLICY IF EXISTS "profile_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "profile_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "profile_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;

-- 3. Política SELECT: Usuarios autenticados ven su propio perfil
CREATE POLICY "user_profiles_select_own"
ON user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- 4. Política UPDATE: Usuarios actualizan solo su propio perfil
CREATE POLICY "user_profiles_update_own"
ON user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Política INSERT: Usuarios pueden crear su propio perfil (al registrarse)
CREATE POLICY "user_profiles_insert_own"
ON user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- 6. Función RPC segura para obtener is_premium de cualquier usuario
-- (Necesario para mostrar estrellas en negocios premium del mapa)
CREATE OR REPLACE FUNCTION get_user_premium_status(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_premium, false) 
  FROM user_profiles 
  WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 7. Permisos para la función RPC
GRANT EXECUTE ON FUNCTION get_user_premium_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_premium_status(UUID) TO anon;

-- 8. Verificar que las políticas se crearon correctamente
SELECT 
  policyname AS "Política",
  cmd AS "Acción",
  roles AS "Roles"
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;
