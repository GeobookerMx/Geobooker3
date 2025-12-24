-- ==========================================================
-- REFERRAL AD REWARDS SYSTEM
-- Rewards users with free advertising based on referral count
-- Ad reward activates NEXT MONTH after goal, lasts 1 MONTH
-- ==========================================================

-- 1. Create referral reward levels table
CREATE TABLE IF NOT EXISTS referral_reward_levels (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    icon TEXT,
    required_referrals INTEGER NOT NULL,
    ad_scope TEXT NOT NULL, -- 'city', 'state', 'country', 'global'
    ad_space_types TEXT[] DEFAULT ARRAY['sponsored_results'], -- allowed ad space types
    ad_duration_days INTEGER DEFAULT 30,
    description TEXT,
    description_en TEXT
);

-- 2. Insert default levels
INSERT INTO referral_reward_levels (name, name_en, icon, required_referrals, ad_scope, ad_space_types, description, description_en)
VALUES 
    ('Bronce', 'Bronze', '🥉', 3, 'city', ARRAY['sponsored_results'], 
     'Publicidad en tu ciudad por 1 mes', 'City advertising for 1 month'),
    ('Plata', 'Silver', '🥈', 7, 'state', ARRAY['sponsored_results', 'featured_carousel'], 
     'Publicidad estatal por 1 mes', 'State advertising for 1 month'),
    ('Oro', 'Gold', '🥇', 15, 'country', ARRAY['hero_banner', 'sponsored_results', 'featured_carousel'], 
     'Publicidad nacional por 1 mes', 'National advertising for 1 month'),
    ('Diamante', 'Diamond', '💎', 30, 'global', ARRAY['hero_banner', 'sponsored_results', 'featured_carousel', 'bottom_banner'], 
     'Acceso a todos los espacios por 1 mes', 'All ad spaces for 1 month')
ON CONFLICT DO NOTHING;

-- 3. Add reward tracking columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
    current_reward_level_id INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
    pending_reward_level_id INTEGER; -- Reward earned, activates next month
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
    reward_activated_at TIMESTAMPTZ; -- When current reward was activated
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
    reward_expires_at TIMESTAMPTZ; -- When current reward expires
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS 
    free_ad_campaign_id UUID; -- ID of free ad campaign if active

-- 4. Table to track reward history
CREATE TABLE IF NOT EXISTS referral_reward_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    level_id INTEGER REFERENCES referral_reward_levels(id),
    referrals_at_time INTEGER NOT NULL,
    activated_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    campaign_id UUID, -- The free campaign created
    status TEXT DEFAULT 'active', -- 'pending', 'active', 'expired', 'used'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Function to check and assign reward levels
