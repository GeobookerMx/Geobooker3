-- Atomic WhatsApp campaign dispatch foundation.
--
-- This migration does not enable queueing or sending. The database queue gate
-- is inserted closed and WHATSAPP_SEND_ENABLED remains an independent
-- server-side kill switch. The function below never calls Meta.

BEGIN;

DO $$
DECLARE
  required_table TEXT;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'crm.campaigns',
    'crm.campaign_members',
    'crm.campaign_dispatch_runs',
    'crm.campaign_events',
    'crm.contacts',
    'crm.contact_points',
    'crm.channel_permissions',
    'crm.consent_evidence',
    'crm.suppressions',
    'crm.whatsapp_templates',
    'crm.whatsapp_phone_numbers',
    'crm.conversations',
    'crm.messages',
    'crm.outbound_jobs',
    'crm.usage_ledger',
    'crm.whatsapp_rate_cards',
    'crm.messaging_frequency_policies',
    'crm.budget_policies',
    'crm.market_policies',
    'crm.audit_log'
  ] LOOP
    IF to_regclass(required_table) IS NULL THEN
      RAISE EXCEPTION 'required_relation_missing: %', required_table USING ERRCODE = '42P01';
    END IF;
  END LOOP;
  IF to_regprocedure('crm.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION 'required_function_missing: crm.set_updated_at()' USING ERRCODE = '42883';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'whatsapp_templates'
      AND column_name = 'enabled_for_campaigns'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'whatsapp_templates'
      AND column_name = 'reconciliation_status'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'campaigns'
      AND column_name = 'language_code'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'campaign_members'
      AND column_name = 'recipient_country_code'
  ) THEN
    RAISE EXCEPTION 'required_whatsapp_campaign_migrations_missing' USING ERRCODE = '42703';
  END IF;
END;
$$;

ALTER TABLE crm.campaign_members
  ADD COLUMN IF NOT EXISTS template_parameters JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE crm.usage_ledger
  ADD COLUMN IF NOT EXISTS campaign_member_id UUID REFERENCES crm.campaign_members(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS outbound_job_id UUID REFERENCES crm.outbound_jobs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS preflight_run_id UUID REFERENCES crm.campaign_dispatch_runs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS reservation_status TEXT NOT NULL DEFAULT 'committed'
    CHECK (reservation_status IN ('reserved', 'committed', 'released')),
  ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(14, 6) CHECK (reserved_amount IS NULL OR reserved_amount >= 0),
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS release_reason TEXT;

UPDATE crm.usage_ledger
SET
  reservation_status = 'committed',
  reserved_amount = COALESCE(reserved_amount, confirmed_unit_cost, estimated_unit_cost, 0),
  committed_at = COALESCE(committed_at, created_at)
WHERE reservation_status = 'committed';

DROP INDEX IF EXISTS crm.crm_usage_ledger_campaign_member_uidx;
CREATE UNIQUE INDEX crm_usage_ledger_campaign_member_uidx
  ON crm.usage_ledger (campaign_member_id)
  WHERE campaign_member_id IS NOT NULL AND reservation_status <> 'released';
CREATE UNIQUE INDEX IF NOT EXISTS crm_usage_ledger_outbound_job_uidx
  ON crm.usage_ledger (outbound_job_id)
  WHERE outbound_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_usage_ledger_reservation_guard_idx
  ON crm.usage_ledger (reservation_status, currency, created_at DESC);

CREATE TABLE IF NOT EXISTS crm.whatsapp_campaign_dispatch_controls (
  provider TEXT PRIMARY KEY DEFAULT 'meta_cloud' CHECK (provider = 'meta_cloud'),
  queue_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  single_use BOOLEAN NOT NULL DEFAULT TRUE,
  max_members_per_dispatch INTEGER NOT NULL DEFAULT 1
    CHECK (max_members_per_dispatch BETWEEN 1 AND 20),
  authorization_expires_at TIMESTAMPTZ,
  authorized_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  authorization_reference TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    NOT queue_enabled
    OR (authorization_expires_at IS NOT NULL AND authorized_by_user_id IS NOT NULL)
  )
);

INSERT INTO crm.whatsapp_campaign_dispatch_controls (
  provider, queue_enabled, single_use, max_members_per_dispatch
) VALUES ('meta_cloud', false, true, 1)
ON CONFLICT (provider) DO UPDATE SET
  queue_enabled = false,
  authorization_expires_at = NULL,
  authorized_by_user_id = NULL,
  authorization_reference = NULL,
  updated_at = now();

ALTER TABLE crm.whatsapp_campaign_dispatch_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.whatsapp_campaign_dispatch_controls FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE crm.whatsapp_campaign_dispatch_controls FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.whatsapp_campaign_dispatch_controls TO service_role;
REVOKE DELETE ON TABLE crm.whatsapp_campaign_dispatch_controls FROM service_role;

