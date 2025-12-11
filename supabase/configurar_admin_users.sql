-- ============================================
-- SCRIPT: Configurar Admin Users Correctamente
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- PASO 1: Ver quién está actualmente como admin
SELECT * FROM admin_users;

-- PASO 2: Limpiar la tabla (eliminar todos los admins actuales)
-- ⚠️ CUIDADO: Esto borra TODOS los admins
-- DELETE FROM admin_users;

-- PASO 3: Agregar solo el admin correcto
-- Reemplaza 'TU_USER_ID' con tu ID real de Supabase

-- Primero, encuentra tu ID con tu email:
-- SELECT id, email FROM auth.users WHERE email = 'tu@email.com';

-- ============================================
-- QUERIES ÚTILES PARA VERIFICAR
-- ============================================

-- Ver todos los usuarios registrados (desde auth.users)
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Ver user_profiles con email (haciendo JOIN con auth.users)
SELECT 
  up.id, 
  au.email,
  up.full_name, 
  up.is_premium, 
  up.created_at 
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
ORDER BY up.created_at DESC;

-- Ver negocios por usuario
SELECT 
  au.email,
  COUNT(b.id) as num_negocios
FROM auth.users au
LEFT JOIN businesses b ON b.owner_id = au.id
GROUP BY au.id, au.email
ORDER BY num_negocios DESC;

-- Ver admins con sus emails
SELECT 
  a.*,
  au.email
FROM admin_users a
LEFT JOIN auth.users au ON au.id = a.id;

-- ============================================
-- ESTRUCTURA RECOMENDADA PARA admin_users
-- ============================================

-- Si necesitas recrear la tabla:
/*
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver la tabla
CREATE POLICY "Solo admins pueden ver admins"
ON admin_users FOR SELECT
TO authenticated
USING (auth.uid() = id);
*/

