-- International WhatsApp marketing governance and evidenced-consent gate.
--
-- All seeded markets start disabled and require an explicit operational/legal
-- review. This migration never schedules, queues, or sends a message.

CREATE TABLE IF NOT EXISTS crm.market_policies (
  country_code TEXT PRIMARY KEY CHECK (country_code ~ '^[A-Z]{2}$'),
  market_name TEXT NOT NULL,
  region TEXT NOT NULL,
  priority_cohort TEXT,
  market_status TEXT NOT NULL DEFAULT 'research' CHECK (
    market_status IN ('research', 'legal_review', 'pilot', 'approved', 'blocked')
  ),
  whatsapp_marketing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  requires_evidenced_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  daily_recipient_cap INTEGER NOT NULL DEFAULT 25 CHECK (daily_recipient_cap BETWEEN 1 AND 100000),
  primary_language_code TEXT,
  primary_timezone TEXT,
  policy_notes TEXT,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    NOT whatsapp_marketing_enabled
    OR (market_status IN ('pilot', 'approved') AND reviewed_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS crm.consent_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_permission_id UUID NOT NULL REFERENCES crm.channel_permissions(id) ON DELETE RESTRICT,
  contact_id UUID NOT NULL REFERENCES crm.contacts(id) ON DELETE RESTRICT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'phone')),
  purpose TEXT NOT NULL CHECK (purpose IN ('marketing', 'transactional', 'service')),
  evidence_type TEXT NOT NULL CHECK (
    evidence_type IN ('form_submit', 'inbound_request', 'contract', 'event_registration', 'qr_scan', 'manual_verified', 'other')
  ),
  evidence_reference TEXT,
  evidence_sha256 TEXT CHECK (evidence_sha256 IS NULL OR evidence_sha256 ~ '^[a-f0-9]{64}$'),
  consent_text_version TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  captured_country_code TEXT CHECK (captured_country_code IS NULL OR captured_country_code ~ '^[A-Z]{2}$'),
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel_permission_id, evidence_type, consent_text_version, captured_at)
);

CREATE INDEX IF NOT EXISTS crm_market_policies_status_idx
  ON crm.market_policies (market_status, whatsapp_marketing_enabled, priority_cohort);