DROP TRIGGER IF EXISTS set_updated_at ON crm.whatsapp_campaign_dispatch_controls;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.whatsapp_campaign_dispatch_controls
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

CREATE OR REPLACE FUNCTION crm.release_whatsapp_campaign_reservation(
  p_job_id UUID,
  p_message_id UUID,
  p_final_status TEXT,
  p_reason TEXT,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (released BOOLEAN, replayed BOOLEAN, result_reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  reservation RECORD;
  job_record RECORD;
  message_record RECORD;
  safe_reason TEXT := left(COALESCE(NULLIF(btrim(p_reason), ''), 'unspecified'), 200);
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_final_status NOT IN ('failed', 'cancelled', 'dead_letter') THEN
    RAISE EXCEPTION 'reservation_release_requires_definitive_status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO reservation FROM crm.usage_ledger
  WHERE outbound_job_id = p_job_id AND message_id = p_message_id
  FOR UPDATE;
  IF reservation.id IS NULL THEN
    RETURN QUERY SELECT false, false, 'reservation_not_found'::text;
    RETURN;
  END IF;
  IF reservation.reservation_status = 'released' THEN
    RETURN QUERY SELECT true, true, 'already_released'::text;
    RETURN;
  END IF;
  IF reservation.reservation_status <> 'reserved' THEN
    RETURN QUERY SELECT false, false, 'committed_reservation_cannot_be_released'::text;
    RETURN;
  END IF;

  SELECT * INTO job_record FROM crm.outbound_jobs WHERE id = p_job_id FOR UPDATE;
  SELECT * INTO message_record FROM crm.messages WHERE id = p_message_id FOR UPDATE;
  IF job_record.id IS NULL OR message_record.id IS NULL OR job_record.job_type <> 'campaign' THEN
    RETURN QUERY SELECT false, false, 'campaign_job_or_message_missing'::text;
    RETURN;
  END IF;
  IF message_record.provider_message_id IS NOT NULL
    OR message_record.current_status IN ('accepted', 'sent', 'delivered', 'read', 'unknown')
    OR job_record.status IN ('accepted', 'completed', 'unknown') THEN
    RETURN QUERY SELECT false, false, 'provider_acceptance_or_ambiguity_present'::text;
    RETURN;
  END IF;

  UPDATE crm.usage_ledger
  SET reservation_status = 'released',
      estimated_unit_cost = 0,
      released_at = p_now,
      release_reason = safe_reason,
      updated_at = p_now
  WHERE id = reservation.id AND reservation_status = 'reserved';

  UPDATE crm.campaign_members
  SET queued_job_id = NULL,
      eligibility_status = 'needs_review',
      eligibility_reasons = COALESCE(eligibility_reasons, '[]'::jsonb)
        || jsonb_build_array('reservation_released:' || safe_reason),
      updated_at = p_now
  WHERE id = reservation.campaign_member_id AND queued_job_id = p_job_id;

  INSERT INTO crm.campaign_events (
    campaign_id, member_id, event_type, metadata, occurred_at
  )
  SELECT cm.campaign_id, cm.id, 'member_dispatch_reservation_released',
    jsonb_build_object(
      'job_id', p_job_id,
      'message_id', p_message_id,
      'final_status', p_final_status,
      'reason', safe_reason,
      'provider_accepted', false
    ), p_now
  FROM crm.campaign_members cm
  WHERE cm.id = reservation.campaign_member_id;

  INSERT INTO crm.audit_log (
    actor_type, action, entity_type, entity_id, new_values, request_id
  ) VALUES (
    'system', 'whatsapp.campaign_reservation_released', 'outbound_job', p_job_id,
    jsonb_build_object(
      'message_id', p_message_id,
      'campaign_member_id', reservation.campaign_member_id,
      'final_status', p_final_status,
      'reason', safe_reason
    ), job_record.idempotency_key
  );

  RETURN QUERY SELECT true, false, 'released'::text;
END;
$$;

CREATE OR REPLACE FUNCTION crm.release_expired_whatsapp_campaign_reservations(
  p_limit INTEGER DEFAULT 25,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (released_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  candidate RECORD;
  release_result RECORD;
  safe_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  released_total INTEGER := 0;
  skipped_total INTEGER := 0;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  FOR candidate IN
    SELECT ul.outbound_job_id, ul.message_id
    FROM crm.usage_ledger ul
    JOIN crm.outbound_jobs oj ON oj.id = ul.outbound_job_id
    JOIN crm.messages m ON m.id = ul.message_id
    WHERE ul.reservation_status = 'reserved'
      AND ul.reservation_expires_at <= p_now
      AND oj.status IN ('pending', 'retry')
      AND m.provider_message_id IS NULL
      AND m.current_status IN ('pending', 'queued', 'failed')
    ORDER BY ul.reservation_expires_at, ul.id
    LIMIT safe_limit
    FOR UPDATE OF ul, oj SKIP LOCKED
  LOOP
    UPDATE crm.outbound_jobs
    SET status = 'cancelled', locked_at = NULL, next_attempt_at = NULL,
        last_error_code = 'campaign_reservation_expired',
        last_error_detail = 'Campaign reservation expired before provider submission',
        updated_at = p_now
    WHERE id = candidate.outbound_job_id
      AND status IN ('pending', 'retry');
    UPDATE crm.messages
    SET current_status = 'failed', failure_code = 'campaign_reservation_expired',
        failure_detail = 'Campaign reservation expired before provider submission',
        updated_at = p_now
    WHERE id = candidate.message_id AND provider_message_id IS NULL;

    SELECT * INTO release_result
    FROM crm.release_whatsapp_campaign_reservation(
      candidate.outbound_job_id,
      candidate.message_id,
      'cancelled',
      'campaign_reservation_expired',
      p_now
    );
    IF COALESCE(release_result.released, false) THEN
      released_total := released_total + 1;
    ELSE
      skipped_total := skipped_total + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT released_total, skipped_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_dispatch_whatsapp_campaign_atomic(
  p_campaign_id UUID,
  p_preflight_run_id UUID,
  p_max_members INTEGER DEFAULT 1,
  p_actor_user_id UUID DEFAULT NULL,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  campaign_id UUID,
  preflight_run_id UUID,
  queued_members INTEGER,
  reserved_cost NUMERIC,
  currency TEXT,
  replayed BOOLEAN,
  queue_gate_closed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  campaign_record RECORD;
  preflight_record RECORD;
  template_record RECORD;
  phone_record RECORD;
  market_record RECORD;
  budget_record RECORD;
  frequency_record RECORD;
  rate_record RECORD;
  control_record RECORD;
  member_record RECORD;
  conversation_record RECORD;
  permission_record RECORD;
  safe_limit INTEGER;
  selected_count INTEGER := 0;
  existing_count INTEGER := 0;
  existing_cost NUMERIC := 0;
  queued_count INTEGER := 0;
  dispatch_cost NUMERIC := 0;
  day_start TIMESTAMPTZ;
  month_start TIMESTAMPTZ;
  global_day_count INTEGER := 0;
  market_day_count INTEGER := 0;
  daily_spend NUMERIC := 0;
  monthly_spend NUMERIC := 0;
  contact_24h INTEGER;
  contact_7d INTEGER;
  contact_30d INTEGER;
  contact_last_at TIMESTAMPTZ;
  message_id UUID;
  job_id UUID;
  conversation_id UUID;
  idempotency_key TEXT;
  normalized_country TEXT;
  normalized_language TEXT;
  expected_category TEXT;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_campaign_id IS NULL OR p_preflight_run_id IS NULL THEN
    RAISE EXCEPTION 'campaign_and_preflight_required' USING ERRCODE = '22023';
  END IF;

  -- One global transactional mutex plus locked policy rows prevents two
  -- dispatches from reserving the same daily/budget capacity concurrently.
  PERFORM pg_advisory_xact_lock(hashtextextended('crm:whatsapp:campaign-dispatch', 0));

  SELECT
    count(*)::integer,
    COALESCE(sum(ul.reserved_amount), 0)
  INTO existing_count, existing_cost
  FROM crm.usage_ledger ul
  JOIN crm.campaign_members cm ON cm.id = ul.campaign_member_id
  WHERE ul.preflight_run_id = p_preflight_run_id
    AND cm.campaign_id = p_campaign_id
    AND ul.reservation_status <> 'released';
  IF existing_count > 0 THEN
    RETURN QUERY SELECT p_campaign_id, p_preflight_run_id, existing_count,
      existing_cost, max(ul.currency), true, true
    FROM crm.usage_ledger ul
    JOIN crm.campaign_members cm ON cm.id = ul.campaign_member_id
    WHERE ul.preflight_run_id = p_preflight_run_id
      AND cm.campaign_id = p_campaign_id
      AND ul.reservation_status <> 'released';
    RETURN;
  END IF;

  SELECT * INTO control_record
  FROM crm.whatsapp_campaign_dispatch_controls
  WHERE provider = 'meta_cloud'
  FOR UPDATE;
  IF control_record.provider IS NULL
    OR NOT control_record.queue_enabled
    OR control_record.authorization_expires_at IS NULL
    OR control_record.authorization_expires_at <= p_now
    OR control_record.authorized_by_user_id IS NULL THEN
    RAISE EXCEPTION 'campaign_dispatch_queue_kill_switch_enabled' USING ERRCODE = '42501';
  END IF;
  IF p_actor_user_id IS NULL OR p_actor_user_id <> control_record.authorized_by_user_id THEN
    RAISE EXCEPTION 'dispatch_actor_must_match_authorization' USING ERRCODE = '42501';
  END IF;

  safe_limit := LEAST(
    GREATEST(COALESCE(p_max_members, 1), 1),
    control_record.max_members_per_dispatch,
    20
  );

  SELECT * INTO campaign_record
  FROM crm.campaigns
  WHERE id = p_campaign_id AND channel = 'whatsapp'
  FOR UPDATE;
  IF campaign_record.id IS NULL OR campaign_record.status <> 'approved'
    OR campaign_record.approved_at IS NULL THEN
    RAISE EXCEPTION 'approved_whatsapp_campaign_required' USING ERRCODE = '22023';
  END IF;
  IF campaign_record.purpose NOT IN ('marketing', 'transactional') THEN
    RAISE EXCEPTION 'campaign_dispatch_purpose_not_supported' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO preflight_record
  FROM crm.campaign_dispatch_runs
  WHERE id = p_preflight_run_id AND campaign_id = p_campaign_id
  FOR UPDATE;
  IF preflight_record.id IS NULL OR preflight_record.run_type <> 'preflight'
    OR preflight_record.status <> 'ready' OR preflight_record.sending_enabled
    OR preflight_record.created_at < p_now - interval '15 minutes' THEN
    RAISE EXCEPTION 'fresh_ready_no_send_preflight_required' USING ERRCODE = '22023';
  END IF;

  SELECT wt.* INTO template_record
  FROM crm.whatsapp_templates wt
  WHERE wt.id = campaign_record.template_id
  FOR SHARE;
  IF template_record.id IS NULL
    OR template_record.approval_status <> 'approved'
    OR NOT COALESCE(template_record.enabled_for_campaigns, false)
    OR template_record.reconciliation_status <> 'ready_for_campaign' THEN
    RAISE EXCEPTION 'campaign_template_not_ready' USING ERRCODE = '22023';
  END IF;
  expected_category := CASE WHEN campaign_record.purpose = 'marketing' THEN 'marketing' ELSE 'utility' END;
  IF template_record.category <> expected_category THEN
    RAISE EXCEPTION 'campaign_template_category_mismatch' USING ERRCODE = '22023';
  END IF;

  normalized_country := upper(NULLIF(btrim(COALESCE(campaign_record.audience_rule->>'country_code', '')), ''));
  normalized_language := replace(NULLIF(btrim(COALESCE(campaign_record.language_code, campaign_record.audience_rule->>'language_code', '')), ''), '-', '_');
  IF normalized_country IS NULL OR normalized_country !~ '^[A-Z]{2}$'
    OR normalized_language IS NULL
    OR lower(replace(template_record.language_code, '-', '_')) <> lower(normalized_language) THEN
    RAISE EXCEPTION 'campaign_country_or_language_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO market_record
  FROM crm.market_policies
  WHERE country_code = normalized_country
  FOR UPDATE;
  IF campaign_record.purpose = 'marketing' AND (
    market_record.country_code IS NULL
    OR market_record.market_status NOT IN ('pilot', 'approved')
    OR NOT market_record.whatsapp_marketing_enabled
    OR NOT market_record.requires_evidenced_opt_in
    OR market_record.reviewed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'campaign_market_not_ready' USING ERRCODE = '22023';
  END IF;

  SELECT bp.* INTO budget_record
  FROM crm.budget_policies bp
  WHERE bp.provider = 'meta_cloud' AND bp.is_active
  ORDER BY bp.updated_at DESC LIMIT 1
  FOR UPDATE;
  IF budget_record.id IS NULL OR budget_record.kill_switch
    OR budget_record.daily_limit IS NULL OR budget_record.monthly_limit IS NULL
    OR budget_record.daily_message_limit IS NULL THEN
    RAISE EXCEPTION 'active_budget_policy_required' USING ERRCODE = '22023';
  END IF;

  SELECT fp.* INTO frequency_record
  FROM crm.messaging_frequency_policies fp
  WHERE fp.channel = 'whatsapp' AND fp.purpose = campaign_record.purpose AND fp.is_active
  ORDER BY fp.updated_at DESC LIMIT 1
  FOR UPDATE;
  IF frequency_record.id IS NULL OR frequency_record.kill_switch THEN
    RAISE EXCEPTION 'active_frequency_policy_required' USING ERRCODE = '22023';
  END IF;

  SELECT rc.* INTO rate_record
  FROM crm.whatsapp_rate_cards rc
  WHERE rc.provider = 'meta_cloud'
    AND rc.country_code = normalized_country
    AND rc.category = template_record.category
    AND rc.status = 'active'
    AND rc.effective_from <= p_now
    AND (rc.effective_to IS NULL OR rc.effective_to > p_now)
  ORDER BY rc.effective_from DESC, rc.created_at DESC LIMIT 1
  FOR SHARE;
  IF rate_record.id IS NULL OR rate_record.currency <> budget_record.currency THEN
    RAISE EXCEPTION 'active_rate_card_in_budget_currency_required' USING ERRCODE = '22023';
  END IF;

  SELECT wp.* INTO phone_record
  FROM crm.whatsapp_phone_numbers wp
  WHERE wp.business_account_id = template_record.business_account_id
    AND wp.status = 'active'
  ORDER BY wp.updated_at DESC LIMIT 1
  FOR SHARE;
  IF phone_record.id IS NULL THEN
    RAISE EXCEPTION 'active_campaign_phone_required' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer INTO selected_count
  FROM (
    SELECT cm.id
    FROM crm.campaign_members cm
    WHERE cm.campaign_id = p_campaign_id
      AND cm.eligibility_status = 'eligible'
      AND cm.queued_job_id IS NULL
      AND cm.provider_message_id IS NULL
    ORDER BY cm.score DESC NULLS LAST, cm.id
    LIMIT safe_limit
  ) selected;
  IF selected_count = 0 THEN
    RAISE EXCEPTION 'no_unprocessed_eligible_members' USING ERRCODE = '22023';
  END IF;

  day_start := date_trunc('day', p_now AT TIME ZONE budget_record.timezone_name)
    AT TIME ZONE budget_record.timezone_name;
  month_start := date_trunc('month', p_now AT TIME ZONE budget_record.timezone_name)
    AT TIME ZONE budget_record.timezone_name;

  SELECT count(*)::integer INTO global_day_count
  FROM crm.messages m
  WHERE m.direction = 'outbound'
    AND m.current_status NOT IN ('failed', 'deleted')
    AND m.created_at >= day_start;
  IF global_day_count + selected_count > budget_record.daily_message_limit THEN
    RAISE EXCEPTION 'global_daily_message_limit_exceeded' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer INTO market_day_count
  FROM crm.usage_ledger ul
  WHERE ul.recipient_country_code = normalized_country
    AND ul.reservation_status <> 'released'
    AND ul.created_at >= day_start;
  IF campaign_record.purpose = 'marketing'
    AND market_day_count + selected_count > market_record.daily_recipient_cap THEN
    RAISE EXCEPTION 'market_daily_recipient_cap_exceeded' USING ERRCODE = '22023';
  END IF;

  SELECT
    COALESCE(sum(COALESCE(ul.confirmed_unit_cost, ul.estimated_unit_cost, 0) * ul.quantity)
      FILTER (WHERE ul.created_at >= day_start), 0),
    COALESCE(sum(COALESCE(ul.confirmed_unit_cost, ul.estimated_unit_cost, 0) * ul.quantity)
      FILTER (WHERE ul.created_at >= month_start), 0)
  INTO daily_spend, monthly_spend
  FROM crm.usage_ledger ul
  WHERE ul.currency = budget_record.currency
    AND ul.reservation_status <> 'released';
  dispatch_cost := rate_record.unit_cost * selected_count;
  IF daily_spend + dispatch_cost > budget_record.daily_limit
    OR monthly_spend + dispatch_cost > budget_record.monthly_limit THEN
    RAISE EXCEPTION 'campaign_budget_capacity_exceeded' USING ERRCODE = '22023';
  END IF;

  FOR member_record IN
    SELECT
      cm.*,
      cp.normalized_value,
      cp.validation_status,
      cp.point_type,
      cp.contact_id AS point_contact_id,
      c.contact_status,
      c.language_code AS contact_language
    FROM crm.campaign_members cm
    JOIN crm.contact_points cp ON cp.id = cm.contact_point_id
    JOIN crm.contacts c ON c.id = cm.contact_id
    WHERE cm.campaign_id = p_campaign_id
      AND cm.eligibility_status = 'eligible'
      AND cm.queued_job_id IS NULL
      AND cm.provider_message_id IS NULL
    ORDER BY cm.score DESC NULLS LAST, cm.id
    LIMIT safe_limit
    FOR UPDATE OF cm
  LOOP
    IF member_record.point_type <> 'whatsapp'
      OR member_record.validation_status <> 'valid'
      OR member_record.point_contact_id <> member_record.contact_id
      OR member_record.contact_status <> 'active'
      OR member_record.recipient_country_code <> normalized_country
      OR lower(replace(COALESCE(member_record.language_code, ''), '-', '_')) <> lower(normalized_language)
      OR jsonb_typeof(member_record.template_parameters) <> 'array'
      OR jsonb_array_length(member_record.template_parameters) <> template_record.variable_count
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(member_record.template_parameters) AS param(value)
        WHERE jsonb_typeof(param.value) <> 'string'
          OR length(param.value #>> '{}') > 1024
          OR btrim(param.value #>> '{}') = ''
      ) THEN
      RAISE EXCEPTION 'campaign_member_revalidation_failed: %', member_record.id USING ERRCODE = '22023';
    END IF;

    SELECT cp.* INTO permission_record
    FROM crm.channel_permissions cp
    WHERE cp.contact_id = member_record.contact_id
      AND cp.channel = 'whatsapp'
      AND cp.purpose = campaign_record.purpose
    FOR SHARE;
    IF permission_record.id IS NULL
      OR (campaign_record.purpose = 'marketing' AND permission_record.status <> 'opted_in')
      OR (campaign_record.purpose = 'transactional' AND permission_record.status NOT IN ('allowed', 'opted_in'))
      OR permission_record.consented_at IS NULL
      OR NULLIF(btrim(permission_record.consent_source), '') IS NULL
      OR NULLIF(btrim(permission_record.consent_text_version), '') IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM crm.consent_evidence ce
        WHERE ce.channel_permission_id = permission_record.id
          AND ce.contact_id = member_record.contact_id
          AND ce.channel = 'whatsapp'
          AND ce.purpose = campaign_record.purpose
      )
      OR EXISTS (
        SELECT 1 FROM crm.channel_permissions blocked
        WHERE blocked.contact_id = member_record.contact_id
          AND blocked.channel = 'whatsapp'
          AND blocked.status IN ('opted_out', 'suppressed', 'invalid', 'complaint')
      )
      OR EXISTS (
        SELECT 1 FROM crm.suppressions s
        WHERE s.status = 'active'
          AND s.identifier_type = 'whatsapp'
          AND s.normalized_identifier = member_record.normalized_value
          AND (s.channel = 'whatsapp' OR s.channel IS NULL)
      ) THEN
      RAISE EXCEPTION 'campaign_member_consent_or_suppression_failed: %', member_record.id USING ERRCODE = '22023';
    END IF;

    SELECT
      count(*) FILTER (WHERE m.created_at >= p_now - interval '24 hours')::integer,
      count(*) FILTER (WHERE m.created_at >= p_now - interval '7 days')::integer,
      count(*) FILTER (WHERE m.created_at >= p_now - interval '30 days')::integer,
      max(m.created_at)
    INTO contact_24h, contact_7d, contact_30d, contact_last_at
    FROM crm.messages m
    JOIN crm.conversations cv ON cv.id = m.conversation_id
    WHERE cv.contact_id = member_record.contact_id
      AND m.direction = 'outbound'
      AND m.current_status NOT IN ('failed', 'deleted')
      AND m.created_at >= p_now - interval '30 days';
    IF contact_24h >= frequency_record.max_messages_24h
      OR contact_7d >= frequency_record.max_messages_7d
      OR contact_30d >= frequency_record.max_messages_30d
      OR (frequency_record.minimum_interval_minutes > 0 AND contact_last_at IS NOT NULL
        AND contact_last_at > p_now - make_interval(mins => frequency_record.minimum_interval_minutes)) THEN
      RAISE EXCEPTION 'campaign_member_frequency_cap_reached: %', member_record.id USING ERRCODE = '22023';
    END IF;

    SELECT cv.* INTO conversation_record
    FROM crm.conversations cv
    WHERE cv.whatsapp_phone_number_id = phone_record.id
      AND cv.contact_point_id = member_record.contact_point_id
    FOR UPDATE;
    IF conversation_record.id IS NOT NULL AND conversation_record.status = 'blocked' THEN
      RAISE EXCEPTION 'campaign_conversation_blocked: %', member_record.id USING ERRCODE = '22023';
    END IF;
    IF conversation_record.id IS NULL THEN
      INSERT INTO crm.conversations (
        whatsapp_phone_number_id, contact_id, contact_point_id, account_id,
        provider_wa_id, status, last_message_at
      ) VALUES (
        phone_record.id, member_record.contact_id, member_record.contact_point_id,
        member_record.account_id, ltrim(member_record.normalized_value, '+'),
        'open', p_now
      ) RETURNING id INTO conversation_id;
    ELSE
      conversation_id := conversation_record.id;
    END IF;

    message_id := gen_random_uuid();
    job_id := gen_random_uuid();
    idempotency_key := 'wa-campaign:' || p_campaign_id::text || ':'
      || member_record.id::text || ':' || p_preflight_run_id::text;

    INSERT INTO crm.messages (
      id, conversation_id, direction, message_type, client_idempotency_key,
      template_id, body_text, content, current_status, initiated_by_user_id,
      crm_campaign_id, created_at, updated_at
    ) VALUES (
      message_id, conversation_id, 'outbound', 'template', idempotency_key,
      template_record.id, template_record.body_text,
      jsonb_build_object(
        'campaign_id', p_campaign_id,
        'campaign_member_id', member_record.id,
        'preflight_run_id', p_preflight_run_id,
        'template_parameters', member_record.template_parameters
      ),
      'queued', p_actor_user_id, p_campaign_id, p_now, p_now
    );

    INSERT INTO crm.outbound_jobs (
      id, conversation_id, message_id, idempotency_key, job_type, status,
      scheduled_at, request_payload, created_by_user_id, created_at, updated_at
    ) VALUES (
      job_id, conversation_id, message_id, idempotency_key, 'campaign', 'pending',
      GREATEST(COALESCE(campaign_record.scheduled_at, p_now), p_now),
      jsonb_build_object(
        'campaignId', p_campaign_id,
        'campaignMemberId', member_record.id,
        'preflightRunId', p_preflight_run_id,
        'purpose', campaign_record.purpose,
        'templateId', template_record.id,
        'templateParameters', member_record.template_parameters,
        'commercialGuard', jsonb_build_object(
          'countryCode', normalized_country,
          'category', template_record.category,
          'currency', rate_record.currency,
          'estimatedUnitCost', rate_record.unit_cost,
          'rateCardVersion', rate_record.rate_card_version,
          'rateCardId', rate_record.id
        )
      ),
      p_actor_user_id, p_now, p_now
    );

    INSERT INTO crm.usage_ledger (
      message_id, provider, recipient_country_code, category, quantity,
      currency, estimated_unit_cost, rate_card_version, rate_card_id,
      charge_status, campaign_member_id, outbound_job_id, preflight_run_id,
      reservation_status, reserved_amount, reserved_at,
      reservation_expires_at, created_at, updated_at
    ) VALUES (
      message_id, 'meta_cloud', normalized_country, template_record.category, 1,
      rate_record.currency, rate_record.unit_cost, rate_record.rate_card_version,
      rate_record.id, 'estimated', member_record.id, job_id, p_preflight_run_id,
      'reserved', rate_record.unit_cost, p_now, p_now + interval '30 minutes', p_now, p_now
    );

    UPDATE crm.campaign_members
    SET queued_job_id = job_id, updated_at = p_now
    WHERE id = member_record.id AND queued_job_id IS NULL;

    INSERT INTO crm.campaign_events (
      campaign_id, member_id, event_type, actor_user_id, metadata, occurred_at
    ) VALUES (
      p_campaign_id, member_record.id, 'member_dispatch_reserved', p_actor_user_id,
      jsonb_build_object(
        'preflight_run_id', p_preflight_run_id,
        'message_id', message_id,
        'job_id', job_id,
        'currency', rate_record.currency,
        'reserved_cost', rate_record.unit_cost
      ), p_now
    );
    queued_count := queued_count + 1;
  END LOOP;

  UPDATE crm.campaigns
  SET status = 'scheduled', updated_at = p_now
  WHERE id = p_campaign_id;

  INSERT INTO crm.campaign_events (
    campaign_id, event_type, actor_user_id, metadata, occurred_at
  ) VALUES (
    p_campaign_id, 'atomic_dispatch_reserved', p_actor_user_id,
    jsonb_build_object(
      'preflight_run_id', p_preflight_run_id,
      'queued_members', queued_count,
      'reserved_cost', dispatch_cost,
      'currency', rate_record.currency,
      'provider_called', false,
      'sending_enabled_changed', false
    ), p_now
  );

  IF control_record.single_use THEN
    UPDATE crm.whatsapp_campaign_dispatch_controls
    SET queue_enabled = false,
        authorization_expires_at = NULL,
        authorization_reference = NULL,
        updated_at = p_now
    WHERE provider = 'meta_cloud';
  END IF;

  RETURN QUERY SELECT p_campaign_id, p_preflight_run_id, queued_count,
    dispatch_cost, rate_record.currency, false, control_record.single_use;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_whatsapp_campaign_job_gate(
  p_job_id UUID,
  p_message_id UUID,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (allowed BOOLEAN, reasons JSONB, reservation_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  reservation RECORD;
  budget_record RECORD;
  frequency_record RECORD;
  job_record RECORD;
  campaign_record RECORD;
  member_gate RECORD;
  permission_gate RECORD;
  reason_list JSONB := '[]'::jsonb;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO job_record FROM crm.outbound_jobs
  WHERE id = p_job_id AND message_id = p_message_id AND job_type = 'campaign';
  SELECT * INTO reservation FROM crm.usage_ledger
  WHERE outbound_job_id = p_job_id AND message_id = p_message_id;
  IF job_record.id IS NULL OR reservation.id IS NULL THEN
    reason_list := reason_list || '["campaign_reservation_missing"]'::jsonb;
  ELSIF reservation.reservation_status <> 'reserved' THEN
    reason_list := reason_list || '["campaign_reservation_not_active"]'::jsonb;
  ELSIF reservation.reservation_expires_at IS NULL OR reservation.reservation_expires_at <= p_now THEN
    reason_list := reason_list || '["campaign_reservation_expired"]'::jsonb;
  END IF;

  IF reservation.campaign_member_id IS NOT NULL THEN
    SELECT c.*, cm.contact_id, cm.contact_point_id, cp.normalized_value
    INTO member_gate
    FROM crm.campaign_members cm
    JOIN crm.campaigns c ON c.id = cm.campaign_id
    JOIN crm.contact_points cp ON cp.id = cm.contact_point_id
    WHERE cm.id = reservation.campaign_member_id
      AND cm.queued_job_id = p_job_id
      AND c.status IN ('scheduled', 'running');
    IF member_gate.id IS NULL THEN
      reason_list := reason_list || '["campaign_or_member_not_dispatchable"]'::jsonb;
    ELSE
      campaign_record := member_gate;
      SELECT cp.* INTO permission_gate
      FROM crm.channel_permissions cp
      WHERE cp.contact_id = member_gate.contact_id
        AND cp.channel = 'whatsapp'
        AND cp.purpose = member_gate.purpose;
      IF permission_gate.id IS NULL
        OR (member_gate.purpose = 'marketing' AND permission_gate.status <> 'opted_in')
        OR (member_gate.purpose = 'transactional' AND permission_gate.status NOT IN ('allowed', 'opted_in'))
        OR NOT EXISTS (
          SELECT 1 FROM crm.consent_evidence ce
          WHERE ce.channel_permission_id = permission_gate.id
            AND ce.contact_id = member_gate.contact_id
            AND ce.channel = 'whatsapp'
            AND ce.purpose = member_gate.purpose
        )
        OR EXISTS (
          SELECT 1 FROM crm.channel_permissions blocked
          WHERE blocked.contact_id = member_gate.contact_id
            AND blocked.channel = 'whatsapp'
            AND blocked.status IN ('opted_out', 'suppressed', 'invalid', 'complaint')
        )
        OR EXISTS (
          SELECT 1 FROM crm.suppressions s
          WHERE s.status = 'active'
            AND s.identifier_type = 'whatsapp'
            AND s.normalized_identifier = member_gate.normalized_value
            AND (s.channel = 'whatsapp' OR s.channel IS NULL)
        ) THEN
        reason_list := reason_list || '["campaign_consent_or_suppression_changed"]'::jsonb;
      END IF;
    END IF;
  END IF;

  SELECT * INTO budget_record FROM crm.budget_policies
  WHERE provider = 'meta_cloud' AND is_active
  ORDER BY updated_at DESC LIMIT 1;
  IF budget_record.id IS NULL OR budget_record.kill_switch THEN
    reason_list := reason_list || '["budget_kill_switch_enabled"]'::jsonb;
  END IF;

  IF campaign_record.purpose IS NOT NULL THEN
    SELECT * INTO frequency_record FROM crm.messaging_frequency_policies
    WHERE channel = 'whatsapp' AND purpose = campaign_record.purpose AND is_active
    ORDER BY updated_at DESC LIMIT 1;
    IF frequency_record.id IS NULL OR frequency_record.kill_switch THEN
      reason_list := reason_list || '["frequency_kill_switch_enabled"]'::jsonb;
    END IF;
  END IF;

  RETURN QUERY SELECT jsonb_array_length(reason_list) = 0, reason_list,
    COALESCE(reservation.reservation_status, 'missing');
END;
$$;

REVOKE ALL ON FUNCTION public.crm_dispatch_whatsapp_campaign_atomic(UUID, UUID, INTEGER, UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_dispatch_whatsapp_campaign_atomic(UUID, UUID, INTEGER, UUID, TIMESTAMPTZ)
  TO service_role;
REVOKE ALL ON FUNCTION public.crm_whatsapp_campaign_job_gate(UUID, UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_campaign_job_gate(UUID, UUID, TIMESTAMPTZ)
  TO service_role;
REVOKE ALL ON FUNCTION crm.release_whatsapp_campaign_reservation(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.release_whatsapp_campaign_reservation(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;
REVOKE ALL ON FUNCTION crm.release_expired_whatsapp_campaign_reservations(INTEGER, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.release_expired_whatsapp_campaign_reservations(INTEGER, TIMESTAMPTZ)
  TO service_role;

COMMENT ON TABLE crm.whatsapp_campaign_dispatch_controls IS
  'Fail-closed, time-bounded and optionally single-use database gate for creating campaign jobs. It does not enable the worker or Meta sending.';
COMMENT ON FUNCTION public.crm_dispatch_whatsapp_campaign_atomic(UUID, UUID, INTEGER, UUID, TIMESTAMPTZ) IS
  'Service-role-only atomic campaign reservation and queue creation. Revalidates consent/suppression/template/market/budget/frequency and never calls Meta.';
COMMENT ON FUNCTION public.crm_whatsapp_campaign_job_gate(UUID, UUID, TIMESTAMPTZ) IS
  'Worker recheck for a previously reserved campaign job. It sends nothing.';
COMMENT ON FUNCTION crm.release_whatsapp_campaign_reservation(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) IS
  'Idempotently releases only a definitive pre-provider campaign reservation; unknown/ambiguous or provider-accepted messages are never released.';
COMMENT ON FUNCTION crm.release_expired_whatsapp_campaign_reservations(INTEGER, TIMESTAMPTZ) IS
  'Bounded service-role cleanup for expired, unsubmitted campaign reservations. It never calls Meta.';

COMMIT;
