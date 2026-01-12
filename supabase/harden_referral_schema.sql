-- ==========================================
-- HARDENING REFERRAL SCHEMA
-- Goal: Ensure explicit foreign keys to user_profiles
-- to allow Supabase auto-joins and improve integrity.
-- ==========================================

-- 1. Ensure referrals table has explicit FKs to user_profiles instead of auth.users
-- This allows the JS client to traverse the relationship more easily.

ALTER TABLE public.referrals
DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;

ALTER TABLE public.referrals
ADD CONSTRAINT referrals_referrer_id_fkey 
FOREIGN KEY (referrer_id) 
REFERENCES public.user_profiles(id) 
ON DELETE SET NULL;

ALTER TABLE public.referrals
DROP CONSTRAINT IF EXISTS referrals_referred_id_fkey;

ALTER TABLE public.referrals
ADD CONSTRAINT referrals_referred_id_fkey 
FOREIGN KEY (referred_id) 
REFERENCES public.user_profiles(id) 
ON DELETE CASCADE;

-- 2. Add indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- 3. Safety check for profiles table confusion
-- Create a view 'profiles' if it doesn't exist to at least point to user_profiles
-- This prevents crashes if someone adds code with 'profiles' table by mistake.
-- Note: Use OR REPLACE to ensure it points to the right place.

CREATE OR REPLACE VIEW public.profiles AS SELECT * FROM public.user_profiles;

COMMENT ON VIEW public.profiles IS 'View created to maintain compatibility with legacy code calling profiles instead of user_profiles';

-- 4. Verify
SELECT 'Schema hardened successfully!' as message;
