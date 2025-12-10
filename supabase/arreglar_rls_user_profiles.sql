-- Script para arreglar RLS de user_profiles que causa error 406
-- Ejecutar en Supabase SQL Editor

-- El error 406 generalmente significa que RLS está bloqueando la consulta
-- Verificar políticas actuales
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Asegurar que RLS esté habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes que pueden estar mal configuradas
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Public read for basic profile info" ON user_profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON user_profiles;

-- Crear políticas correctas
-- 1. Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 3. Permitir inserción para usuarios autenticados (para crear su perfil)
CREATE POLICY "Allow insert for authenticated users"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 4. Lectura pública de info básica (para mostrar nombres en reviews, etc.)
CREATE POLICY "Public read for basic profile info"
ON user_profiles
FOR SELECT
TO anon
USING (true);

-- Verificar que las políticas se crearon
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'user_profiles';
