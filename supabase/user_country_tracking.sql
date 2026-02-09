-- ==========================================================
-- TRACKING DE USUARIOS INTERNACIONALES
-- Agregar columnas para país, idioma y dominio de registro
-- ==========================================================

-- 1. Agregar columnas a user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'es',
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS registration_domain VARCHAR(100),
ADD COLUMN IF NOT EXISTS registration_country VARCHAR(50);

-- 2. Crear índice para búsquedas por país/idioma
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_language ON user_profiles(preferred_language);
CREATE INDEX IF NOT EXISTS idx_user_profiles_domain ON user_profiles(registration_domain);

-- 3. Comentarios descriptivos
COMMENT ON COLUMN user_profiles.preferred_language IS 'Idioma preferido del usuario (es, en, zh, ja, ko)';
COMMENT ON COLUMN user_profiles.country_code IS 'Código ISO 2 del país (US, MX, GB, CA, etc)';
COMMENT ON COLUMN user_profiles.registration_domain IS 'Dominio desde donde se registró (geobooker.com o geobooker.com.mx)';
COMMENT ON COLUMN user_profiles.registration_country IS 'País detectado al momento del registro';

-- 4. Función para obtener estadísticas por país
CREATE OR REPLACE FUNCTION get_users_by_country()
RETURNS TABLE (
    country_code VARCHAR(2),
    country_name VARCHAR(50),
    user_count BIGINT,
    percentage NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH total AS (
        SELECT COUNT(*) AS total_users FROM user_profiles WHERE country_code IS NOT NULL
    )
    SELECT 
        up.country_code,
        COALESCE(up.registration_country, 'Unknown') AS country_name,
        COUNT(*) AS user_count,
        ROUND((COUNT(*)::NUMERIC / NULLIF(t.total_users, 0)) * 100, 2) AS percentage
    FROM user_profiles up
    CROSS JOIN total t
    WHERE up.country_code IS NOT NULL
    GROUP BY up.country_code, up.registration_country, t.total_users
    ORDER BY user_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para obtener usuarios internacionales (no México)
CREATE OR REPLACE FUNCTION get_international_users(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    full_name VARCHAR,
    country_code VARCHAR(2),
    registration_domain VARCHAR(100),
    preferred_language VARCHAR(5),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.full_name,
        up.country_code,
        up.registration_domain,
        up.preferred_language,
        up.created_at
    FROM user_profiles up
    WHERE up.country_code IS NOT NULL 
      AND up.country_code != 'MX'
    ORDER BY up.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Vista para dashboard de usuarios por dominio
CREATE OR REPLACE VIEW v_users_by_domain AS
SELECT 
    registration_domain,
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_last_30_days,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS new_last_7_days
FROM user_profiles
WHERE registration_domain IS NOT NULL
GROUP BY registration_domain;

-- Permisos
GRANT EXECUTE ON FUNCTION get_users_by_country() TO authenticated;
GRANT EXECUTE ON FUNCTION get_international_users(INTEGER, INTEGER) TO authenticated;
