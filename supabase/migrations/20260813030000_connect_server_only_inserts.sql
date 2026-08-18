-- Connect reservations are created by create-connect-reservation using service_role.
-- Browsers retain no direct INSERT path into the fulfillment/payment source table.
-- Some preview branches may not include the Connect table yet, so keep this
-- hardening migration safe when rebuilding a clean database from migrations.

DO $$
BEGIN
  IF to_regclass('public.connect_campaigns') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public insert connect campaigns" ON public.connect_campaigns;
    REVOKE INSERT ON public.connect_campaigns FROM anon, authenticated;

    COMMENT ON TABLE public.connect_campaigns IS
      'Server-managed Connect reservation and fulfillment records; no direct browser inserts.';
  END IF;
END $$;