CREATE INDEX IF NOT EXISTS crm_consent_evidence_permission_idx
  ON crm.consent_evidence (channel_permission_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS crm_consent_evidence_contact_idx
  ON crm.consent_evidence (contact_id, channel, purpose, captured_at DESC);

ALTER TABLE crm.market_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.market_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.consent_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.consent_evidence FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE crm.market_policies FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE crm.consent_evidence FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.market_policies TO service_role;
GRANT SELECT, INSERT ON TABLE crm.consent_evidence TO service_role;
REVOKE DELETE ON TABLE crm.market_policies FROM service_role;
REVOKE UPDATE, DELETE ON TABLE crm.consent_evidence FROM service_role;

DROP TRIGGER IF EXISTS set_updated_at ON crm.market_policies;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.market_policies
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- This is a commercial research cohort, not a legal approval or a claim that
-- every market has the same WhatsApp adoption. Operators must review each row.
INSERT INTO crm.market_policies (
  country_code, market_name, region, priority_cohort,
  primary_language_code, primary_timezone, policy_notes
)
VALUES
  ('US', 'United States', 'North America', 'high_value_20', 'en', 'America/New_York', 'Validate federal and state outreach rules before pilot.'),
  ('CA', 'Canada', 'North America', 'high_value_20', 'en', 'America/Toronto', 'Validate CASL and provincial privacy requirements before pilot.'),
  ('GB', 'United Kingdom', 'Western Europe', 'high_value_20', 'en', 'Europe/London', 'Validate UK GDPR and PECR requirements before pilot.'),
  ('DE', 'Germany', 'Western Europe', 'high_value_20', 'de', 'Europe/Berlin', 'Validate GDPR and national electronic marketing rules before pilot.'),
  ('FR', 'France', 'Western Europe', 'high_value_20', 'fr', 'Europe/Paris', 'Validate GDPR and national electronic marketing rules before pilot.'),
  ('ES', 'Spain', 'Western Europe', 'high_value_20', 'es', 'Europe/Madrid', 'Validate GDPR and national electronic marketing rules before pilot.'),
  ('IT', 'Italy', 'Western Europe', 'high_value_20', 'it', 'Europe/Rome', 'Validate GDPR and national electronic marketing rules before pilot.'),
  ('NL', 'Netherlands', 'Western Europe', 'high_value_20', 'nl', 'Europe/Amsterdam', 'Validate GDPR and national electronic marketing rules before pilot.'),
  ('CH', 'Switzerland', 'Western Europe', 'high_value_20', 'de', 'Europe/Zurich', 'Validate Swiss privacy and electronic marketing rules before pilot.'),
  ('AT', 'Austria', 'Western Europe', 'high_value_20', 'de', 'Europe/Vienna', 'Validate GDPR and national electronic marketing rules before pilot.'),
  ('IE', 'Ireland', 'Western Europe', 'high_value_20', 'en', 'Europe/Dublin', 'Validate GDPR and ePrivacy requirements before pilot.'),
  ('NO', 'Norway', 'Northern Europe', 'high_value_20', 'no', 'Europe/Oslo', 'Validate EEA privacy and electronic marketing rules before pilot.'),
  ('SE', 'Sweden', 'Northern Europe', 'high_value_20', 'sv', 'Europe/Stockholm', 'Validate EEA privacy and electronic marketing rules before pilot.'),
  ('DK', 'Denmark', 'Northern Europe', 'high_value_20', 'da', 'Europe/Copenhagen', 'Validate EEA privacy and electronic marketing rules before pilot.'),
  ('FI', 'Finland', 'Northern Europe', 'high_value_20', 'fi', 'Europe/Helsinki', 'Validate EEA privacy and electronic marketing rules before pilot.'),
  ('AU', 'Australia', 'Asia Pacific', 'high_value_20', 'en', 'Australia/Sydney', 'Validate Spam Act and privacy requirements before pilot.'),
  ('NZ', 'New Zealand', 'Asia Pacific', 'high_value_20', 'en', 'Pacific/Auckland', 'Validate unsolicited electronic messaging rules before pilot.'),
  ('SG', 'Singapore', 'Asia Pacific', 'high_value_20', 'en', 'Asia/Singapore', 'Validate PDPA and Do Not Call requirements before pilot.'),
  ('AE', 'United Arab Emirates', 'Middle East', 'high_value_20', 'en', 'Asia/Dubai', 'Validate local privacy, telecom, and marketing requirements before pilot.'),
  ('SA', 'Saudi Arabia', 'Middle East', 'high_value_20', 'ar', 'Asia/Riyadh', 'Validate local privacy, telecom, and marketing requirements before pilot.')
ON CONFLICT (country_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.crm_whatsapp_international_readiness()
RETURNS TABLE (
  country_code TEXT,
  market_name TEXT,
  region TEXT,
  priority_cohort TEXT,
  market_status TEXT,
  whatsapp_marketing_enabled BOOLEAN,
  daily_recipient_cap INTEGER,
  opted_in_contacts BIGINT,
  evidenced_contacts BIGINT,
  ready_contacts BIGINT,
  generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    mp.country_code,
    mp.market_name,
    mp.region,
    mp.priority_cohort,
    mp.market_status,
    mp.whatsapp_marketing_enabled,
    mp.daily_recipient_cap,
    count(DISTINCT cp.contact_id) FILTER (
      WHERE perm.status = 'opted_in'
        AND perm.consented_at IS NOT NULL
        AND NULLIF(btrim(perm.consent_source), '') IS NOT NULL
        AND NULLIF(btrim(perm.consent_text_version), '') IS NOT NULL
    ) AS opted_in_contacts,
    count(DISTINCT cp.contact_id) FILTER (
      WHERE evidence.id IS NOT NULL
    ) AS evidenced_contacts,
    count(DISTINCT cp.contact_id) FILTER (
      WHERE mp.whatsapp_marketing_enabled
        AND mp.market_status IN ('pilot', 'approved')
        AND mp.reviewed_at IS NOT NULL
        AND cp.validation_status = 'valid'
        AND perm.status = 'opted_in'
        AND perm.consented_at IS NOT NULL
        AND NULLIF(btrim(perm.consent_source), '') IS NOT NULL
        AND NULLIF(btrim(perm.consent_text_version), '') IS NOT NULL
        AND evidence.id IS NOT NULL
        AND suppression.id IS NULL
    ) AS ready_contacts,
    now()
  FROM crm.market_policies mp
  LEFT JOIN crm.contacts c
    ON c.country_code = mp.country_code AND c.contact_status = 'active'
  LEFT JOIN crm.contact_points cp
    ON cp.contact_id = c.id AND cp.point_type = 'whatsapp'
  LEFT JOIN crm.channel_permissions perm
    ON perm.contact_id = c.id AND perm.channel = 'whatsapp' AND perm.purpose = 'marketing'
  LEFT JOIN LATERAL (
    SELECT ce.id
    FROM crm.consent_evidence ce
    WHERE ce.channel_permission_id = perm.id
      AND ce.contact_id = c.id
      AND ce.channel = 'whatsapp'
      AND ce.purpose = 'marketing'
    ORDER BY ce.captured_at DESC
    LIMIT 1
  ) evidence ON TRUE
  LEFT JOIN LATERAL (
    SELECT s.id
    FROM crm.suppressions s
    WHERE s.status = 'active'
      AND s.identifier_type = 'whatsapp'
      AND (s.channel = 'whatsapp' OR s.channel IS NULL)
      AND s.normalized_identifier = cp.normalized_value
    LIMIT 1
  ) suppression ON TRUE
  GROUP BY mp.country_code, mp.market_name, mp.region, mp.priority_cohort,
    mp.market_status, mp.whatsapp_marketing_enabled, mp.daily_recipient_cap
  ORDER BY mp.priority_cohort NULLS LAST, mp.market_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_whatsapp_campaign_market_check(p_campaign_id UUID)
RETURNS TABLE (
  campaign_id UUID,
  is_market_ready BOOLEAN,
  market_count INTEGER,
  missing_country_members INTEGER,
  unapproved_market_members INTEGER,
  missing_evidence_members INTEGER,
  markets JSONB,
  reasons JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  campaign_record RECORD;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT c.id, c.channel, c.purpose INTO campaign_record
  FROM crm.campaigns c WHERE c.id = p_campaign_id;

  IF campaign_record.id IS NULL OR campaign_record.channel <> 'whatsapp' THEN
    RAISE EXCEPTION 'whatsapp_campaign_not_found' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT
      cm.id,
      cm.contact_id,
      cm.contact_point_id,
      COALESCE(c.country_code, a.country_code, cp.country_code) AS country_code,
      cp.normalized_value,
      perm.id AS permission_id,
      perm.status AS permission_status,
      perm.consented_at,
      perm.consent_source,
      perm.consent_text_version,
      mp.market_name,
      mp.market_status,
      mp.whatsapp_marketing_enabled,
      mp.reviewed_at,
      EXISTS (
        SELECT 1 FROM crm.consent_evidence ce
        WHERE ce.channel_permission_id = perm.id
          AND ce.contact_id = cm.contact_id
          AND ce.channel = 'whatsapp'
          AND ce.purpose = 'marketing'
      ) AS has_evidence
    FROM crm.campaign_members cm
    JOIN crm.contacts c ON c.id = cm.contact_id
    LEFT JOIN crm.accounts a ON a.id = cm.account_id
    LEFT JOIN crm.contact_points cp ON cp.id = cm.contact_point_id
    LEFT JOIN crm.channel_permissions perm
      ON perm.contact_id = cm.contact_id
      AND perm.channel = 'whatsapp'
      AND perm.purpose = campaign_record.purpose
    LEFT JOIN crm.market_policies mp
      ON mp.country_code = COALESCE(c.country_code, a.country_code, cp.country_code)
    WHERE cm.campaign_id = p_campaign_id
      AND cm.eligibility_status = 'eligible'
  ), stats AS (
    SELECT
      count(DISTINCT country_code)::integer AS market_count,
      count(*) FILTER (
        WHERE campaign_record.purpose = 'marketing' AND country_code IS NULL
      )::integer AS missing_country,
      count(*) FILTER (
        WHERE campaign_record.purpose = 'marketing' AND country_code IS NOT NULL AND (
          market_name IS NULL OR market_status NOT IN ('pilot', 'approved')
          OR NOT COALESCE(whatsapp_marketing_enabled, false) OR reviewed_at IS NULL
        )
      )::integer AS unapproved_market,
      count(*) FILTER (
        WHERE campaign_record.purpose = 'marketing' AND (
          permission_status IS DISTINCT FROM 'opted_in'
          OR consented_at IS NULL
          OR NULLIF(btrim(consent_source), '') IS NULL
          OR NULLIF(btrim(consent_text_version), '') IS NULL
          OR NOT has_evidence
        )
      )::integer AS missing_evidence
    FROM members
  ), market_list AS (
    SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
      'country_code', country_code,
      'market_name', market_name,
      'market_status', market_status,
      'marketing_enabled', COALESCE(whatsapp_marketing_enabled, false)
    )), '[]'::jsonb) AS value
    FROM members
    WHERE country_code IS NOT NULL
  )
  SELECT
    p_campaign_id,
    stats.missing_country = 0
      AND stats.unapproved_market = 0
      AND stats.missing_evidence = 0,
    stats.market_count,
    stats.missing_country,
    stats.unapproved_market,
    stats.missing_evidence,
    market_list.value,
    COALESCE((
      SELECT jsonb_agg(reason)
      FROM (VALUES
        (CASE WHEN stats.missing_country > 0 THEN 'member_country_required' END),
        (CASE WHEN stats.unapproved_market > 0 THEN 'market_not_approved_for_whatsapp_marketing' END),
        (CASE WHEN stats.missing_evidence > 0 THEN 'evidenced_marketing_opt_in_required' END)
      ) AS reason_rows(reason)
      WHERE reason IS NOT NULL
    ), '[]'::jsonb)
  FROM stats CROSS JOIN market_list;
