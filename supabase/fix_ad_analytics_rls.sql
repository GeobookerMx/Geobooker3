-- ==========================================================
-- FIX: ad_analytics table RLS policies
-- Run this in Supabase SQL Editor
-- ==========================================================

-- Enable RLS on ad_analytics if not already
ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Anyone can read ad analytics" ON ad_analytics;
DROP POLICY IF EXISTS "Authenticated can insert analytics" ON ad_analytics;
DROP POLICY IF EXISTS "Authenticated can update analytics" ON ad_analytics;

-- Create policies

-- Anyone can read ad analytics (for tracking impressions)
CREATE POLICY "Anyone can read ad analytics"
ON ad_analytics FOR SELECT
USING (true);

-- Authenticated users can insert analytics
CREATE POLICY "Authenticated can insert analytics"
ON ad_analytics FOR INSERT
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Authenticated users can update their own analytics
CREATE POLICY "Authenticated can update analytics"
ON ad_analytics FOR UPDATE
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Grant access to anonymous users too (for tracking without login)
GRANT SELECT, INSERT, UPDATE ON ad_analytics TO anon;
GRANT SELECT, INSERT, UPDATE ON ad_analytics TO authenticated;

-- Verify
SELECT 'ad_analytics RLS policies created' as status;