CREATE OR REPLACE FUNCTION check_referral_reward_eligibility(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_referral_count INTEGER;
    v_current_level INTEGER;
    v_pending_level INTEGER;
    v_eligible_level RECORD;
BEGIN
    -- Get user's active referral count (referrals that registered a business)
    SELECT COALESCE(referral_count, 0) INTO v_referral_count
    FROM user_profiles WHERE id = p_user_id;
    
    -- Get current level
    SELECT current_reward_level_id, pending_reward_level_id 
    INTO v_current_level, v_pending_level
    FROM user_profiles WHERE id = p_user_id;
    
    -- Find highest eligible level
    SELECT * INTO v_eligible_level
    FROM referral_reward_levels
    WHERE required_referrals <= v_referral_count
    ORDER BY required_referrals DESC
    LIMIT 1;
    
    -- If eligible for a higher level than current/pending
    IF v_eligible_level.id IS NOT NULL 
       AND v_eligible_level.id > COALESCE(v_current_level, 0)
       AND v_eligible_level.id > COALESCE(v_pending_level, 0) THEN
        
        -- Set as pending (will activate next month)
        UPDATE user_profiles 
        SET pending_reward_level_id = v_eligible_level.id
        WHERE id = p_user_id;
        
        RETURN jsonb_build_object(
            'eligible', true,
            'new_level', v_eligible_level.name,
            'icon', v_eligible_level.icon,
            'ad_scope', v_eligible_level.ad_scope,
            'activates_next_month', true,
            'message', 'Tu premio se activará el próximo mes'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'eligible', false,
        'current_referrals', v_referral_count,
        'current_level_id', v_current_level,
        'pending_level_id', v_pending_level
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to activate pending rewards (run monthly via cron)
CREATE OR REPLACE FUNCTION activate_pending_referral_rewards()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_user RECORD;
    v_level RECORD;
BEGIN
    -- Find users with pending rewards
    FOR v_user IN 
        SELECT up.id, up.pending_reward_level_id
        FROM user_profiles up
        WHERE up.pending_reward_level_id IS NOT NULL
    LOOP
        -- Get level details
        SELECT * INTO v_level
        FROM referral_reward_levels
        WHERE id = v_user.pending_reward_level_id;
        
        -- Activate the reward
        UPDATE user_profiles
        SET 
            current_reward_level_id = v_user.pending_reward_level_id,
            pending_reward_level_id = NULL,
            reward_activated_at = NOW(),
            reward_expires_at = NOW() + INTERVAL '30 days'
        WHERE id = v_user.id;
        
        -- Log in history
        INSERT INTO referral_reward_history (user_id, level_id, referrals_at_time, activated_at, expires_at, status)
        SELECT 
            v_user.id,
            v_user.pending_reward_level_id,
            COALESCE(referral_count, 0),
            NOW(),
            NOW() + INTERVAL '30 days',
            'active'
        FROM user_profiles
        WHERE id = v_user.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to expire old rewards (run daily via cron)
CREATE OR REPLACE FUNCTION expire_referral_rewards()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Expire rewards that have passed their expiration date
    UPDATE user_profiles
    SET 
        current_reward_level_id = 0,
        reward_activated_at = NULL,
        reward_expires_at = NULL,
        free_ad_campaign_id = NULL
    WHERE reward_expires_at < NOW()
    AND current_reward_level_id > 0;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Update history
    UPDATE referral_reward_history
    SET status = 'expired'
    WHERE expires_at < NOW() AND status = 'active';
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC to get user's reward status
CREATE OR REPLACE FUNCTION get_my_referral_reward_status()
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_current_level RECORD;
    v_pending_level RECORD;
    v_next_level RECORD;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile
    FROM user_profiles
    WHERE id = auth.uid();
    
    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Get current level
    SELECT * INTO v_current_level
    FROM referral_reward_levels
    WHERE id = v_profile.current_reward_level_id;
    
    -- Get pending level
    SELECT * INTO v_pending_level
    FROM referral_reward_levels
    WHERE id = v_profile.pending_reward_level_id;
    
    -- Get next level to unlock
    SELECT * INTO v_next_level
    FROM referral_reward_levels
    WHERE required_referrals > COALESCE(v_profile.referral_count, 0)
    ORDER BY required_referrals ASC
    LIMIT 1;
    
    RETURN jsonb_build_object(
        'referral_count', COALESCE(v_profile.referral_count, 0),
        'current_level', CASE WHEN v_current_level.id IS NOT NULL THEN jsonb_build_object(
            'name', v_current_level.name,
            'icon', v_current_level.icon,
            'ad_scope', v_current_level.ad_scope,
            'expires_at', v_profile.reward_expires_at
        ) ELSE NULL END,
        'pending_level', CASE WHEN v_pending_level.id IS NOT NULL THEN jsonb_build_object(
            'name', v_pending_level.name,
            'icon', v_pending_level.icon,
            'activates_next_month', true
        ) ELSE NULL END,
        'next_level', CASE WHEN v_next_level.id IS NOT NULL THEN jsonb_build_object(
            'name', v_next_level.name,
            'icon', v_next_level.icon,
            'required', v_next_level.required_referrals,
            'remaining', v_next_level.required_referrals - COALESCE(v_profile.referral_count, 0)
        ) ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION check_referral_reward_eligibility(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_referral_reward_status() TO authenticated;
GRANT SELECT ON referral_reward_levels TO authenticated;
GRANT SELECT ON referral_reward_history TO authenticated;

-- 10. RLS
ALTER TABLE referral_reward_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reward levels" ON referral_reward_levels FOR SELECT USING (true);

ALTER TABLE referral_reward_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own reward history" ON referral_reward_history FOR SELECT USING (user_id = auth.uid());

-- 11. CRON JOB setup (instructions)
-- Run monthly on 1st: SELECT activate_pending_referral_rewards();
-- Run daily: SELECT expire_referral_rewards();

-- To set up in Supabase (requires pg_cron extension):
/*
SELECT cron.schedule('activate-rewards', '0 0 1 * *', $$SELECT activate_pending_referral_rewards()$$);
SELECT cron.schedule('expire-rewards', '0 0 * * *', $$SELECT expire_referral_rewards()$$);
*/

-- 12. Verify
SELECT 'Referral ad rewards system installed!' as status;
SELECT * FROM referral_reward_levels ORDER BY required_referrals;
