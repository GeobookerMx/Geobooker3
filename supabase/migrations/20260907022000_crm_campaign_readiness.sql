-- CRM campaign readiness foundation.
--
-- This migration does not send messages and does not promote imported leads. It
-- creates campaign draft/audience tables plus a read-only admin summary for
-- deciding whether WhatsApp campaigns can safely move toward approval.

CREATE TABLE IF NOT EXISTS crm.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key TEXT UNIQUE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'mixed')),
  purpose TEXT NOT NULL CHECK (purpose IN ('marketing', 'transactional', 'service')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'review_ready', 'approved', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed')
  ),
  audience_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_id UUID REFERENCES crm.whatsapp_templates(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((status IN ('approved', 'scheduled', 'running', 'completed') AND approved_at IS NOT NULL) OR status NOT IN ('approved', 'scheduled', 'running', 'completed')),
  CHECK (channel <> 'whatsapp' OR template_id IS NOT NULL OR purpose = 'service')
);

CREATE TABLE IF NOT EXISTS crm.campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES crm.campaigns(id) ON DELETE CASCADE,
  account_id UUID REFERENCES crm.accounts(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES crm.contacts(id) ON DELETE RESTRICT,
  contact_point_id UUID REFERENCES crm.contact_points(id) ON DELETE SET NULL,
  eligibility_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    eligibility_status IN ('pending', 'eligible', 'needs_review', 'suppressed', 'missing_consent', 'invalid_contact', 'duplicate', 'excluded')
  ),
  eligibility_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC(5,2) CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  queued_job_id UUID REFERENCES crm.outbound_jobs(id) ON DELETE SET NULL,
  provider_message_id TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id, contact_point_id)
);

CREATE TABLE IF NOT EXISTS crm.campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES crm.campaigns(id) ON DELETE CASCADE,
  member_id UUID REFERENCES crm.campaign_members(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_campaigns_status_idx
  ON crm.campaigns (channel, status, scheduled_at);
CREATE INDEX IF NOT EXISTS crm_campaign_members_eligibility_idx
  ON crm.campaign_members (campaign_id, eligibility_status);
CREATE INDEX IF NOT EXISTS crm_campaign_members_contact_idx
  ON crm.campaign_members (contact_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS crm_campaign_events_timeline_idx
  ON crm.campaign_events (campaign_id, occurred_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['campaigns', 'campaign_members', 'campaign_events'] LOOP
    EXECUTE format('ALTER TABLE crm.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE crm.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE crm.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE crm.%I TO service_role', table_name);
    EXECUTE format('REVOKE DELETE ON TABLE crm.%I FROM service_role', table_name);
  END LOOP;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['campaigns', 'campaign_members'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON crm.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON crm.%I FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at()',
      table_name
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_campaign_readiness_overview()
RETURNS TABLE (
  active_contacts BIGINT,
  whatsapp_valid_points BIGINT,
  whatsapp_marketing_opted_in BIGINT,
  whatsapp_service_allowed BIGINT,
  whatsapp_suppressed BIGINT,
  whatsapp_unknown_or_missing BIGINT,
  draft_campaigns BIGINT,
  review_ready_campaigns BIGINT,
  pending_outbound_jobs BIGINT,
  retry_outbound_jobs BIGINT,
  dead_letter_outbound_jobs BIGINT,
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
  WITH active_whatsapp_points AS (
    SELECT DISTINCT cp.contact_id, cp.id AS contact_point_id, cp.normalized_value
    FROM crm.contact_points cp
    JOIN crm.contacts c ON c.id = cp.contact_id
    WHERE c.contact_status = 'active'
      AND cp.point_type = 'whatsapp'
      AND cp.validation_status = 'valid'
  ),
  whatsapp_permissions AS (
    SELECT contact_id,
      bool_or(channel = 'whatsapp' AND purpose = 'marketing' AND status IN ('allowed', 'opted_in')) AS marketing_opted_in,
      bool_or(channel = 'whatsapp' AND purpose = 'service' AND status IN ('allowed', 'opted_in')) AS service_allowed,
      bool_or(channel = 'whatsapp' AND status IN ('opted_out', 'suppressed', 'invalid', 'complaint')) AS blocked
    FROM crm.channel_permissions
    GROUP BY contact_id
  ),
  active_suppressions AS (
    SELECT DISTINCT normalized_identifier
    FROM crm.suppressions
    WHERE status = 'active'
      AND identifier_type = 'whatsapp'
      AND (channel = 'whatsapp' OR channel IS NULL)
  )
  SELECT
    (SELECT count(*) FROM crm.contacts WHERE contact_status = 'active'),
    (SELECT count(*) FROM active_whatsapp_points),
    (SELECT count(*) FROM active_whatsapp_points p
      LEFT JOIN active_suppressions s ON s.normalized_identifier = p.normalized_value
      LEFT JOIN whatsapp_permissions perm ON perm.contact_id = p.contact_id
      WHERE s.normalized_identifier IS NULL
        AND COALESCE(perm.blocked, false) = false
        AND COALESCE(perm.marketing_opted_in, false) = true),
    (SELECT count(*) FROM active_whatsapp_points p
      LEFT JOIN active_suppressions s ON s.normalized_identifier = p.normalized_value
      LEFT JOIN whatsapp_permissions perm ON perm.contact_id = p.contact_id
      WHERE s.normalized_identifier IS NULL
        AND COALESCE(perm.blocked, false) = false
        AND COALESCE(perm.service_allowed, false) = true),
    (SELECT count(*) FROM active_whatsapp_points p
      LEFT JOIN active_suppressions s ON s.normalized_identifier = p.normalized_value
      LEFT JOIN whatsapp_permissions perm ON perm.contact_id = p.contact_id
      WHERE s.normalized_identifier IS NOT NULL OR COALESCE(perm.blocked, false) = true),
    (SELECT count(*) FROM active_whatsapp_points p
      LEFT JOIN active_suppressions s ON s.normalized_identifier = p.normalized_value
      LEFT JOIN whatsapp_permissions perm ON perm.contact_id = p.contact_id
      WHERE s.normalized_identifier IS NULL
        AND COALESCE(perm.blocked, false) = false
        AND COALESCE(perm.marketing_opted_in, false) = false
        AND COALESCE(perm.service_allowed, false) = false),
    (SELECT count(*) FROM crm.campaigns WHERE status = 'draft'),
    (SELECT count(*) FROM crm.campaigns WHERE status = 'review_ready'),
    (SELECT count(*) FROM crm.outbound_jobs WHERE status = 'pending'),
    (SELECT count(*) FROM crm.outbound_jobs WHERE status = 'retry'),
    (SELECT count(*) FROM crm.outbound_jobs WHERE status = 'dead_letter'),
    now();
END;
$$;

REVOKE ALL ON FUNCTION public.crm_campaign_readiness_overview()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_campaign_readiness_overview()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.crm_campaign_readiness_overview() IS
  'Admin-only aggregate readiness view for CRM campaigns. It sends nothing.';
