-- Prevent new international imports from becoming visible before market approval.
-- Existing preview data remains unchanged.

BEGIN;

DROP POLICY IF EXISTS international_businesses_public_read_v1
  ON public.international_businesses;
CREATE POLICY international_businesses_public_read_v1
  ON public.international_businesses
  FOR SELECT TO anon, authenticated
  USING (
    status = 'approved'
    AND is_visible = TRUE
  );

CREATE OR REPLACE FUNCTION public.enforce_international_visibility_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_visible = TRUE
    AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_visible, FALSE) = FALSE)
    AND NOT EXISTS (
      SELECT 1
      FROM public.international_markets AS market
      WHERE market.status IN ('preview', 'active')
        AND market.country_code = NEW.country_code
        AND LOWER(market.city_name) = LOWER(NEW.city)
    ) THEN
    RAISE EXCEPTION 'International market must be approved before listings become visible';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_international_visibility_gate
  ON public.international_businesses;
CREATE TRIGGER trg_international_visibility_gate
  BEFORE INSERT OR UPDATE OF is_visible
  ON public.international_businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_international_visibility_gate();

COMMIT;
