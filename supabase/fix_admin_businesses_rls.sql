-- ================================================
-- FIX: Permitir a Admins actualizar tabla businesses
-- ================================================
-- Ejecutar este script en Supabase SQL Editor
-- https://app.supabase.com/project/[TU_PROYECTO]/sql/new

-- 1. Crear política para que admins puedan ACTUALIZAR cualquier negocio
CREATE POLICY "Admins can update any business"
ON businesses FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    )
);

-- 2. Crear política para que admins puedan VER todos los negocios
CREATE POLICY "Admins can view all businesses"
ON businesses FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    )
    OR owner_id = auth.uid()
    OR status = 'approved'
);

-- 3. Verificar las políticas creadas
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'businesses';
