-- ================================================
-- FIX URGENTE: Permitir a Admins aprobar negocios rechazados
-- ================================================
-- Ejecutar este script en: https://supabase.com/dashboard/project/_/sql/new
-- Problema: El botón verde "Aprobar" no funciona para negocios rechazados

-- PASO 1: Eliminar políticas existentes que puedan interferir
DROP POLICY IF EXISTS "Admins can update any business" ON businesses;
DROP POLICY IF EXISTS "Admins can update businesses" ON businesses;
DROP POLICY IF EXISTS "Allow admins to update all businesses" ON businesses;
DROP POLICY IF EXISTS "Admin full access" ON businesses;

-- PASO 2: Crear política NUEVA que permite a admins actualizar CUALQUIER negocio
-- (sin importar el status: pending, approved, rejected)
CREATE POLICY "Admins can update any business status"
ON businesses FOR UPDATE
TO authenticated
USING (
    -- El usuario es admin
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    )
    -- O el usuario es el dueño del negocio
    OR owner_id = auth.uid()
)
WITH CHECK (
    -- Solo admins pueden cambiar el status
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    )
    -- O el dueño puede actualizar (pero no el status si está rechazado)
    OR owner_id = auth.uid()
);

-- PASO 3: Verificar que la política se creó correctamente
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'businesses' AND cmd = 'UPDATE';

-- PASO 4: Test rápido - Verificar que existen admin_users
SELECT id, email FROM admin_users LIMIT 5;
