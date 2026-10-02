-- International Strategic Accounts CRM, Phase 2.
--
-- Additive hardening for account-based outreach:
-- - account plan and evidence records
-- - buying committee roles
-- - provider plan snapshots and zero-spend controls
-- - transactional outbox for CRM conversion
--
-- This migration sends no email, calls no provider API and stores no secrets.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF to_regclass('crm.intl_accounts') IS NULL THEN
    RAISE EXCEPTION 'crm_international_outreach_phase1_required';
  END IF;
END;
$$;

ALTER TABLE crm.intl_settings
  ADD COLUMN IF NOT EXISTS provider_monthly_budget_usd NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (provider_monthly_budget_usd = 0),
  ADD COLUMN IF NOT EXISTS allow_paid_overage BOOLEAN NOT NULL DEFAULT FALSE CHECK (allow_paid_overage = FALSE),
  ADD COLUMN IF NOT EXISTS auto_purchase_credits BOOLEAN NOT NULL DEFAULT FALSE CHECK (auto_purchase_credits = FALSE),
  ADD COLUMN IF NOT EXISTS autosend_enabled BOOLEAN NOT NULL DEFAULT FALSE CHECK (autosend_enabled = FALSE),
  ADD COLUMN IF NOT EXISTS crm_bridge_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS strategic_crm_version TEXT NOT NULL DEFAULT 'strategic_accounts_v2';

ALTER TABLE crm.intl_provider_connections
  ADD COLUMN IF NOT EXISTS provider_plan_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS zero_cost_guard BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS paid_overage_allowed BOOLEAN NOT NULL DEFAULT FALSE CHECK (paid_overage_allowed = FALSE),
  ADD COLUMN IF NOT EXISTS auto_purchase_enabled BOOLEAN NOT NULL DEFAULT FALSE CHECK (auto_purchase_enabled = FALSE);

ALTER TABLE crm.intl_contacts
  ADD COLUMN IF NOT EXISTS active_contact_for_account BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS crm_bridge_status TEXT NOT NULL DEFAULT 'not_ready'
    CHECK (crm_bridge_status IN ('not_ready', 'qualified', 'queued', 'converted', 'merge_review', 'failed', 'blocked')),
  ADD COLUMN IF NOT EXISTS crm_bridge_rationale TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS crm_intl_one_active_contact_per_account_uidx
  ON crm.intl_contacts (account_id)
  WHERE active_contact_for_account = TRUE
    AND stage NOT IN ('CLOSED', 'STOPPED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINT', 'BLOCKED', 'ARCHIVED');

CREATE TABLE IF NOT EXISTS crm.intl_account_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES crm.intl_accounts(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  business_model TEXT,
  markets JSONB NOT NULL DEFAULT '[]'::jsonb,
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  hypotheses JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (evidence_status IN ('draft', 'needs_review', 'approved', 'rejected', 'expired')),
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (evidence_status <> 'approved' OR (reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS crm_intl_account_research_review_idx
  ON crm.intl_account_research (evidence_status, expires_at, created_at DESC);

CREATE TABLE IF NOT EXISTS crm.intl_claims_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_key TEXT NOT NULL UNIQUE,
  claim_text TEXT NOT NULL,
  product_area TEXT NOT NULL CHECK (product_area IN ('ads', 'enterprise', 'global', 'geoscore', 'app', 'other')),
  language_code TEXT NOT NULL DEFAULT 'en',
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'retired')),
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'approved' OR (approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS crm.intl_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES crm.intl_accounts(id) ON DELETE CASCADE,
  research_id UUID REFERENCES crm.intl_account_research(id) ON DELETE SET NULL,
  url TEXT NOT NULL CHECK (url ~* '^https://'),
  title TEXT,
  publisher TEXT,
  observed_at TIMESTAMPTZ,
  excerpt TEXT NOT NULL CHECK (length(excerpt) <= 1000),
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  claim_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'approved', 'rejected', 'expired')),
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'approved' OR (reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS crm_intl_evidence_account_status_idx
  ON crm.intl_evidence (account_id, status, observed_at DESC);

CREATE TABLE IF NOT EXISTS crm.intl_buying_committee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES crm.intl_accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm.intl_contacts(id) ON DELETE SET NULL,
  committee_role TEXT NOT NULL CHECK (
    committee_role IN (
      'economic_buyer', 'marketing_media_owner', 'expansion_real_estate_owner',
      'operations_owner', 'procurement', 'legal', 'local_market_sponsor',
      'champion', 'influencer', 'unknown'
    )
  ),
  influence_level TEXT NOT NULL DEFAULT 'unknown' CHECK (influence_level IN ('high', 'medium', 'low', 'unknown')),
  relevance_reason TEXT,
  active_contact BOOLEAN NOT NULL DEFAULT FALSE,
  source_evidence_id UUID REFERENCES crm.intl_evidence(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, committee_role, contact_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_intl_buying_committee_one_active_uidx
  ON crm.intl_buying_committee (account_id)
  WHERE active_contact = TRUE;

ALTER TABLE crm.intl_outreach_briefs
  ADD COLUMN IF NOT EXISTS evidence_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  ADD COLUMN IF NOT EXISTS approved_claim_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  ADD COLUMN IF NOT EXISTS brief_url TEXT CHECK (brief_url IS NULL OR brief_url ~* '^https://'),
  ADD COLUMN IF NOT EXISTS human_approved BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS crm.intl_crm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('account', 'contact', 'campaign_contact', 'reply')),
  source_id UUID NOT NULL,
  crm_type TEXT NOT NULL CHECK (crm_type IN ('account', 'contact', 'opportunity', 'activity')),
  crm_id UUID NOT NULL,
  mapping_version TEXT NOT NULL DEFAULT 'strategic_accounts_v2',
  idempotency_key TEXT NOT NULL UNIQUE,
  converted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS crm.intl_integration_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'INTL_LEAD_QUALIFIED', 'CRM_LINK_CREATED', 'GLOBAL_SUPPRESSION_CHANGED', 'CRM_OPPORTUNITY_UPDATED'
  )),
  aggregate_type TEXT NOT NULL CHECK (aggregate_type IN ('account', 'contact', 'campaign_contact', 'suppression', 'opportunity')),
  aggregate_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_minimized JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'published', 'failed', 'poison')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS crm_intl_integration_outbox_pending_idx
  ON crm.intl_integration_outbox (processing_status, occurred_at)
  WHERE processing_status IN ('pending', 'failed');

