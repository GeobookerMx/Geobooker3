-- ==========================================================
-- CORRECCIÓN DE PERMISOS ADMIN (IS_ADMIN)
-- Permite que tanto user_profiles (is_admin=true) como
-- admin_users (tabla de auth admin) tengan acceso.
-- ==========================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- 1. Verificar en tabla admin_users (usada por DashboardLayout)
    IF EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Verificar en tabla user_profiles (usada por RLS antiguo)
    IF EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para auditoría
COMMENT ON FUNCTION is_admin() IS 'Verifica permisos de admin consultando admin_users y user_profiles.is_admin';

-- Re-aplicar permisos mínimos necesarios
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO service_role;
