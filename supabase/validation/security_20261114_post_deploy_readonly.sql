-- Run after the four 2026-11-14 security migrations are applied.
-- This file reads metadata only and returns no account identifiers or secrets.

SELECT
  count(*) AS admin_count,
  count(*) FILTER (WHERE lower(a.email) IN
    ('juan.pablo.pg@hotmail.com', 'jpvaness85@gmail.com')) AS allowed_admin_count,
  count(*) FILTER (WHERE lower(a.email) = lower(u.email)
                   AND u.email_confirmed_at IS NOT NULL) AS verified_identity_count
FROM public.admin_users a
LEFT JOIN auth.users u ON u.id = a.id;

SELECT
  has_function_privilege('anon', 'public.get_users_for_admin()', 'EXECUTE') AS anon_admin_directory,
  has_function_privilege('authenticated', 'public.get_users_for_admin()', 'EXECUTE') AS authenticated_admin_directory,
  has_function_privilege('anon', 'public.claim_business(uuid,uuid,text)', 'EXECUTE') AS anon_claim_business,
  has_function_privilege('anon', 'public.redeem_points_for_ad(uuid,text,integer,uuid,text,text)', 'EXECUTE') AS anon_redeem_points,
  has_column_privilege('authenticated', 'public.businesses', 'status', 'UPDATE') AS owners_can_update_status,
  has_column_privilege('authenticated', 'public.businesses', 'is_verified', 'UPDATE') AS owners_can_update_verification,
  has_column_privilege('authenticated', 'public.businesses', 'trust_score', 'UPDATE') AS owners_can_update_trust,
  has_column_privilege('authenticated', 'public.businesses', 'name', 'UPDATE') AS owners_can_update_name;

SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname IN (
    'Public full access ad-creatives',
    'Authenticated Delete', 'Authenticated Insert', 'Authenticated Update',
    'media_owner_insert_20261114',
    'media_owner_update_20261114',
    'media_owner_delete_20261114'
  )
ORDER BY policyname;

SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('ad-creatives', 'business-assets', 'business-images',
             'business images', 'recommendations')
ORDER BY id;
