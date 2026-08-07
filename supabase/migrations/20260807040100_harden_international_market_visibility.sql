-- Expose only the minimum public market fields. Operational metrics stay private.

BEGIN;

REVOKE ALL ON public.international_markets FROM anon, authenticated;
REVOKE ALL ON public.international_import_batches FROM anon, authenticated;

GRANT SELECT (
  id,
  country_code,
  country_name,
  city_name,
  default_language,
  timezone,
  wave,
  status,
  target_records,
  visible_records
) ON public.international_markets TO anon, authenticated;

-- Row-level policies still restrict these mutations to administrators.
GRANT INSERT, UPDATE, DELETE ON public.international_markets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.international_import_batches TO authenticated;

GRANT ALL ON public.international_markets TO service_role;
GRANT ALL ON public.international_import_batches TO service_role;

COMMIT;
