-- Connect reservations are created by create-connect-reservation using service_role.
-- Browsers retain no direct INSERT path into the fulfillment/payment source table.

DROP POLICY IF EXISTS "Public insert connect campaigns" ON public.connect_campaigns;
REVOKE INSERT ON public.connect_campaigns FROM anon, authenticated;

COMMENT ON TABLE public.connect_campaigns IS
  'Server-managed Connect reservation and fulfillment records; no direct browser inserts.';
