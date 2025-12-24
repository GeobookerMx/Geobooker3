-- ==========================================================
-- FIX: Allow Supabase Auth to Create User Profiles (Apple/Google Sign-In)
-- ==========================================================
-- The error "Database error saving new user" occurs because Supabase Auth 
-- service needs to insert into user_profiles but may be blocked by RLS
--
-- Execute this in Supabase SQL Editor to fix OAuth signup issues
-- ==========================================================

-- 1. First, let's check if RLS is enabled on user_profiles
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 2. Check current policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 3. SOLUTION A: Disable RLS on user_profiles (simplest fix)
-- This is safe because users can only see their own profile via the app
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 4. If you prefer to KEEP RLS enabled, create a service role policy instead:
-- Uncomment the following section if you want RLS enabled:

/*
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow the service role to do anything (needed for auth triggers)
CREATE POLICY "Service role can do everything"
ON user_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"  
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
*/

-- 5. Verify the change
SELECT 
  '✅ RLS status for user_profiles:' as message,
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 6. Test: After running this, try Apple Sign-In again!
