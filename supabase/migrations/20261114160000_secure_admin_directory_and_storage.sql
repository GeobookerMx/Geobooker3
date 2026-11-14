-- Close the exposed admin directory and public Storage writes found on 2026-11-14.
-- Keep public object reads for the five existing public media buckets.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  is_premium boolean,
  is_premium_owner boolean,
  business_count integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.is_premium, p.is_premium_owner,
         (SELECT count(*)::integer FROM public.businesses b WHERE b.owner_id = p.id),
         p.created_at
  FROM public.user_profiles p
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_users_for_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_users_for_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS "Public full access ad-creatives" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Auth users manage ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete own recommendations" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload recommendations" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete business-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update business-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload business-images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload 1140yeo_0" ON storage.objects;
DROP POLICY IF EXISTS "user_delete_own 1140yeo_0" ON storage.objects;
DROP POLICY IF EXISTS "user_update_own 1140yeo_0" ON storage.objects;

-- Each new upload is placed under the authenticated user's UUID. Existing
-- objects can still be removed by their recorded owner, including old paths.
CREATE POLICY media_owner_insert_20261114 ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('ad-creatives', 'business-assets', 'business-images', 'business images', 'recommendations')
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY media_owner_update_20261114 ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id IN ('ad-creatives', 'business-assets', 'business-images', 'business images', 'recommendations')
  AND owner_id = auth.uid()::text
)
WITH CHECK (
  bucket_id IN ('ad-creatives', 'business-assets', 'business-images', 'business images', 'recommendations')
  AND owner_id = auth.uid()::text
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY media_owner_delete_20261114 ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id IN ('ad-creatives', 'business-assets', 'business-images', 'business images', 'recommendations')
  AND owner_id = auth.uid()::text
);

-- The public buckets serve media only. The limits match the current upload
-- controls; old objects remain readable regardless of their original MIME.
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp',
                               'video/mp4', 'video/webm', 'video/quicktime']::text[]
WHERE id = 'ad-creatives';

UPDATE storage.buckets
SET file_size_limit = CASE WHEN id = 'recommendations' THEN 5242880 ELSE 10485760 END,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id IN ('business-assets', 'business-images', 'business images', 'recommendations');

COMMIT;
