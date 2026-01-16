-- ==============================================================================
-- SISTEMA DE PREMIOS CANJEABLES PARA REFERIDOS
-- ==============================================================================
-- Versión: 3.0
-- Fecha: Enero 2026
-- Objetivo: Permitir canjear puntos de referidos por ads gratis segmentados
-- ==============================================================================

-- ============================================
-- 1. TABLA: INVENTARIO DE PUNTOS
-- ============================================

CREATE TABLE IF NOT EXISTS user_rewards_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    
    -- Inventario de puntos
    total_points_earned DECIMAL(10,1) DEFAULT 0,
    points_spent DECIMAL(10,1) DEFAULT 0,
    points_available DECIMAL(10,1) GENERATED ALWAYS AS (total_points_earned - points_spent) STORED,
    
    -- Estadísticas de referidos
    total_referrals_invited INTEGER DEFAULT 0,
    total_referrals_converted INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_referrals_invited > 0 
        THEN ROUND((total_referrals_converted::DECIMAL / total_referrals_invited * 100), 2)
        ELSE 0 END
    ) STORED,
    
    -- Engagement
    last_referral_at TIMESTAMPTZ,
    is_active_referrer BOOLEAN DEFAULT FALSE,
    viral_coefficient DECIMAL(5,2) DEFAULT 0, -- Promedio de referidos por usuario
    monthly_referrals INTEGER DEFAULT 0,
    best_month_referrals INTEGER DEFAULT 0,
    
    -- Tier de referrer
    referrer_tier TEXT DEFAULT 'starter' CHECK (referrer_tier IN ('starter', 'bronze', 'silver', 'gold', 'platinum')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rewards_user ON user_rewards_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_available ON user_rewards_inventory(points_available DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_tier ON user_rewards_inventory(referrer_tier);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON user_rewards_inventory(is_active_referrer) WHERE is_active_referrer = TRUE;

-- Comentarios
COMMENT ON TABLE user_rewards_inventory IS 'Inventario de puntos y stats de cada usuario referrer';
COMMENT ON COLUMN user_rewards_inventory.points_available IS 'Puntos disponibles para canje (calculado automáticamente)';
COMMENT ON COLUMN user_rewards_inventory.viral_coefficient IS 'Promedio de referidos que trae cada usuario';


-- ============================================
-- 2. TABLA: REDENCIONES DE PREMIOS
-- ============================================

CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Premio
    reward_type TEXT NOT NULL CHECK (reward_type IN ('ad_campaign', 'premium_slot', 'geo_targeting', 'sponsored_result', 'carousel')),
    reward_config JSONB NOT NULL,
    points_cost DECIMAL(10,1) NOT NULL,
    
    -- Detalles del ad campaign
    ad_space_type TEXT, -- 'banner', 'sponsored_result', 'carousel', 'header', 'sticky'
    duration_days INTEGER NOT NULL,
    target_city TEXT,
    target_category TEXT,
    business_id UUID REFERENCES businesses(id), -- Negocio al que aplica el ad
    
    -- Estado
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'expired')),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Métricas del ad
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 
        THEN ROUND((clicks::DECIMAL / impressions * 100), 2)
        ELSE 0 END
    ) STORED,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON reward_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_redemptions_active ON reward_redemptions(status, expires_at) 
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_redemptions_business ON reward_redemptions(business_id);

-- Comentarios
COMMENT ON TABLE reward_redemptions IS 'Registro de premios canjeados por puntos de referidos';
COMMENT ON COLUMN reward_redemptions.ctr IS 'Click-through rate del ad (calculado automáticamente)';


-- ============================================
-- 3. SINCRONIZAR DATOS EXISTENTES
-- ============================================

-- Crear inventario para todos los usuarios con referidos
INSERT INTO user_rewards_inventory (user_id, total_points_earned, total_referrals_invited, total_referrals_converted, last_referral_at)
SELECT 
    up.id,
    COALESCE(up.referral_points, 0) as total_points_earned,
    COUNT(r.id) as total_referrals_invited,
    COUNT(r.id) FILTER (WHERE r.status = 'business_added') as total_referrals_converted,
    MAX(r.created_at) as last_referral_at
FROM user_profiles up
LEFT JOIN referrals r ON r.referrer_id = up.id
WHERE up.referral_count > 0 OR up.referral_points > 0
GROUP BY up.id, up.referral_points
ON CONFLICT (user_id) DO UPDATE SET
    total_points_earned = EXCLUDED.total_points_earned,
    total_referrals_invited = EXCLUDED.total_referrals_invited,
    total_referrals_converted = EXCLUDED.total_referrals_converted,
    last_referral_at = EXCLUDED.last_referral_at;


-- ============================================
-- 4. FUNCIÓN: CANJEAR PUNTOS POR AD
-- ============================================

