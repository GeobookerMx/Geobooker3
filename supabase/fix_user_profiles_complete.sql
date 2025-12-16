-- ======================================
-- FIX COMPLETO user_profiles RLS
-- Ejecutar en Supabase SQL Editor
-- Si sigue fallando, ejecutar en 2 pasos
-- ======================================

-- ========== PASO 1: LIMPIAR TODO ==========

-- Deshabilitar RLS temporalmente
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes
DO $$ 
DECLARE 
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', policy_name);
    END LOOP;
END $$;

-- ========== PASO 2: CREAR POLÍTICAS NUEVAS ==========

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Usuarios autenticados pueden ver SU PROPIO perfil
CREATE POLICY "user_select_own"
ON user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- 2. UPDATE: Usuarios pueden actualizar SU PROPIO perfil
CREATE POLICY "user_update_own"
ON user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. INSERT: Usuarios pueden crear SU PROPIO perfil
CREATE POLICY "user_insert_own"
ON user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- ========== PASO 3: FUNCIÓN RPC PARA DATOS PÚBLICOS ==========

-- Función para obtener is_premium (bypass de RLS)
DROP FUNCTION IF EXISTS get_user_premium_status(UUID);
CREATE OR REPLACE FUNCTION get_user_premium_status(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_premium, false) 
  FROM user_profiles 
  WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Dar permisos a la función
GRANT EXECUTE ON FUNCTION get_user_premium_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_premium_status(UUID) TO anon;

-- ========== VERIFICAR ==========

SELECT 
  '✅ Políticas creadas:' as status;

SELECT 
  policyname AS "Política",
  cmd AS "Acción",
  roles::text AS "Roles"
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Si esto devuelve 3 políticas (user_select_own, user_update_own, user_insert_own)
-- entonces el script funcionó correctamente
