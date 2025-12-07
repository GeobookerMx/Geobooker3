-- ========================================
-- CREAR ADMIN SIMPLE - Sin necesidad de UUID manual
-- ========================================

-- PASO 1: Primero ve a Supabase Dashboard
-- Authentication → Users → "Add user"
-- Email: admin@geobooker.com
-- Password: Admin123!
-- ✅ Marca "Auto Confirm User"
-- Click "Create user"

-- PASO 2: Ejecuta ESTE script (reemplaza solo el email)
INSERT INTO admin_users (id, email, role)
SELECT 
  id,
  email,
  'super_admin'
FROM auth.users
WHERE email = 'admin@geobooker.com'  -- ✅ Usa el email que creaste arriba
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  updated_at = NOW();

-- Verificar que funcionó
SELECT 
  u.email,
  a.role,
  a.created_at
FROM auth.users u
JOIN admin_users a ON u.id = a.id
WHERE u.email = 'admin@geobooker.com';

-- ✅ Si ves 1 fila con email y role='super_admin', ¡listo!
