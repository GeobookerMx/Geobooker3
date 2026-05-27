-- [ignoring loop detection]
-- SOLUCIÓN AL ERROR DE RECURSIÓN EN admin_users RLS
-- Ejecuta este script en el editor SQL de Supabase para resolver el bucle infinito en todos los dispositivos.

-- 1. Eliminar políticas antiguas recursivas
DROP POLICY IF EXISTS "Admin users can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Only super admins can insert admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can insert admin users" ON admin_users;
DROP POLICY IF EXISTS "Anyone authenticated can view admin users" ON admin_users;

-- 2. Crear políticas nuevas ultra-eficientes y libres de recursión
-- 'auth.uid() IS NOT NULL' previene cualquier subconsulta recursiva en la misma tabla admin_users.
CREATE POLICY "Anyone authenticated can view admin users"
  ON admin_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can insert admin users"
  ON admin_users FOR INSERT
  WITH CHECK (
    COALESCE(
      (SELECT role FROM admin_users WHERE id = auth.uid()),
      'admin'
    ) = 'super_admin'
  );

-- Habilitar RLS de forma segura
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
