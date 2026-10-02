-- Simple daily WhatsApp caps by country, city and/or industry.
-- Used by the WhatsApp Center before queueing a real campaign batch.

CREATE TABLE IF NOT EXISTS crm.whatsapp_segment_daily_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  city TEXT,
  industry TEXT,
  purpose TEXT NOT NULL DEFAULT 'marketing' CHECK (purpose IN ('marketing', 'transactional', 'service')),
  daily_message_limit INTEGER NOT NULL CHECK (daily_message_limit BETWEEN 1 AND 100000),
  daily_cost_limit NUMERIC(14, 4) CHECK (daily_cost_limit IS NULL OR daily_cost_limit >= 0),
  currency TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  timezone_name TEXT NOT NULL DEFAULT 'America/Mexico_City',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_whatsapp_segment_daily_limits_key_uidx
  ON crm.whatsapp_segment_daily_limits (
    country_code,
    COALESCE(lower(btrim(city)), ''),
    COALESCE(lower(btrim(industry)), ''),
    purpose
  );

CREATE INDEX IF NOT EXISTS crm_whatsapp_segment_daily_limits_lookup_idx
  ON crm.whatsapp_segment_daily_limits (country_code, purpose, is_active);

ALTER TABLE crm.whatsapp_segment_daily_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.whatsapp_segment_daily_limits FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE crm.whatsapp_segment_daily_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.whatsapp_segment_daily_limits TO service_role;
REVOKE DELETE ON TABLE crm.whatsapp_segment_daily_limits FROM service_role;

DROP TRIGGER IF EXISTS set_updated_at ON crm.whatsapp_segment_daily_limits;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.whatsapp_segment_daily_limits
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

