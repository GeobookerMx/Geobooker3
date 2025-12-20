-- ==========================================================
-- REFERRAL SYSTEM FOR GEOBOOKER
-- 
-- Features:
-- - Unique referral codes per user
-- - Track referral signups
-- - Track referral conversions (became Premium)
-- - Automatic Premium extension rewards
-- ==========================================================

-- 1. Add referral_code to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS premium_bonus_days INTEGER DEFAULT 0;

-- 2. Create referrals tracking table  
CREATE TABLE IF NOT EXISTS referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referrer_id UUID REFERENCES auth.users(id),
    referred_id UUID REFERENCES auth.users(id),
    referral_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, signed_up, business_added, became_premium
    reward_given BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    notes TEXT
);

-- 3. Function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Auto-assign referral code on user creation
CREATE OR REPLACE FUNCTION assign_referral_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    -- Only if referral_code is null
    IF NEW.referral_code IS NULL THEN
        LOOP
            new_code := generate_referral_code();
            SELECT EXISTS(SELECT 1 FROM user_profiles WHERE referral_code = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        NEW.referral_code := new_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_assign_referral_code ON user_profiles;
CREATE TRIGGER trg_assign_referral_code
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_referral_code();

-- 5. Assign referral codes to existing users
UPDATE user_profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- 6. Function to process referral when new user signs up
CREATE OR REPLACE FUNCTION process_referral(
    p_referred_id UUID,
    p_referral_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_referrer_id UUID;
BEGIN
    -- Find the referrer
    SELECT id INTO v_referrer_id
    FROM user_profiles
    WHERE referral_code = UPPER(p_referral_code);
    
    IF v_referrer_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Don't allow self-referral
    IF v_referrer_id = p_referred_id THEN
        RETURN false;
    END IF;
    
    -- Update the referred user
    UPDATE user_profiles
    SET referred_by = p_referral_code
    WHERE id = p_referred_id;
    
    -- Create referral record
    INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
    VALUES (v_referrer_id, p_referred_id, p_referral_code, 'signed_up');
    
    -- Increment referral count
    UPDATE user_profiles
    SET referral_count = referral_count + 1
    WHERE id = v_referrer_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to reward referrer when referred adds a business
CREATE OR REPLACE FUNCTION reward_referrer_business_added(p_referred_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_referrer_id UUID;
    v_referral_id UUID;
BEGIN
    -- Find the referral record
    SELECT id, referrer_id INTO v_referral_id, v_referrer_id
    FROM referrals
    WHERE referred_id = p_referred_id
    AND status = 'signed_up'
    AND reward_given = false
    LIMIT 1;
    
    IF v_referrer_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update referral status
    UPDATE referrals
    SET status = 'business_added', 
        converted_at = NOW(),
        reward_given = true
    WHERE id = v_referral_id;
    
    -- Give 30 days premium bonus to referrer
    UPDATE user_profiles
    SET premium_bonus_days = COALESCE(premium_bonus_days, 0) + 30
    WHERE id = v_referrer_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS Policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own referrals" ON referrals;
CREATE POLICY "Users read own referrals" ON referrals
FOR SELECT USING (
    auth.uid() = referrer_id OR auth.uid() = referred_id
);

DROP POLICY IF EXISTS "System can insert referrals" ON referrals;
CREATE POLICY "System can insert referrals" ON referrals
FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON referrals TO authenticated;
GRANT EXECUTE ON FUNCTION generate_referral_code TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral TO authenticated;
GRANT EXECUTE ON FUNCTION reward_referrer_business_added TO authenticated;

-- Verify
SELECT 'Referral system installed successfully!' as message;
