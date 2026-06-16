-- ====================================================================
-- SQL Script: fix_all_storage_buckets.sql
-- Description: Ensures all four storage buckets exist with public access
--              and clean, permissive RLS policies for authenticated users.
-- ====================================================================

-- 1. Ensure all buckets exist and are set to public
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('business-assets', 'business-assets', true),
  ('business-images', 'business-images', true),
  ('business images', 'business images', true), -- Fallback for space naming
  ('recommendations', 'recommendations', true),
  ('ad-creatives', 'ad-creatives', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Anyone can view business assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own assets" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload business images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own business images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own business images" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

DROP POLICY IF EXISTS "Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- 3. Create clean policies for all buckets
CREATE POLICY "Public Read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('business-assets', 'business-images', 'business images', 'recommendations', 'ad-creatives'));

CREATE POLICY "Authenticated Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('business-assets', 'business-images', 'business images', 'recommendations', 'ad-creatives'));

CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('business-assets', 'business-images', 'business images', 'recommendations', 'ad-creatives'));

CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('business-assets', 'business-images', 'business images', 'recommendations', 'ad-creatives'));