CREATE OR REPLACE FUNCTION public.crm_whatsapp_segment_limit_status(
  p_country_code TEXT,
  p_city TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_purpose TEXT DEFAULT 'marketing',
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  country_code TEXT,
  city TEXT,
  industry TEXT,
  purpose TEXT,
  limit_found BOOLEAN,
  daily_message_limit INTEGER,
  sent_today INTEGER,
  remaining_today INTEGER,
  daily_cost_limit NUMERIC,
  spent_today NUMERIC,
  currency TEXT,
  allowed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  normalized_country TEXT := upper(NULLIF(btrim(COALESCE(p_country_code, 'MX')), ''));
  normalized_city TEXT := lower(NULLIF(btrim(p_city), ''));
  normalized_industry TEXT := lower(NULLIF(btrim(p_industry), ''));
  normalized_purpose TEXT := COALESCE(NULLIF(btrim(p_purpose), ''), 'marketing');
  limit_record RECORD;
  day_start TIMESTAMPTZ;
  day_end TIMESTAMPTZ;
  sent_count INTEGER := 0;
  spend_amount NUMERIC := 0;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT wsl.* INTO limit_record
  FROM crm.whatsapp_segment_daily_limits wsl
  WHERE wsl.is_active = true
    AND wsl.country_code = normalized_country
    AND wsl.purpose = normalized_purpose
    AND (wsl.city IS NULL OR lower(btrim(wsl.city)) = normalized_city)
    AND (wsl.industry IS NULL OR lower(btrim(wsl.industry)) = normalized_industry)
  ORDER BY
    CASE WHEN wsl.city IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN wsl.industry IS NOT NULL THEN 1 ELSE 0 END DESC,
    wsl.updated_at DESC
  LIMIT 1;

  IF limit_record.id IS NULL THEN
    RETURN QUERY SELECT
      normalized_country,
      NULLIF(p_city, ''),
      NULLIF(p_industry, ''),
      normalized_purpose,
      false,
      NULL::INTEGER,
      0,
      NULL::INTEGER,
      NULL::NUMERIC,
      0::NUMERIC,
      NULL::TEXT,
      true;
    RETURN;
  END IF;

  day_start := date_trunc('day', p_now AT TIME ZONE limit_record.timezone_name) AT TIME ZONE limit_record.timezone_name;
  day_end := day_start + interval '1 day';

  SELECT count(*)::INTEGER INTO sent_count
  FROM crm.messages msg
  JOIN crm.campaigns c ON c.id = msg.crm_campaign_id
  WHERE msg.direction = 'outbound'
    AND msg.current_status <> 'failed'
    AND c.channel = 'whatsapp'
    AND c.purpose = normalized_purpose
    AND upper(COALESCE(c.audience_rule->>'country_code', 'MX')) = normalized_country
    AND (limit_record.city IS NULL OR lower(COALESCE(c.audience_rule->>'city', '')) = lower(btrim(limit_record.city)))
    AND (limit_record.industry IS NULL OR lower(COALESCE(c.audience_rule->>'industry', '')) = lower(btrim(limit_record.industry)))
    AND msg.created_at >= day_start
    AND msg.created_at < day_end;

  SELECT COALESCE(sum(
    COALESCE(ul.confirmed_unit_cost, ul.reserved_amount, ul.estimated_unit_cost, 0) * ul.quantity
  ), 0) INTO spend_amount
  FROM crm.usage_ledger ul
  JOIN crm.messages msg ON msg.id = ul.message_id
  JOIN crm.campaigns c ON c.id = msg.crm_campaign_id
  WHERE msg.direction = 'outbound'
    AND msg.current_status <> 'failed'
    AND COALESCE(ul.reservation_status, 'committed') <> 'released'
    AND c.channel = 'whatsapp'
    AND c.purpose = normalized_purpose
    AND upper(COALESCE(c.audience_rule->>'country_code', 'MX')) = normalized_country
    AND (limit_record.city IS NULL OR lower(COALESCE(c.audience_rule->>'city', '')) = lower(btrim(limit_record.city)))
    AND (limit_record.industry IS NULL OR lower(COALESCE(c.audience_rule->>'industry', '')) = lower(btrim(limit_record.industry)))
    AND msg.created_at >= day_start
    AND msg.created_at < day_end;

  RETURN QUERY SELECT
    limit_record.country_code,
    limit_record.city,
    limit_record.industry,
    limit_record.purpose,
    true,
    limit_record.daily_message_limit,
    sent_count,
    GREATEST(limit_record.daily_message_limit - sent_count, 0),
    limit_record.daily_cost_limit,
    spend_amount,
    limit_record.currency,
    sent_count < limit_record.daily_message_limit
      AND (limit_record.daily_cost_limit IS NULL OR spend_amount < limit_record.daily_cost_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.crm_whatsapp_segment_limit_status(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_segment_limit_status(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  TO authenticated, service_role;

INSERT INTO crm.whatsapp_segment_daily_limits (
  country_code, city, industry, purpose, daily_message_limit, daily_cost_limit, currency, timezone_name, notes
)
VALUES (
  'MX', NULL, NULL, 'marketing', 20, NULL, 'MXN', 'America/Mexico_City',
  'Default pilot cap: start with 20 WhatsApp campaign messages per day in Mexico.'
)
ON CONFLICT (country_code, COALESCE(lower(btrim(city)), ''), COALESCE(lower(btrim(industry)), ''), purpose)
DO UPDATE SET
  daily_message_limit = LEAST(crm.whatsapp_segment_daily_limits.daily_message_limit, EXCLUDED.daily_message_limit),
  currency = COALESCE(crm.whatsapp_segment_daily_limits.currency, EXCLUDED.currency),
  timezone_name = COALESCE(crm.whatsapp_segment_daily_limits.timezone_name, EXCLUDED.timezone_name),
  notes = COALESCE(crm.whatsapp_segment_daily_limits.notes, EXCLUDED.notes),
  updated_at = now();

COMMENT ON TABLE crm.whatsapp_segment_daily_limits IS
  'Simple operator-controlled WhatsApp daily caps by country, city and/or industry.';
