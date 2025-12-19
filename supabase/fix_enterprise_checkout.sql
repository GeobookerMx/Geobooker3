-- ==========================================================
-- FIX: ad_space_id NOT NULL constraint
-- Run this in Supabase SQL Editor
-- ==========================================================

-- Option 1: Allow NULL for ad_space_id (Enterprise campaigns don't need ad_space)
ALTER TABLE ad_campaigns ALTER COLUMN ad_space_id DROP NOT NULL;

-- Option 2: Add default value (if you prefer)
-- ALTER TABLE ad_campaigns ALTER COLUMN ad_space_id SET DEFAULT NULL;

-- Also ensure storage permissions are correct for enterprise folder
-- Drop and recreate policies for ad-creatives bucket

-- First, ensure the bucket exists and is public
UPDATE storage.buckets SET public = true WHERE id = 'ad-creatives';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Auth Users Upload Ad Creatives" ON storage.objects;
DROP POLICY IF EXISTS "Enterprise Upload Ad Creatives" ON storage.objects;
DROP POLICY IF EXISTS "Users Manage Own Ad Creatives" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Ad Creatives" ON storage.objects;

-- Create simple policies that work
-- First drop if they exist
DROP POLICY IF EXISTS "Anyone can read ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete ad creatives" ON storage.objects;

-- Anyone can READ (public ads)
CREATE POLICY "Anyone can read ad creatives"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-creatives');

-- Authenticated users can UPLOAD anywhere in the bucket
CREATE POLICY "Authenticated users can upload ad creatives"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'ad-creatives' 
    AND auth.role() = 'authenticated'
);

-- Authenticated users can UPDATE their uploads
CREATE POLICY "Authenticated users can update ad creatives"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'ad-creatives' 
    AND auth.role() = 'authenticated'
);

-- Authenticated users can DELETE their uploads
CREATE POLICY "Authenticated users can delete ad creatives"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'ad-creatives' 
    AND auth.role() = 'authenticated'
);

-- Verify
SELECT 'ad_space_id constraint fixed' as status;
