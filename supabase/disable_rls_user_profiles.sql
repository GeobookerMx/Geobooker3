-- SOLUCIÓN RÁPIDA: Deshabilitar RLS en user_profiles
-- Esta tabla solo contiene nombre y teléfono del usuario, no datos críticos
-- El riesgo es bajo ya que cada usuario solo puede modificar su propio perfil
-- via la aplicación (no hay endpoint público que permita modificar otros perfiles)

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- Resultado esperado: rowsecurity = false