END;
$$;

CREATE OR REPLACE FUNCTION crm.enforce_whatsapp_marketing_campaign_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  gate RECORD;
BEGIN
  IF NEW.channel <> 'whatsapp' OR NEW.purpose <> 'marketing'
    OR NEW.status NOT IN ('approved', 'scheduled', 'running') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO gate
  FROM public.crm_whatsapp_campaign_market_check(NEW.id);

  IF gate.is_market_ready IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'international_marketing_gate_blocked: %', gate.reasons
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_whatsapp_marketing_campaign_gate ON crm.campaigns;
CREATE TRIGGER enforce_whatsapp_marketing_campaign_gate
  BEFORE INSERT OR UPDATE OF status ON crm.campaigns
  FOR EACH ROW EXECUTE FUNCTION crm.enforce_whatsapp_marketing_campaign_gate();

REVOKE ALL ON FUNCTION public.crm_whatsapp_international_readiness() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_international_readiness() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.crm_whatsapp_campaign_market_check(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_campaign_market_check(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION crm.enforce_whatsapp_marketing_campaign_gate() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE crm.market_policies IS
  'Configurable market launch gates. Seed rows are research candidates and disabled by default.';
COMMENT ON TABLE crm.consent_evidence IS
  'Append-only evidence supporting channel permission decisions; secrets and raw access tokens are prohibited.';
COMMENT ON FUNCTION public.crm_whatsapp_campaign_market_check(UUID) IS
  'Admin-only international market and evidenced-consent gate. It never queues or sends messages.';
