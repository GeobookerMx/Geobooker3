-- ==========================================================
-- FIX: Add missing columns to ad_campaigns table
-- Run this in Supabase SQL Editor
-- ==========================================================

-- Add all columns that might be missing
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS creative_url TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS cta_url TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS ad_level TEXT DEFAULT 'city';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS category_code TEXT DEFAULT 'other';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS end_date DATE;

-- Make ad_space_id nullable (for enterprise campaigns that don't use ad_spaces)
ALTER TABLE ad_campaigns ALTER COLUMN ad_space_id DROP NOT NULL;

-- Grant permissions
GRANT ALL ON ad_campaigns TO authenticated;
GRANT SELECT ON ad_campaigns TO anon;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ad_campaigns'
ORDER BY ordinal_position;
