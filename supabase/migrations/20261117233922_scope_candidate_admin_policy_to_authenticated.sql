-- An admin-only policy must not query the private admin directory as anon.
-- Version matches the applied Geobooker migration history.
-- Keep the separate public-read policy and every existing membership check.
BEGIN;
ALTER POLICY "Admins can manage business_candidates"
  ON public.business_candidates TO authenticated;
COMMIT;