CREATE OR REPLACE FUNCTION public.crm_intl_mark_qualified(
  p_campaign_contact_id UUID,
  p_rationale TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  member crm.intl_campaign_contacts%ROWTYPE;
  contact crm.intl_contacts%ROWTYPE;
  account crm.intl_accounts%ROWTYPE;
  event_key TEXT;
  outbox_id UUID;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO member
  FROM crm.intl_campaign_contacts
  WHERE id = p_campaign_contact_id
  FOR UPDATE;

  IF member.id IS NULL THEN
    RAISE EXCEPTION 'campaign_contact_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF member.review_decision <> 'approved' THEN
    RAISE EXCEPTION 'campaign_contact_not_approved';
  END IF;

  SELECT * INTO contact
  FROM crm.intl_contacts
  WHERE id = member.contact_id
  FOR UPDATE;

  SELECT * INTO account
  FROM crm.intl_accounts
  WHERE id = contact.account_id
  FOR UPDATE;

  IF contact.outreach_tier NOT IN ('AAA', 'AA') THEN
    RAISE EXCEPTION 'only_aaa_aa_can_convert';
  END IF;

  IF contact.compliance_status NOT IN ('ALLOWED', 'CORPORATE_ONLY') THEN
    RAISE EXCEPTION 'compliance_not_approved';
  END IF;

  event_key := 'intl-qualified:' || member.id::text;

  UPDATE crm.intl_contacts
  SET stage = 'QUALIFIED',
      crm_bridge_status = 'qualified',
      crm_bridge_rationale = NULLIF(BTRIM(p_rationale), ''),
      updated_at = now()
  WHERE id = contact.id;

  INSERT INTO crm.intl_integration_outbox (
    event_type, aggregate_type, aggregate_id, idempotency_key, payload_minimized
  )
  VALUES (
    'INTL_LEAD_QUALIFIED',
    'campaign_contact',
    member.id,
    event_key,
    jsonb_build_object(
      'campaign_contact_id', member.id,
      'account_id', account.id,
      'contact_id', contact.id,
      'account_name', account.company_name,
      'domain', account.normalized_domain,
      'contact_name', contact.full_name,
      'contact_email_hash', encode(extensions.digest(lower(coalesce(contact.normalized_email, '')), 'sha256'), 'hex'),
      'tier', contact.outreach_tier,
      'rationale', NULLIF(BTRIM(p_rationale), '')
    )
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    processing_status = CASE
      WHEN crm.intl_integration_outbox.processing_status = 'published' THEN 'published'
      ELSE 'pending'
    END,
    updated_at = now()
  RETURNING id INTO outbox_id;

  INSERT INTO crm.intl_audit_log (
    actor_user_id, actor_type, action, entity_type, entity_id, new_values
  )
  VALUES (
    auth.uid(), 'user', 'intl_lead_qualified', 'campaign_contact', member.id,
    jsonb_build_object('outbox_id', outbox_id, 'rationale', NULLIF(BTRIM(p_rationale), ''))
  );

  RETURN jsonb_build_object(
    'status', 'QUALIFIED',
    'campaignContactId', member.id,
    'contactId', contact.id,
    'accountId', account.id,
    'outboxId', outbox_id,
    'idempotencyKey', event_key
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_intl_strategic_readiness()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  cfg crm.intl_settings%ROWTYPE;
  phase1 JSONB;
  checks JSONB;
  blockers JSONB;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO cfg FROM crm.intl_settings WHERE settings_key = 'default';
  phase1 := public.crm_intl_outreach_readiness();

  checks := jsonb_build_array(
    jsonb_build_object('key','phase1','label','International Outreach Phase 1','required',true,'pass',(phase1->>'status') = 'READY'),
    jsonb_build_object('key','zero_spend','label','Zero spend guard','required',true,'pass',cfg.provider_monthly_budget_usd = 0 AND NOT cfg.allow_paid_overage AND NOT cfg.auto_purchase_credits),
    jsonb_build_object('key','autosend','label','Autosend disabled','required',true,'pass',NOT cfg.autosend_enabled),
    jsonb_build_object('key','research','label','Account plans table','required',true,'pass',to_regclass('crm.intl_account_research') IS NOT NULL),
    jsonb_build_object('key','evidence','label','Evidence table','required',true,'pass',to_regclass('crm.intl_evidence') IS NOT NULL),
    jsonb_build_object('key','committee','label','Buying committee table','required',true,'pass',to_regclass('crm.intl_buying_committee') IS NOT NULL),
    jsonb_build_object('key','outbox','label','CRM bridge outbox','required',true,'pass',to_regclass('crm.intl_integration_outbox') IS NOT NULL),
    jsonb_build_object('key','links','label','CRM links table','required',true,'pass',to_regclass('crm.intl_crm_links') IS NOT NULL)
  );

  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) INTO blockers
  FROM jsonb_array_elements(checks) item
  WHERE (item->>'required')::boolean AND NOT (item->>'pass')::boolean;

  RETURN jsonb_build_object(
    'status', CASE WHEN jsonb_array_length(blockers) = 0 THEN 'READY' ELSE 'NOT_READY' END,
    'autosend', false,
    'providerMonthlyBudgetUsd', 0,
    'phase1', phase1,
    'checks', checks,
    'blockers', blockers,
    'generatedAt', now()
  );
END;
$$;

UPDATE crm.intl_settings
SET provider_monthly_budget_usd = 0,
    allow_paid_overage = FALSE,
    auto_purchase_credits = FALSE,
    autosend_enabled = FALSE,
    send_enabled = FALSE,
    kill_switch = TRUE,
    updated_at = now()
WHERE settings_key = 'default';

UPDATE crm.intl_provider_connections
SET provider_plan_snapshot = CASE provider
      WHEN 'apollo' THEN jsonb_build_object('verified_at', '2026-10-02', 'notes', 'People API Search is used for role discovery; enrichment remains approval-gated.')
      WHEN 'hunter' THEN jsonb_build_object('verified_at', '2026-10-02', 'notes', 'Email Finder and Verifier only after local dedupe and compliance review.')
      WHEN 'snov' THEN jsonb_build_object('verified_at', '2026-10-02', 'notes', 'Manual or trial API only; remains disabled until authorized API access exists.')
      ELSE jsonb_build_object('verified_at', '2026-10-02', 'notes', 'Manual reviewed import only.')
    END,
    zero_cost_guard = TRUE,
    paid_overage_allowed = FALSE,
    auto_purchase_enabled = FALSE,
    updated_at = now();

UPDATE crm.intl_provider_connections
SET mode = 'manual',
    connection_status = 'not_configured'
WHERE provider = 'snov' AND mode <> 'disabled';

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'intl_account_research', 'intl_claims_catalog', 'intl_evidence',
    'intl_buying_committee', 'intl_crm_links', 'intl_integration_outbox'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON crm.%I', table_name);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON crm.%I FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at()', table_name);
    EXECUTE format('ALTER TABLE crm.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE crm.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS admin_read ON crm.%I', table_name);
    EXECUTE format('CREATE POLICY admin_read ON crm.%I FOR SELECT TO authenticated USING (crm.is_admin(auth.uid()))', table_name);
    EXECUTE format('REVOKE ALL ON TABLE crm.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT ON TABLE crm.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE crm.%I TO service_role', table_name);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_intl_mark_qualified(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.crm_intl_strategic_readiness() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_intl_mark_qualified(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_intl_strategic_readiness() TO authenticated, service_role;

COMMENT ON TABLE crm.intl_account_research IS 'Account plan for Strategic Accounts CRM. Human-reviewed before provider credits are used.';
COMMENT ON TABLE crm.intl_evidence IS 'Public evidence and approved claim linkage. No unsupported personalization should bypass this table.';
COMMENT ON TABLE crm.intl_buying_committee IS 'Buying committee map with one active contact per account in V1.';
COMMENT ON TABLE crm.intl_integration_outbox IS 'Transactional outbox for idempotent conversion from International Outreach to commercial CRM.';
COMMENT ON FUNCTION public.crm_intl_mark_qualified(UUID, TEXT) IS 'Marks an approved campaign contact as qualified and inserts INTL_LEAD_QUALIFIED in one transaction.';
COMMENT ON FUNCTION public.crm_intl_strategic_readiness() IS 'Admin-only readiness for Apollo/Hunter/Snov Strategic Accounts CRM. Sends nothing and spends nothing.';

COMMIT;
