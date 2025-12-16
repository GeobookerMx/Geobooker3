-- ==========================================================
-- FUNCIÓN RPC: Obtener usuarios con emails para admins
-- ==========================================================
-- Esta función permite a los administradores ver los emails
-- de los usuarios sin exponerlos públicamente.

-- 1. Crear la función que combina datos de auth.users y user_profiles
CREATE OR REPLACE FUNCTION get_users_for_admin()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    is_premium BOOLEAN,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del definidor (puede leer auth.users)
AS $$
BEGIN
    -- Verificar que el usuario actual es admin
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()) THEN
        RAISE EXCEPTION 'No autorizado: Solo administradores pueden ejecutar esta función';
    END IF;
    
    -- Retornar usuarios combinando auth.users y user_profiles
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        COALESCE(up.full_name, '')::TEXT as full_name,
        COALESCE(up.phone, '')::TEXT as phone,
        COALESCE(up.is_premium, false) as is_premium,
        au.created_at,
        au.last_sign_in_at,
        COALESCE(up.avatar_url, '')::TEXT as avatar_url
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.id
    ORDER BY au.created_at DESC;
END;
$$;

-- 2. Dar permisos para que usuarios autenticados puedan llamar la función
GRANT EXECUTE ON FUNCTION get_users_for_admin() TO authenticated;

-- 3. Verificar que funciona (solo para testing)
-- SELECT * FROM get_users_for_admin();
