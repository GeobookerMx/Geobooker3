-- DIAGNÓSTICO: Verificar estado de user_profiles
-- Ejecutar en Supabase SQL Editor y compartir resultados

-- 1. Verificar si la tabla existe y su estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Verificar si RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 3. Ver políticas activas
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 4. Verificar si el usuario específico existe
SELECT id, full_name, is_premium 
FROM user_profiles 
WHERE id = '764105e4-9904-4916-84db-73fae6116a15';

-- 5. Contar registros totales
SELECT COUNT(*) as total_records FROM user_profiles;
