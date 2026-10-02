-- GeoScore Phase 5 hardening.
-- Certificates must be issued by trusted backend code after server-side scoring.

BEGIN;

REVOKE ALL ON FUNCTION public.geoscore_issue_certificate(
  TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER,
  NUMERIC, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, TEXT, TEXT, UUID
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.geoscore_issue_certificate(
  TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER,
  NUMERIC, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, TEXT, TEXT, UUID
) TO service_role;

COMMENT ON FUNCTION public.geoscore_issue_certificate(
  TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER,
  NUMERIC, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, TEXT, TEXT, UUID
) IS
  'Issues a GeoScore certificate from trusted backend code only. Public clients must use the location-intelligence Edge Function.';

NOTIFY pgrst, 'reload schema';

COMMIT;
