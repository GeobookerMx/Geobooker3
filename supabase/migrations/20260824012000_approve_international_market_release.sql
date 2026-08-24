-- Explicit admin approval gate for publishing an international market.

BEGIN;

CREATE OR REPLACE FUNCTION public.approve_international_market_release(
  p_market_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_market public.international_markets%ROWTYPE;
  v_imported INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin approval is required';
  END IF;

  SELECT *
  INTO v_market
  FROM public.international_markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown international market: %', p_market_id;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_imported
  FROM public.international_businesses AS business
  WHERE business.country_code = v_market.country_code
    AND LOWER(business.city) = LOWER(v_market.city_name)
    AND business.status = 'approved';

  IF v_imported < 100 THEN
    RAISE EXCEPTION 'At least 100 approved records are required; found %', v_imported;
  END IF;

  IF COALESCE(v_market.sample_size, 0) < 100
    OR COALESCE(v_market.location_accuracy_percent, 0) < 95
    OR COALESCE(v_market.visible_duplicate_percent, 100) > 5
    OR COALESCE(v_market.invalid_coordinate_percent, 100) > 1 THEN
    RAISE EXCEPTION 'Quality gates are incomplete or failed for %', p_market_id;
  END IF;

  UPDATE public.international_markets
  SET
    status = 'active',
    rollout_stage = GREATEST(rollout_stage, 1),
    imported_records = v_imported,
    visible_records = 0,
    quality_approved_at = NOW(),
    quality_approved_by = auth.uid(),
    activated_at = COALESCE(activated_at, NOW()),
    paused_at = NULL,
    updated_at = NOW()
  WHERE id = p_market_id;

  UPDATE public.international_businesses AS business
  SET
    is_visible = TRUE,
    updated_at = NOW()
  WHERE business.country_code = v_market.country_code
    AND LOWER(business.city) = LOWER(v_market.city_name)
    AND business.status = 'approved';

  UPDATE public.international_markets
  SET
    visible_records = v_imported,
    updated_at = NOW()
  WHERE id = p_market_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'market_id', p_market_id,
    'status', 'active',
    'visible_records', v_imported,
    'approved_by', auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_international_market_release(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_international_market_release(TEXT) TO authenticated;

COMMIT;
