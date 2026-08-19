-- Ensure rental-space image storage exists in production.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'space-listing-images',
  'space-listing-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS space_listing_images_public_read_v1 ON storage.objects;
DROP POLICY IF EXISTS space_listing_images_owner_insert_v1 ON storage.objects;
DROP POLICY IF EXISTS space_listing_images_owner_update_v1 ON storage.objects;
DROP POLICY IF EXISTS space_listing_images_owner_delete_v1 ON storage.objects;

CREATE POLICY space_listing_images_public_read_v1
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'space-listing-images');

CREATE POLICY space_listing_images_owner_insert_v1
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'space-listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY space_listing_images_owner_update_v1
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'space-listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'space-listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY space_listing_images_owner_delete_v1
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'space-listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
