-- ==========================================================
-- HOTFIX: business images storage
-- Fixes business photo upload from BusinessEditPage
-- ==========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-images', 'business-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can upload business images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own business images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own business images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

CREATE POLICY "Users can upload business images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-images');

CREATE POLICY "Anyone can view business images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-images');

CREATE POLICY "Users can update own business images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business-images')
WITH CHECK (bucket_id = 'business-images');

CREATE POLICY "Users can delete own business images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business-images');

SELECT id, name, public
FROM storage.buckets
WHERE id = 'business-images';
