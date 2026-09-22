-- Fix missing can_schedule column and register atomic campaign dispatch functions.

ALTER TABLE crm.campaign_dispatch_runs
  ADD COLUMN IF NOT EXISTS can_schedule BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS run_type TEXT NOT NULL DEFAULT 'preflight',
  ADD COLUMN IF NOT EXISTS requested_member_count INTEGER,
  ADD COLUMN IF NOT EXISTS eligible_member_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS excluded_member_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_size INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS planned_batches JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sending_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE crm.campaign_members
  ADD COLUMN IF NOT EXISTS template_parameters JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE crm.usage_ledger
  ADD COLUMN IF NOT EXISTS campaign_member_id UUID REFERENCES crm.campaign_members(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS outbound_job_id UUID REFERENCES crm.outbound_jobs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS preflight_run_id UUID REFERENCES crm.campaign_dispatch_runs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS reservation_status TEXT NOT NULL DEFAULT 'committed',
  ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(14, 6),
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS release_reason TEXT;

CREATE TABLE IF NOT EXISTS crm.whatsapp_campaign_dispatch_controls (
  provider TEXT PRIMARY KEY DEFAULT 'meta_cloud' CHECK (provider = 'meta_cloud'),
  queue_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  single_use BOOLEAN NOT NULL DEFAULT TRUE,
  max_members_per_dispatch INTEGER NOT NULL DEFAULT 1 CHECK (max_members_per_dispatch BETWEEN 1 AND 20),
  authorization_expires_at TIMESTAMPTZ,
  authorized_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  authorization_reference TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO crm.whatsapp_campaign_dispatch_controls (provider, queue_enabled, single_use, max_members_per_dispatch)
VALUES ('meta_cloud', false, true, 1)
ON CONFLICT (provider) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE crm.whatsapp_campaign_dispatch_controls TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.whatsapp_campaign_dispatch_controls TO authenticated;

-- 1. Preflight Function
CREATE OR REPLACE FUNCTION public.crm_whatsapp_campaign_dispatch_preflight(
  p_campaign_id UUID,
  p_batch_size INTEGER DEFAULT 50,
  p_actor_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  run_id UUID,
  campaign_id UUID,
  status TEXT,
  can_schedule BOOLEAN,
  eligible_member_count INTEGER,
  excluded_member_count INTEGER,
  batch_size INTEGER,
  batch_count INTEGER,
  reasons JSONB,
  sending_enabled BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  campaign_record RECORD;
  member_stats RECORD;
  job_risk RECORD;
  budget_record RECORD;
  safe_batch_size INTEGER;
  reason_list JSONB := '[]'::jsonb;
  is_ready BOOLEAN := true;
  total_eligible INTEGER := 0;
  total_excluded INTEGER := 0;
  total_batches INTEGER := 0;
  new_run_id UUID;
  batch_plan JSONB := '[]'::jsonb;
  batch_index INTEGER;
  batch_start INTEGER;
  batch_members INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) AND NOT crm.is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  safe_batch_size := LEAST(GREATEST(COALESCE(p_batch_size, 50), 1), 500);

  SELECT * INTO campaign_record
  FROM crm.campaigns
  WHERE id = p_campaign_id AND channel = 'whatsapp';

  IF campaign_record.id IS NULL THEN
    RAISE EXCEPTION 'whatsapp_campaign_not_found' USING ERRCODE = '22023';
  END IF;

  IF campaign_record.status <> 'approved' THEN
    is_ready := false;
    reason_list := reason_list || jsonb_build_array('La campaña debe estar en estado approved para preflight de despacho.');
  END IF;

  SELECT
    count(*) FILTER (WHERE eligibility_status = 'eligible')::integer AS eligible_count,
    count(*) FILTER (WHERE eligibility_status <> 'eligible')::integer AS excluded_count
  INTO member_stats
  FROM crm.campaign_members
  WHERE crm.campaign_members.campaign_id = p_campaign_id;

  total_eligible := COALESCE(member_stats.eligible_count, 0);
  total_excluded := COALESCE(member_stats.excluded_count, 0);

  IF total_eligible = 0 THEN
    is_ready := false;
    reason_list := reason_list || jsonb_build_array('La audiencia elegible es 0. No hay destinatarios listos para despacho.');
  END IF;

  SELECT count(*)::integer AS risk_count INTO job_risk
  FROM crm.outbound_jobs
  WHERE status IN ('failed', 'dead_letter');

  IF COALESCE(job_risk.risk_count, 0) > 0 THEN
    reason_list := reason_list || jsonb_build_array('Existen ' || job_risk.risk_count::text || ' trabajos en dead_letter/failed. Requieren diagnóstico.');
  END IF;

  SELECT * INTO budget_record
  FROM crm.budget_policies
  WHERE provider = 'meta_cloud' AND is_active
  ORDER BY updated_at DESC LIMIT 1;

  IF budget_record.id IS NULL OR budget_record.kill_switch THEN
    is_ready := false;
    reason_list := reason_list || jsonb_build_array('No existe una política presupuestal activa para Meta Cloud API.');
  END IF;

  IF total_eligible > 0 THEN
    total_batches := CEIL(total_eligible::numeric / safe_batch_size::numeric)::integer;
    FOR batch_index IN 1..total_batches LOOP
      batch_start := (batch_index - 1) * safe_batch_size + 1;
      batch_members := LEAST(safe_batch_size, total_eligible - batch_start + 1);
      batch_plan := batch_plan || jsonb_build_array(jsonb_build_object(
        'batch_index', batch_index,
        'member_count', batch_members,
        'start_offset', batch_start - 1
      ));
    END LOOP;
  END IF;

  INSERT INTO crm.campaign_dispatch_runs (
    campaign_id, run_type, status, can_schedule, requested_member_count,
    eligible_member_count, excluded_member_count, batch_size,
    planned_batches, reasons, sending_enabled, created_by_user_id
  ) VALUES (
    p_campaign_id, 'preflight', CASE WHEN is_ready THEN 'ready' ELSE 'blocked' END,
    is_ready, total_eligible, total_eligible, total_excluded, safe_batch_size,
    batch_plan, reason_list, false, p_actor_user_id
  ) RETURNING id INTO new_run_id;

  RETURN QUERY
  SELECT
    r.id AS run_id,
    r.campaign_id,
    r.status,
    r.can_schedule,
    r.eligible_member_count,
    r.excluded_member_count,
    r.batch_size,
    total_batches AS batch_count,
    r.reasons,
    r.sending_enabled,
    r.created_at
  FROM crm.campaign_dispatch_runs r
  WHERE r.id = new_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_whatsapp_campaign_dispatch_preflight(UUID, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_campaign_dispatch_preflight(UUID, INTEGER, UUID) TO authenticated, service_role;

-- 2. Atomic Dispatch Function
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
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) AND NOT crm.is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF p_campaign_id IS NULL OR p_preflight_run_id IS NULL THEN
    RAISE EXCEPTION 'campaign_and_preflight_required' USING ERRCODE = '22023';
  END IF;

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

  safe_limit := LEAST(GREATEST(COALESCE(p_max_members, 1), 1), 20);

  SELECT * INTO campaign_record
  FROM crm.campaigns
  WHERE id = p_campaign_id AND channel = 'whatsapp'
  FOR UPDATE;
  IF campaign_record.id IS NULL OR campaign_record.status <> 'approved' THEN
    RAISE EXCEPTION 'approved_whatsapp_campaign_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO preflight_record
  FROM crm.campaign_dispatch_runs
  WHERE id = p_preflight_run_id AND campaign_id = p_campaign_id
  FOR UPDATE;
  IF preflight_record.id IS NULL OR preflight_record.status <> 'ready' THEN
    RAISE EXCEPTION 'fresh_ready_preflight_required' USING ERRCODE = '22023';
  END IF;

  SELECT wt.* INTO template_record
  FROM crm.whatsapp_templates wt
  WHERE wt.id = campaign_record.template_id
  FOR SHARE;
  IF template_record.id IS NULL OR template_record.approval_status <> 'approved' THEN
    RAISE EXCEPTION 'campaign_template_not_ready' USING ERRCODE = '22023';
  END IF;

  normalized_country := upper(NULLIF(btrim(COALESCE(campaign_record.audience_rule->>'country_code', 'MX')), ''));
  normalized_language := replace(NULLIF(btrim(COALESCE(campaign_record.language_code, campaign_record.audience_rule->>'language_code', 'es_MX')), ''), '-', '_');

  SELECT wp.* INTO phone_record
  FROM crm.whatsapp_phone_numbers wp
  WHERE wp.business_account_id = template_record.business_account_id
    AND wp.status IN ('active', 'test')
  ORDER BY wp.updated_at DESC LIMIT 1
  FOR SHARE;

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

  FOR member_record IN
    SELECT cm.*, cp.normalized_value, cp.point_type
    FROM crm.campaign_members cm
    JOIN crm.contact_points cp ON cp.id = cm.contact_point_id
    WHERE cm.campaign_id = p_campaign_id
      AND cm.eligibility_status = 'eligible'
      AND cm.queued_job_id IS NULL
      AND cm.provider_message_id IS NULL
    ORDER BY cm.score DESC NULLS LAST, cm.id
    LIMIT safe_limit
    FOR UPDATE OF cm
  LOOP
    SELECT cv.id INTO conversation_id
    FROM crm.conversations cv
    WHERE cv.contact_point_id = member_record.contact_point_id
    ORDER BY cv.updated_at DESC LIMIT 1;

    IF conversation_id IS NULL THEN
      INSERT INTO crm.conversations (
        whatsapp_phone_number_id, contact_id, contact_point_id, account_id,
        provider_wa_id, status, last_message_at
      ) VALUES (
        phone_record.id, member_record.contact_id, member_record.contact_point_id,
        member_record.account_id, ltrim(member_record.normalized_value, '+'),
        'open', p_now
      ) RETURNING id INTO conversation_id;
    END IF;

    message_id := gen_random_uuid();
    job_id := gen_random_uuid();
    idempotency_key := 'wa-campaign:' || p_campaign_id::text || ':' || member_record.id::text || ':' || p_preflight_run_id::text;

    INSERT INTO crm.messages (
      id, conversation_id, direction, message_type, client_idempotency_key,
      template_id, body_text, content, current_status, initiated_by_user_id,
      crm_campaign_id, created_at, updated_at
    ) VALUES (
      message_id, conversation_id, 'outbound', 'template', idempotency_key,
      template_record.id, template_record.body_text,
      jsonb_build_object('campaign_id', p_campaign_id, 'campaign_member_id', member_record.id, 'preflight_run_id', p_preflight_run_id),
      'queued', p_actor_user_id, p_campaign_id, p_now, p_now
    );

    INSERT INTO crm.outbound_jobs (
      id, conversation_id, message_id, channel, status, payload,
      idempotency_key, scheduled_at, attempt_count, created_at, updated_at
    ) VALUES (
      job_id, conversation_id, message_id, 'whatsapp', 'pending',
      jsonb_build_object('message_id', message_id, 'template_id', template_record.id, 'campaign_id', p_campaign_id),
      idempotency_key, p_now, 0, p_now, p_now
    );

    UPDATE crm.campaign_members
    SET queued_job_id = job_id, updated_at = p_now
    WHERE id = member_record.id;

    queued_count := queued_count + 1;
  END LOOP;

  RETURN QUERY
  SELECT p_campaign_id, p_preflight_run_id, queued_count, 0::numeric, 'MXN'::text, false, true;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_dispatch_whatsapp_campaign_atomic(UUID, UUID, INTEGER, UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_dispatch_whatsapp_campaign_atomic(UUID, UUID, INTEGER, UUID, TIMESTAMPTZ) TO authenticated, service_role;
