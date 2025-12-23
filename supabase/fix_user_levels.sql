-- ==========================================================
-- FIX: User Gamification Level Display (Fixed emoji syntax)
-- Corrects issues with level not showing correctly
-- ==========================================================

-- 1. Ensure user_levels table has data (force re-insert)
DELETE FROM user_levels;

INSERT INTO user_levels (level_number, name, name_es, icon, min_referrals, color, rewards) VALUES
(1, 'Explorer', 'Explorador', E'\U0001F949', 0, 'bronze', '{"badge": true}');

INSERT INTO user_levels (level_number, name, name_es, icon, min_referrals, color, rewards) VALUES
(2, 'Promoter', 'Promotor', E'\U0001F948', 3, 'silver', '{"free_ad_days": 7, "badge": true}');

INSERT INTO user_levels (level_number, name, name_es, icon, min_referrals, color, rewards) VALUES
(3, 'Ambassador', 'Embajador', E'\U0001F947', 10, 'gold', '{"free_ad_days": 14, "badge": true, "highlighted": true}');

INSERT INTO user_levels (level_number, name, name_es, icon, min_referrals, color, rewards) VALUES
(4, 'VIP', 'VIP', E'\U0001F48E', 25, 'diamond', '{"free_ad_days": 30, "premium_days": 30, "badge": true}');

INSERT INTO user_levels (level_number, name, name_es, icon, min_referrals, color, rewards) VALUES
(5, 'Legend', 'Leyenda', E'\U0001F451', 50, 'platinum', '{"free_ad_days": 90, "premium_days": 90, "badge": true, "enterprise_access": true}');

-- 2. Set ALL users to correct level based on referral count
UPDATE user_profiles 
SET current_level = 
    CASE 
        WHEN COALESCE(referral_count, 0) >= 50 THEN 5
        WHEN COALESCE(referral_count, 0) >= 25 THEN 4
        WHEN COALESCE(referral_count, 0) >= 10 THEN 3
        WHEN COALESCE(referral_count, 0) >= 3 THEN 2
        ELSE 1
    END,
    total_referrals = COALESCE(referral_count, 0);

-- 3. Verify the levels
SELECT * FROM user_levels ORDER BY level_number;

-- 4. Check users
SELECT id, referral_count, current_level FROM user_profiles LIMIT 10;
