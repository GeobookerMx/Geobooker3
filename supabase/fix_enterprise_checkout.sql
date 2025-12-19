-- ==========================================================
-- ENTERPRISE CHECKOUT FIX
-- Adds missing columns to ad_campaigns for enterprise features
-- Run this in Supabase SQL Editor
-- ==========================================================

-- 1. Add enterprise-specific columns to ad_campaigns
-- Only add if they don't exist (safe to run multiple times)

-- Target geographic columns
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS target_countries TEXT[] DEFAULT '{}';

ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS target_cities TEXT[] DEFAULT '{}';

-- Tax and billing columns
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'US';

-- Note: client_tax_id and tax_status may already exist from international_tax_fields.sql
-- Adding IF NOT EXISTS to be safe
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS client_tax_id TEXT;

ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS tax_status TEXT DEFAULT 'pending';

-- Multi-language creatives storage (JSONB for flexibility)
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS multi_language_creatives JSONB DEFAULT '{}';

-- Currency field for international payments
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MXN';

-- 2. Update storage policy to allow enterprise folder uploads
-- Drop existing restrictive policy and create a more permissive one

DROP POLICY IF EXISTS "Auth Users Upload Ad Creatives" ON storage.objects;

-- New policy: Allow authenticated users to upload to ANY folder in ad-creatives
CREATE POLICY "Auth Users Upload Ad Creatives"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad-creatives' 
  AND auth.role() = 'authenticated'
);

-- Also allow updates to enterprise folder for authenticated users
DROP POLICY IF EXISTS "Enterprise Upload Ad Creatives" ON storage.objects;

CREATE POLICY "Enterprise Upload Ad Creatives"
ON storage.objects FOR ALL
USING (
  bucket_id = 'ad-creatives' 
  AND (storage.foldername(name))[1] = 'enterprise'
  AND auth.role() = 'authenticated'
);

-- 3. Ensure public read is enabled
DROP POLICY IF EXISTS "Public Read Ad Creatives" ON storage.objects;

CREATE POLICY "Public Read Ad Creatives"
ON storage.objects FOR SELECT
USING ( bucket_id = 'ad-creatives' );

-- =================================================
-- VERIFICATION: Check columns exist
-- =================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ad_campaigns' 
AND column_name IN ('target_countries', 'target_cities', 'multi_language_creatives', 'billing_country', 'tax_status', 'currency')
ORDER BY column_name;