CREATE OR REPLACE FUNCTION redeem_points_for_ad(
    p_user_id UUID,
    p_reward_type TEXT,
    p_duration_days INTEGER,
    p_business_id UUID,
    p_target_city TEXT DEFAULT NULL,
    p_target_category TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_points_cost DECIMAL;
    v_available_points DECIMAL;
    v_redemption_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Calcular costo según duración
    v_points_cost := CASE 
        WHEN p_duration_days <= 7 THEN 3
        WHEN p_duration_days <= 14 THEN 5
        WHEN p_duration_days <= 30 THEN 10
        WHEN p_duration_days <= 60 THEN 20
        ELSE 50
    END;
    
    -- Bonus por geo-targeting (más caro si es segmentado)
    IF p_target_city IS NOT NULL OR p_target_category IS NOT NULL THEN
        v_points_cost := v_points_cost + 2;
    END IF;
    
    -- Verificar puntos disponibles
    SELECT points_available INTO v_available_points
    FROM user_rewards_inventory
    WHERE user_id = p_user_id;
    
    IF v_available_points IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found in rewards inventory'
        );
    END IF;
    
    IF v_available_points < v_points_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient points',
            'required', v_points_cost,
            'available', v_available_points
        );
    END IF;
    
    -- Verificar que el negocio pertenece al usuario
    IF NOT EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = p_business_id 
        AND owner_id = p_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Business not owned by user'
        );
    END IF;
    
    -- Calcular fecha de expiración
    v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
    
    -- Crear redemption
    INSERT INTO reward_redemptions (
        user_id, reward_type, reward_config, points_cost,
        ad_space_type, duration_days, target_city, target_category,
        business_id, status, activated_at, expires_at
    ) VALUES (
        p_user_id, p_reward_type,
        jsonb_build_object(
            'duration', p_duration_days, 
            'city', p_target_city, 
            'category', p_target_category,
            'business_id', p_business_id
        ),
        v_points_cost, p_reward_type, p_duration_days, 
        p_target_city, p_target_category, p_business_id,
        'active', NOW(), v_expires_at
    ) RETURNING id INTO v_redemption_id;
    
    -- Descontar puntos
    UPDATE user_rewards_inventory
    SET points_spent = points_spent + v_points_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'points_spent', v_points_cost,
        'remaining_points', v_available_points - v_points_cost,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION redeem_points_for_ad TO authenticated;


-- ============================================
-- 5. FUNCIÓN: OBTENER MÉTRICAS AVANZADAS
-- ============================================

CREATE OR REPLACE FUNCTION get_referral_advanced_metrics(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_metrics JSONB;
    v_inventory RECORD;
BEGIN
    -- Obtener inventario
    SELECT * INTO v_inventory
    FROM user_rewards_inventory
    WHERE user_id = p_user_id;
    
    -- Si no tiene inventario, retornar vacío
    IF v_inventory IS NULL THEN
        RETURN jsonb_build_object(
            'has_referrals', false,
            'points_available', 0
        );
    END IF;
    
    -- Calcular métricas de referidos
    SELECT jsonb_build_object(
        'has_referrals', true,
        'points_available', v_inventory.points_available,
        'total_earned', v_inventory.total_points_earned,
        'total_spent', v_inventory.points_spent,
        'total_invited', COUNT(*),
        'total_converted', COUNT(*) FILTER (WHERE status = 'business_added'),
        'conversion_rate', ROUND(
            COUNT(*) FILTER (WHERE status = 'business_added')::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 2
        ),
        'avg_time_to_convert_days', ROUND(AVG(
            EXTRACT(EPOCH FROM (converted_at - created_at)) / 86400
        ) FILTER (WHERE converted_at IS NOT NULL), 1),
        'this_month', COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())),
        'last_referral_days_ago', EXTRACT(DAY FROM NOW() - MAX(created_at))::INTEGER,
        'referrer_tier', v_inventory.referrer_tier,
        'is_active', v_inventory.is_active_referrer,
        'viral_coefficient', v_inventory.viral_coefficient
    ) INTO v_metrics
    FROM referrals
    WHERE referrer_id = p_user_id;
    
    RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION get_referral_advanced_metrics TO authenticated;


-- ============================================
-- 6. FUNCIÓN: ACTUALIZAR TIER DE REFERRER
-- ============================================

CREATE OR REPLACE FUNCTION update_referrer_tier()
RETURNS TRIGGER AS $$
DECLARE
    v_new_tier TEXT;
BEGIN
    -- Determinar tier según puntos totales ganados
    v_new_tier := CASE 
        WHEN NEW.total_points_earned >= 50 THEN 'platinum'
        WHEN NEW.total_points_earned >= 20 THEN 'gold'
        WHEN NEW.total_points_earned >= 10 THEN 'silver'
        WHEN NEW.total_points_earned >= 5 THEN 'bronze'
        ELSE 'starter'
    END;
    
    -- Actualizar tier
    NEW.referrer_tier := v_new_tier;
    
    -- Actualizar flag de activo (referido en últimos 30 días)
    NEW.is_active_referrer := (NEW.last_referral_at >= NOW() - INTERVAL '30 days');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_referrer_tier ON user_rewards_inventory;
CREATE TRIGGER trigger_update_referrer_tier
    BEFORE UPDATE OF total_points_earned, last_referral_at ON user_rewards_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_referrer_tier();


