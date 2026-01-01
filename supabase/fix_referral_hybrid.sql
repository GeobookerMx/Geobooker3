-- ==============================================================================
-- CORRECCIÓN Y MEJORA DEL SISTEMA DE REFERIDOS
-- ==============================================================================
-- Versión: 2.0
-- Fecha: Enero 2026
-- Cambios:
--   1. Corregir bug "nivel máximo" cuando current_level es NULL
--   2. Sistema híbrido: +0.5 por login, +0.5 por agregar negocio
-- ==============================================================================

-- 1. CORREGIR BUG: Usuarios con current_level NULL
-- Esto causa que next_level sea NULL y muestre "Nivel máximo alcanzado"
UPDATE user_profiles 
SET current_level = 1 
WHERE current_level IS NULL;

-- Verificar corrección
SELECT id, full_name, current_level, referral_count, referral_code 
FROM user_profiles 
WHERE current_level IS NULL
LIMIT 5;


-- 2. MODIFICAR TABLA: Agregar campo para puntos fraccionarios
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_points DECIMAL(10,1) DEFAULT 0;

-- Comentario
COMMENT ON COLUMN user_profiles.referral_points IS 'Puntos de referidos: +0.5 por login, +0.5 por agregar negocio. Nivel sube con puntos enteros.';


-- 3. NUEVA FUNCIÓN: Procesar referido cuando hace LOGIN (da +0.5)
CREATE OR REPLACE FUNCTION process_referral_login(
    p_referred_id UUID,
    p_referral_code TEXT
) RETURNS JSONB AS $$
DECLARE
    v_referrer_id UUID;
    v_existing_referral UUID;
    v_result JSONB;
BEGIN
    -- Validar código
    IF p_referral_code IS NULL OR p_referral_code = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'No referral code');
    END IF;

    -- Buscar referidor
    SELECT id INTO v_referrer_id
    FROM user_profiles
    WHERE referral_code = UPPER(TRIM(p_referral_code));
    
    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid code');
    END IF;
    
    -- No auto-referidos
    IF v_referrer_id = p_referred_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot self-refer');
    END IF;
    
    -- Verificar si ya existe el referido
    SELECT id INTO v_existing_referral
    FROM referrals
    WHERE referred_id = p_referred_id;
    
    IF v_existing_referral IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already referred');
    END IF;
    
    -- Marcar al usuario referido
    UPDATE user_profiles
    SET referred_by = UPPER(TRIM(p_referral_code))
    WHERE id = p_referred_id AND referred_by IS NULL;
    
    -- Crear registro de referido
    INSERT INTO referrals (referrer_id, referred_id, referral_code, status, notes)
    VALUES (v_referrer_id, p_referred_id, UPPER(TRIM(p_referral_code)), 'signed_up', 'Login bonus +0.5');
    
    -- DAR +0.5 PUNTOS AL REFERIDOR (solo por login)
    UPDATE user_profiles
    SET referral_points = COALESCE(referral_points, 0) + 0.5,
        referral_count = FLOOR(COALESCE(referral_points, 0) + 0.5) -- Actualiza count con puntos enteros
    WHERE id = v_referrer_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', '+0.5 points for referrer (login)',
        'referrer_id', v_referrer_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. MODIFICAR: Cuando referido agrega negocio, dar +0.5 adicional
CREATE OR REPLACE FUNCTION reward_referrer_business_added(p_referred_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_referrer_id UUID;
    v_referral_id UUID;
    v_current_status TEXT;
BEGIN
    -- Buscar el referido
    SELECT id, referrer_id, status INTO v_referral_id, v_referrer_id, v_current_status
    FROM referrals
    WHERE referred_id = p_referred_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No referral found');
    END IF;
    
    -- Si ya dio el bonus de negocio, no repetir
    IF v_current_status = 'business_added' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already rewarded');
    END IF;
    
    -- Actualizar estado del referido
    UPDATE referrals
    SET status = 'business_added', 
        converted_at = NOW(),
        reward_given = true,
        notes = COALESCE(notes, '') || ' | Business bonus +0.5'
    WHERE id = v_referral_id;
    
    -- DAR +0.5 PUNTOS ADICIONALES (por agregar negocio)
    UPDATE user_profiles
    SET referral_points = COALESCE(referral_points, 0) + 0.5,
        referral_count = FLOOR(COALESCE(referral_points, 0) + 0.5)
    WHERE id = v_referrer_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', '+0.5 points for referrer (business added)',
        'referrer_id', v_referrer_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. ACTUALIZAR función de nivel para usar referral_points
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
    new_level INT;
    level_rewards JSONB;
    ref_points DECIMAL;
BEGIN
    -- Usar puntos de referidos (pueden ser fraccionarios)
    ref_points := COALESCE(NEW.referral_points, 0);
    
    -- Sync referral_count con puntos enteros
    NEW.referral_count := FLOOR(ref_points);
    
    -- Determinar nuevo nivel basado en puntos enteros
    SELECT level_number, rewards INTO new_level, level_rewards
    FROM user_levels
    WHERE min_referrals <= NEW.referral_count
    ORDER BY min_referrals DESC
    LIMIT 1;
    
    -- Si no hay nivel, default a 1
    IF new_level IS NULL THEN
        new_level := 1;
    END IF;
    
    -- Si subió de nivel
    IF new_level > COALESCE(OLD.current_level, 1) THEN
        NEW.current_level := new_level;
        NEW.level_updated_at := NOW();
        
        -- Otorgar recompensas del nuevo nivel
        IF level_rewards ? 'premium_days' THEN
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


-- 6. Recrear trigger para que use referral_points
DROP TRIGGER IF EXISTS trigger_update_user_level ON user_profiles;
CREATE TRIGGER trigger_update_user_level
    BEFORE UPDATE OF referral_points ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();


-- 7. Sincronizar puntos existentes
-- Los usuarios que ya tenían referidos mantienen sus puntos (1 punto = 1 referido completo)
UPDATE user_profiles
SET referral_points = COALESCE(referral_count, 0)::DECIMAL
WHERE referral_points IS NULL OR referral_points = 0;


-- 8. Permisos
GRANT EXECUTE ON FUNCTION process_referral_login TO authenticated;
GRANT EXECUTE ON FUNCTION reward_referrer_business_added TO authenticated;


-- ==============================================================================
-- RESUMEN DEL SISTEMA HÍBRIDO:
-- ==============================================================================
-- 1. Usuario comparte código por WhatsApp
-- 2. Cuando referido hace LOGIN con código: +0.5 puntos
-- 3. Cuando referido AGREGA NEGOCIO: +0.5 puntos adicionales
-- 4. Total por referido completo: 1 punto
-- 5. Niveles se basan en puntos ENTEROS (FLOOR de referral_points)
--
-- Ejemplo:
--   - 2 referidos hacen login: 1.0 puntos → Nivel 1
--   - 1 de ellos agrega negocio: 1.5 puntos → Nivel 1 (necesita 3 para nivel 2)
--   - 6 referidos hacen login + negocio: 6.0 puntos → Nivel 2 (Promotor)
-- ==============================================================================
