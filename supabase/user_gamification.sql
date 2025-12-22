-- ==========================================================
-- USER GAMIFICATION & LEVELS SYSTEM
-- Sistema de niveles basado en actividad y referidos
-- ==========================================================

-- 1. Tabla de definición de niveles
CREATE TABLE IF NOT EXISTS user_levels (
    id SERIAL PRIMARY KEY,
    level_number INT UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    name_es VARCHAR(50) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    min_referrals INT NOT NULL DEFAULT 0,
    color VARCHAR(20) NOT NULL DEFAULT 'gray',
    rewards JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar los 5 niveles del sistema
INSERT INTO user_levels (level_number, name, name_es, icon, min_referrals, color, rewards) VALUES
(1, 'Explorer', 'Explorador', '🥉', 0, 'bronze', '{"badge": true}'),
(2, 'Promoter', 'Promotor', '🥈', 3, 'silver', '{"free_ad_days": 7, "badge": true}'),
(3, 'Ambassador', 'Embajador', '🥇', 10, 'gold', '{"free_ad_days": 14, "badge": true, "highlighted": true}'),
(4, 'VIP', 'VIP', '💎', 25, 'diamond', '{"free_ad_days": 30, "premium_days": 30, "badge": true}'),
(5, 'Legend', 'Leyenda', '👑', 50, 'platinum', '{"free_ad_days": 90, "premium_days": 90, "badge": true, "enterprise_access": true}')
ON CONFLICT (level_number) DO UPDATE SET
    name = EXCLUDED.name,
    name_es = EXCLUDED.name_es,
    icon = EXCLUDED.icon,
    min_referrals = EXCLUDED.min_referrals,
    rewards = EXCLUDED.rewards;

-- 2. Agregar campos de gamificación a user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS current_level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_referrals INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level_updated_at TIMESTAMPTZ;

-- 3. Tabla de historial de recompensas otorgadas
CREATE TABLE IF NOT EXISTS user_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_type VARCHAR(50) NOT NULL, -- 'free_ad', 'premium_days', 'badge', 'enterprise_access'
    reward_value JSONB NOT NULL,
    level_earned INT,
    claimed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending', -- pending, claimed, expired
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON user_profiles(current_level);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_status ON user_rewards(status);

-- 5. Función para calcular y actualizar nivel de usuario
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
    new_level INT;
    level_rewards JSONB;
    ref_count INT;
BEGIN
    -- Obtener total de referidos confirmados
    ref_count := COALESCE(NEW.referral_count, 0);
    
    -- Determinar nuevo nivel basado en referidos
    SELECT level_number, rewards INTO new_level, level_rewards
    FROM user_levels
    WHERE min_referrals <= ref_count
    ORDER BY min_referrals DESC
    LIMIT 1;
    
    -- Si subió de nivel
    IF new_level > COALESCE(OLD.current_level, 1) THEN
        -- Actualizar nivel
        NEW.current_level := new_level;
        NEW.total_referrals := ref_count;
        NEW.level_updated_at := NOW();
        
        -- Otorgar recompensas del nuevo nivel
        IF level_rewards ? 'premium_days' THEN
            -- Extender premium
            NEW.premium_until := GREATEST(
                COALESCE(NEW.premium_until, NOW()),
                NOW()
            ) + ((level_rewards->>'premium_days')::INT || ' days')::INTERVAL;
            NEW.is_premium := TRUE;
        END IF;
        
        -- Registrar recompensa de anuncios gratis
        IF level_rewards ? 'free_ad_days' THEN
            INSERT INTO user_rewards (user_id, reward_type, reward_value, level_earned, status)
            VALUES (
                NEW.id,
                'free_ad',
                jsonb_build_object('days', (level_rewards->>'free_ad_days')::INT),
                new_level,
                'pending'
            );
        END IF;
        
        -- Registrar badge
        INSERT INTO user_rewards (user_id, reward_type, reward_value, level_earned, status, claimed_at)
        VALUES (
            NEW.id,
            'badge',
            jsonb_build_object('level', new_level),
            new_level,
            'claimed',
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger para auto-actualizar nivel cuando cambian los referidos
DROP TRIGGER IF EXISTS trigger_update_user_level ON user_profiles;
CREATE TRIGGER trigger_update_user_level
    BEFORE UPDATE OF referral_count ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();

-- 7. Función RPC para obtener info de nivel del usuario
CREATE OR REPLACE FUNCTION get_user_level_info(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    user_data RECORD;
    current_level_data RECORD;
    next_level_data RECORD;
    pending_rewards JSONB;
BEGIN
    -- Info del usuario
    SELECT current_level, total_referrals, referral_count, referral_code
    INTO user_data
    FROM user_profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Info del nivel actual
    SELECT * INTO current_level_data
    FROM user_levels
    WHERE level_number = COALESCE(user_data.current_level, 1);
    
    -- Info del próximo nivel
    SELECT * INTO next_level_data
    FROM user_levels
    WHERE level_number = COALESCE(user_data.current_level, 1) + 1;
    
    -- Recompensas pendientes
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', reward_type,
            'value', reward_value,
            'level', level_earned
        )
    ), '[]'::jsonb)
    INTO pending_rewards
    FROM user_rewards
    WHERE user_id = p_user_id AND status = 'pending';
    
    result := jsonb_build_object(
        'current_level', jsonb_build_object(
            'number', current_level_data.level_number,
            'name', current_level_data.name,
            'name_es', current_level_data.name_es,
            'icon', current_level_data.icon,
            'color', current_level_data.color
        ),
        'next_level', CASE WHEN next_level_data.level_number IS NOT NULL THEN
            jsonb_build_object(
                'number', next_level_data.level_number,
                'name', next_level_data.name,
                'name_es', next_level_data.name_es,
                'icon', next_level_data.icon,
                'min_referrals', next_level_data.min_referrals,
                'rewards', next_level_data.rewards
            )
        ELSE NULL END,
        'referrals', COALESCE(user_data.referral_count, 0),
        'referral_code', user_data.referral_code,
        'progress', CASE 
            WHEN next_level_data.min_referrals IS NOT NULL THEN
                ROUND(
                    (COALESCE(user_data.referral_count, 0) - current_level_data.min_referrals)::NUMERIC / 
                    NULLIF((next_level_data.min_referrals - current_level_data.min_referrals), 0) * 100
                )
            ELSE 100
        END,
        'referrals_needed', CASE 
            WHEN next_level_data.min_referrals IS NOT NULL THEN
                next_level_data.min_referrals - COALESCE(user_data.referral_count, 0)
            ELSE 0
        END,
        'pending_rewards', pending_rewards
    );
    
    RETURN result;
END;
$$;

-- 8. RLS Policies
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- user_levels es lectura pública
CREATE POLICY "user_levels_read" ON user_levels FOR SELECT USING (true);

-- user_rewards solo el usuario puede ver sus propias recompensas
CREATE POLICY "user_rewards_own" ON user_rewards FOR ALL 
    USING (auth.uid() = user_id);

-- 9. Inicializar usuarios existentes en nivel 1
UPDATE user_profiles 
SET current_level = 1, total_referrals = COALESCE(referral_count, 0)
WHERE current_level IS NULL;

-- 10. Grant permisos
GRANT SELECT ON user_levels TO authenticated, anon;
GRANT ALL ON user_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_level_info TO authenticated;
