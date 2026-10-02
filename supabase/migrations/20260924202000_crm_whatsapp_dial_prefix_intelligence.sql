-- Operational evidence for international WhatsApp reachability.
-- Keeps source data for GeoScore/research, but lets WhatsApp campaigns avoid
-- prefixes or numbers that prove ineffective.

CREATE TABLE IF NOT EXISTS crm.whatsapp_dial_prefix_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  calling_code TEXT NOT NULL CHECK (calling_code ~ '^\+[1-9][0-9]{0,3}$'),
  area_code TEXT,
  status TEXT NOT NULL DEFAULT 'watch' CHECK (status IN ('allowed', 'watch', 'blocked')),
  outbound_count INTEGER NOT NULL DEFAULT 0 CHECK (outbound_count >= 0),
  success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  accepted_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  read_count INTEGER NOT NULL DEFAULT 0 CHECK (read_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  generated_from_evidence BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_whatsapp_dial_prefix_policies_key_uidx
  ON crm.whatsapp_dial_prefix_policies (
    COALESCE(country_code, ''),
    calling_code,
    COALESCE(area_code, '')
  );

CREATE INDEX IF NOT EXISTS crm_whatsapp_dial_prefix_policies_status_idx
  ON crm.whatsapp_dial_prefix_policies (status, country_code, calling_code, area_code);

ALTER TABLE crm.whatsapp_dial_prefix_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.whatsapp_dial_prefix_policies FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE crm.whatsapp_dial_prefix_policies FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.whatsapp_dial_prefix_policies TO service_role;
REVOKE DELETE ON TABLE crm.whatsapp_dial_prefix_policies FROM service_role;

DROP TRIGGER IF EXISTS set_updated_at ON crm.whatsapp_dial_prefix_policies;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.whatsapp_dial_prefix_policies
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

CREATE OR REPLACE FUNCTION crm.extract_whatsapp_dial_prefix(
  p_phone TEXT,
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  calling_code TEXT,
  area_code TEXT
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  normalized_country TEXT := upper(NULLIF(btrim(p_country_code), ''));
BEGIN
  IF digits = '' THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF left(digits, 1) = '1' THEN
    RETURN QUERY SELECT '+1', NULLIF(substr(digits, 2, 3), '');
  ELSIF left(digits, 2) = '52' THEN
    RETURN QUERY SELECT '+52', NULLIF(substr(digits, 3, 2), '');
  ELSIF left(digits, 2) = '34' THEN
    RETURN QUERY SELECT '+34', NULLIF(substr(digits, 3, 2), '');
  ELSIF left(digits, 2) = '44' THEN
    RETURN QUERY SELECT '+44', NULLIF(substr(digits, 3, 3), '');
  ELSIF left(digits, 2) IN ('31', '33', '39', '49', '54', '55', '56', '57') THEN
    RETURN QUERY SELECT '+' || left(digits, 2), NULLIF(substr(digits, 3, 2), '');
  ELSIF left(digits, 2) = '51' THEN
    RETURN QUERY SELECT '+51', NULLIF(substr(digits, 3, 2), '');
  ELSIF normalized_country = 'US' AND length(digits) = 10 THEN
    RETURN QUERY SELECT '+1', NULLIF(substr(digits, 1, 3), '');
  ELSE
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_whatsapp_dial_prefix_report(
  p_country_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  country_code TEXT,
  calling_code TEXT,
  area_code TEXT,
  outbound_count INTEGER,
  accepted_count INTEGER,
  sent_count INTEGER,
  delivered_count INTEGER,
  read_count INTEGER,
  failed_count INTEGER,
  success_count INTEGER,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error_codes JSONB,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH evidence AS (
    SELECT
      upper(COALESCE(cp.country_code, c.country_code, a.country_code)) AS evidence_country,
      prefix.calling_code,
      prefix.area_code,
      msg.current_status,
      msg.provider_message_id,
      msg.failure_code,
      COALESCE(msg.provider_timestamp, msg.updated_at, msg.created_at) AS event_at
    FROM crm.messages msg
    JOIN crm.conversations cv ON cv.id = msg.conversation_id
    JOIN crm.contact_points cp ON cp.id = cv.contact_point_id
    LEFT JOIN crm.contacts c ON c.id = cv.contact_id
    LEFT JOIN crm.accounts a ON a.id = cv.account_id
    CROSS JOIN LATERAL crm.extract_whatsapp_dial_prefix(cp.normalized_value, COALESCE(cp.country_code, c.country_code, a.country_code)) prefix
    WHERE msg.direction = 'outbound'
      AND cp.point_type IN ('phone', 'whatsapp')
      AND prefix.calling_code IS NOT NULL
      AND (p_country_code IS NULL OR upper(COALESCE(cp.country_code, c.country_code, a.country_code)) = upper(p_country_code))
  ),
  grouped AS (
    SELECT
      evidence_country,
      calling_code,
      area_code,
      count(*)::INTEGER AS outbound_count,
      count(*) FILTER (WHERE current_status IN ('accepted', 'sent', 'delivered', 'read') OR provider_message_id IS NOT NULL)::INTEGER AS accepted_count,
      count(*) FILTER (WHERE current_status IN ('sent', 'delivered', 'read'))::INTEGER AS sent_count,
      count(*) FILTER (WHERE current_status IN ('delivered', 'read'))::INTEGER AS delivered_count,
      count(*) FILTER (WHERE current_status = 'read')::INTEGER AS read_count,
      count(*) FILTER (WHERE current_status = 'failed')::INTEGER AS failed_count,
      count(*) FILTER (WHERE current_status IN ('accepted', 'sent', 'delivered', 'read') OR provider_message_id IS NOT NULL)::INTEGER AS success_count,
      max(event_at) FILTER (WHERE current_status IN ('accepted', 'sent', 'delivered', 'read') OR provider_message_id IS NOT NULL) AS last_success_at,
      max(event_at) FILTER (WHERE current_status = 'failed') AS last_failure_at,
      COALESCE(jsonb_agg(DISTINCT failure_code) FILTER (WHERE failure_code IS NOT NULL), '[]'::jsonb) AS last_error_codes
    FROM evidence
    GROUP BY evidence_country, calling_code, area_code
  )
  SELECT
    grouped.evidence_country,
    grouped.calling_code,
    grouped.area_code,
    grouped.outbound_count,
    grouped.accepted_count,
    grouped.sent_count,
    grouped.delivered_count,
    grouped.read_count,
    grouped.failed_count,
    grouped.success_count,
    grouped.last_success_at,
    grouped.last_failure_at,
    grouped.last_error_codes,
    CASE
      WHEN grouped.success_count > 0 AND grouped.failed_count = 0 THEN 'allowed'
      WHEN grouped.success_count = 0 AND grouped.failed_count >= 3 THEN 'blocked'
      ELSE 'watch'
    END AS status
  FROM grouped
  ORDER BY grouped.success_count DESC, grouped.failed_count DESC, grouped.outbound_count DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_refresh_whatsapp_dial_prefix_policies(
  p_country_code TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  affected_count INTEGER := 0;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO crm.whatsapp_dial_prefix_policies (
    country_code, calling_code, area_code, status, outbound_count, success_count,
    accepted_count, sent_count, delivered_count, read_count, failed_count,
    last_success_at, last_failure_at, last_error_codes, notes, generated_from_evidence
  )
  SELECT
    country_code, calling_code, area_code, status, outbound_count, success_count,
    accepted_count, sent_count, delivered_count, read_count, failed_count,
    last_success_at, last_failure_at, last_error_codes,
    'Auto-updated from WhatsApp message evidence.', true
  FROM public.crm_whatsapp_dial_prefix_report(p_country_code, 500)
  ON CONFLICT (COALESCE(country_code, ''), calling_code, COALESCE(area_code, ''))
  DO UPDATE SET
    status = CASE
      WHEN crm.whatsapp_dial_prefix_policies.generated_from_evidence THEN EXCLUDED.status
      ELSE crm.whatsapp_dial_prefix_policies.status
    END,
    outbound_count = EXCLUDED.outbound_count,
    success_count = EXCLUDED.success_count,
    accepted_count = EXCLUDED.accepted_count,
    sent_count = EXCLUDED.sent_count,
    delivered_count = EXCLUDED.delivered_count,
    read_count = EXCLUDED.read_count,
    failed_count = EXCLUDED.failed_count,
    last_success_at = EXCLUDED.last_success_at,
    last_failure_at = EXCLUDED.last_failure_at,
    last_error_codes = EXCLUDED.last_error_codes,
    updated_at = now();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_suppress_failed_whatsapp_numbers(
  p_min_failures INTEGER DEFAULT 3,
  p_since TIMESTAMPTZ DEFAULT now() - interval '90 days'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  WITH failed_numbers AS (
    SELECT
      cp.id AS contact_point_id,
      cp.contact_id,
      cp.normalized_value,
      count(*) FILTER (WHERE msg.current_status = 'failed') AS failed_count,
      count(*) FILTER (WHERE msg.current_status IN ('accepted', 'sent', 'delivered', 'read') OR msg.provider_message_id IS NOT NULL) AS success_count,
      max(msg.failure_code) FILTER (WHERE msg.current_status = 'failed') AS failure_code
    FROM crm.messages msg
    JOIN crm.conversations cv ON cv.id = msg.conversation_id
    JOIN crm.contact_points cp ON cp.id = cv.contact_point_id
    WHERE msg.direction = 'outbound'
      AND cp.point_type IN ('phone', 'whatsapp')
      AND msg.created_at >= p_since
    GROUP BY cp.id, cp.contact_id, cp.normalized_value
    HAVING count(*) FILTER (WHERE msg.current_status = 'failed') >= GREATEST(COALESCE(p_min_failures, 3), 1)
       AND count(*) FILTER (WHERE msg.current_status IN ('accepted', 'sent', 'delivered', 'read') OR msg.provider_message_id IS NOT NULL) = 0
  )
  INSERT INTO crm.suppressions (
    contact_id, contact_point_id, identifier_type, normalized_identifier,
    channel, reason, status, occurred_at, source, source_metadata
  )
  SELECT
    contact_id, contact_point_id, 'whatsapp', normalized_value,
    'whatsapp', 'invalid', 'active', now(), 'whatsapp_delivery_evidence',
    jsonb_build_object('failed_count', failed_count, 'failure_code', failure_code)
  FROM failed_numbers
  ON CONFLICT (identifier_type, normalized_identifier, COALESCE(channel, '*'))
  WHERE status = 'active'
  DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_whatsapp_dial_prefix_report(TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_dial_prefix_report(TEXT, INTEGER) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.crm_refresh_whatsapp_dial_prefix_policies(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_refresh_whatsapp_dial_prefix_policies(TEXT) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.crm_suppress_failed_whatsapp_numbers(INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_suppress_failed_whatsapp_numbers(INTEGER, TIMESTAMPTZ) TO authenticated, service_role;

COMMENT ON TABLE crm.whatsapp_dial_prefix_policies IS
  'Evidence-based WhatsApp reachability status by country/calling code/area code. Manual overrides can set generated_from_evidence=false.';
