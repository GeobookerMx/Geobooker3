-- ==========================================================
-- FIX: Complete ad_campaigns table schema for Enterprise Checkout
-- Run this in Supabase SQL Editor
-- ==========================================================

-- First, check what columns exist
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'ad_campaigns';

-- Add ALL columns that the EnterpriseCheckout needs
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS advertiser_name TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS advertiser_email TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'local';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS ad_level TEXT DEFAULT 'city';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS category_code TEXT DEFAULT 'other';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS target_cities TEXT[];
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS target_countries TEXT[];
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'MX';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS client_tax_id TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS tax_status TEXT DEFAULT 'domestic_mx';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS total_budget DECIMAL(10,2);
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS cta_url TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS creative_url TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS multi_language_creatives JSONB;

-- Make ad_space_id nullable (enterprise campaigns don't need it)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'ad_campaigns' AND column_name = 'ad_space_id' AND is_nullable = 'NO') THEN
        ALTER TABLE ad_campaigns ALTER COLUMN ad_space_id DROP NOT NULL;
    END IF;
END $$;

-- Make business_id nullable (enterprise campaigns don't need it)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'ad_campaigns' AND column_name = 'business_id' AND is_nullable = 'NO') THEN
        ALTER TABLE ad_campaigns ALTER COLUMN business_id DROP NOT NULL;
    END IF;
END $$;

-- Enable RLS if not already
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Authenticated can insert campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Users can read own campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Admins can do anything" ON ad_campaigns;
DROP POLICY IF EXISTS "Anyone can read active campaigns" ON ad_campaigns;

-- Allow authenticated users to insert campaigns
CREATE POLICY "Authenticated can insert campaigns" ON ad_campaigns
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can read their own campaigns
CREATE POLICY "Users can read own campaigns" ON ad_campaigns
FOR SELECT USING (
    auth.uid()::text = user_id::text 
    OR advertiser_email = auth.email()
    OR status = 'active'
);

-- Grant permissions
GRANT ALL ON ad_campaigns TO authenticated;
GRANT SELECT ON ad_campaigns TO anon;

-- Verify all columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ad_campaigns'
ORDER BY ordinal_position;