-- ============================================
-- 7. TRIGGER: SINCRONIZAR PUNTOS AL CREAR REFERIDO
-- ============================================

CREATE OR REPLACE FUNCTION sync_referral_to_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar o actualizar inventario
    INSERT INTO user_rewards_inventory (
        user_id, 
        total_points_earned,
        total_referrals_invited,
        last_referral_at
    ) VALUES (
        NEW.referrer_id,
        0.5, -- +0.5 por signup
        1,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_points_earned = user_rewards_inventory.total_points_earned + 0.5,
        total_referrals_invited = user_rewards_inventory.total_referrals_invited + 1,
        last_referral_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_referral_signup ON referrals;
CREATE TRIGGER trigger_sync_referral_signup
    AFTER INSERT ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION sync_referral_to_inventory();


-- ============================================
-- 8. TRIGGER: BONUS AL CONVERTIR (AGREGAR NEGOCIO)
-- ============================================

CREATE OR REPLACE FUNCTION sync_referral_conversion_to_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si cambió a 'business_added'
    IF NEW.status = 'business_added' AND OLD.status != 'business_added' THEN
        UPDATE user_rewards_inventory
        SET total_points_earned = total_points_earned + 0.5,
            total_referrals_converted = total_referrals_converted + 1,
            updated_at = NOW()
        WHERE user_id = NEW.referrer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_referral_conversion ON referrals;
CREATE TRIGGER trigger_sync_referral_conversion
    AFTER UPDATE OF status ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION sync_referral_conversion_to_inventory();


-- ============================================
-- 9. VISTA: LEADERBOARD DE REFERRERS
-- ============================================

CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT 
    uri.user_id,
    up.full_name,
    uri.total_points_earned,
    uri.points_available,
    uri.total_referrals_invited,
    uri.total_referrals_converted,
    uri.conversion_rate,
    uri.referrer_tier,
    uri.is_active_referrer,
    RANK() OVER (ORDER BY uri.total_points_earned DESC) as rank,
    RANK() OVER (
        PARTITION BY DATE_TRUNC('month', uri.last_referral_at)
        ORDER BY uri.monthly_referrals DESC
    ) as monthly_rank
FROM user_rewards_inventory uri
JOIN user_profiles up ON up.id = uri.user_id
WHERE uri.total_referrals_invited > 0
ORDER BY uri.total_points_earned DESC;


-- ============================================
-- 10. VISTA: ADS ACTIVOS POR PREMIOS
-- ============================================

CREATE OR REPLACE VIEW active_reward_campaigns AS
SELECT 
    rr.id,
    rr.user_id,
    up.full_name as user_name,
    b.name as business_name,
    rr.reward_type,
    rr.duration_days,
    rr.target_city,
    rr.target_category,
    rr.points_cost,
    rr.impressions,
    rr.clicks,
    rr.ctr,
    rr.activated_at,
    rr.expires_at,
    EXTRACT(DAY FROM (rr.expires_at - NOW()))::INTEGER as days_remaining
FROM reward_redemptions rr
JOIN user_profiles up ON up.id = rr.user_id
JOIN businesses b ON b.id = rr.business_id
WHERE rr.status = 'active'
AND rr.expires_at > NOW()
ORDER BY rr.expires_at ASC;


-- ============================================
-- 11. CRON JOB: EXPIRAR ADS AUTOMÁTICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION expire_reward_campaigns()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    -- Marcar como expirados los ads cuya fecha ya pasó
    UPDATE reward_redemptions
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
    AND expires_at <= NOW();
    
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    
    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- Nota: Configurar cron job en Supabase o llamar desde Netlify Function diario


-- ============================================
-- 12. PERMISOS RLS (ROW LEVEL SECURITY)
-- ============================================

-- RLS para user_rewards_inventory
ALTER TABLE user_rewards_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory"
ON user_rewards_inventory FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
ON user_rewards_inventory FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS para reward_redemptions
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions"
ON reward_redemptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create redemptions"
ON reward_redemptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- ============================================
-- RESUMEN DEL SISTEMA
-- ============================================

-- TABLAS NUEVAS:
-- 1. user_rewards_inventory → Inventario de puntos por usuario
-- 2. reward_redemptions → Registro de premios canjeados

-- FUNCIONES:
-- 1. redeem_points_for_ad() → Canjear puntos por ad
-- 2. get_referral_advanced_metrics() → Obtener métricas detalladas
-- 3. update_referrer_tier() → Actualizar tier automáticamente
-- 4. sync_referral_to_inventory() → Sincronizar puntos al crear referido
-- 5. expire_reward_campaigns() → Expirar ads vencidos

-- VISTAS:
-- 1. referral_leaderboard → Ranking de top referrers
-- 2. active_reward_campaigns → Ads activos por premios

-- TRIGGERS:
-- 1. Al crear referido → +0.5 puntos
-- 2. Al convertir referido → +0.5 puntos adicionales
-- 3. Al cambiar puntos → Actualizar tier automáticamente
