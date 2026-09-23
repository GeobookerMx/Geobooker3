-- Restore the required commercial reservation when queueing WhatsApp campaign jobs.
-- Without a reserved crm.usage_ledger row, whatsapp-worker correctly blocks
-- campaign sends before calling Meta.

ALTER TABLE crm.usage_ledger
  ADD COLUMN IF NOT EXISTS campaign_member_id UUID REFERENCES crm.campaign_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outbound_job_id UUID REFERENCES crm.outbound_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preflight_run_id UUID REFERENCES crm.campaign_dispatch_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reservation_status TEXT NOT NULL DEFAULT 'committed',
  ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(14, 6),
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS crm_usage_ledger_outbound_job_uidx
  ON crm.usage_ledger (outbound_job_id)
  WHERE outbound_job_id IS NOT NULL AND reservation_status <> 'released';

CREATE UNIQUE INDEX IF NOT EXISTS crm_usage_ledger_campaign_member_uidx
  ON crm.usage_ledger (campaign_member_id)
  WHERE campaign_member_id IS NOT NULL AND reservation_status <> 'released';

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
  member_record RECORD;
  safe_limit INTEGER;
  selected_count INTEGER := 0;
  existing_count INTEGER := 0;
  existing_cost NUMERIC := 0;
  queued_count INTEGER := 0;
  dispatch_cost NUMERIC := 0;
  message_id UUID;
  job_id UUID;
  conversation_id UUID;
  idempotency_key TEXT;
  normalized_country TEXT;
  member_currency TEXT;
  member_unit_cost NUMERIC;
  effective_now TIMESTAMPTZ := now();
  effective_schedule_at TIMESTAMPTZ;
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
    COALESCE(sum(ul.reserved_amount), 0),
    max(ul.currency)
  INTO existing_count, existing_cost, member_currency
  FROM crm.usage_ledger ul
  JOIN crm.campaign_members cm ON cm.id = ul.campaign_member_id
  WHERE ul.preflight_run_id = p_preflight_run_id
    AND cm.campaign_id = p_campaign_id
    AND ul.reservation_status <> 'released';

  IF existing_count > 0 THEN
    RETURN QUERY SELECT p_campaign_id, p_preflight_run_id, existing_count,
      existing_cost, COALESCE(member_currency, 'MXN'), true, true;
    RETURN;
  END IF;

  safe_limit := LEAST(GREATEST(COALESCE(p_max_members, 1), 1), 20);

  SELECT c.* INTO campaign_record
  FROM crm.campaigns c
  WHERE c.id = p_campaign_id AND c.channel = 'whatsapp'
  FOR UPDATE;
  IF campaign_record.id IS NULL OR campaign_record.status <> 'approved' THEN
    RAISE EXCEPTION 'approved_whatsapp_campaign_required' USING ERRCODE = '22023';
  END IF;

  SELECT r.* INTO preflight_record
  FROM crm.campaign_dispatch_runs r
  WHERE r.id = p_preflight_run_id AND r.campaign_id = p_campaign_id
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
  effective_schedule_at := GREATEST(COALESCE(campaign_record.scheduled_at, p_now, effective_now), effective_now);

  SELECT wp.* INTO phone_record
  FROM crm.whatsapp_phone_numbers wp
  WHERE wp.business_account_id = template_record.business_account_id
    AND wp.status = 'active'
  ORDER BY wp.updated_at DESC
  LIMIT 1
  FOR SHARE;
  IF phone_record.id IS NULL THEN
    RAISE EXCEPTION 'active_whatsapp_phone_required' USING ERRCODE = '22023';
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
    member_currency := COALESCE(member_record.cost_currency, 'MXN');
    member_unit_cost := COALESCE(member_record.estimated_unit_cost, 0);

    SELECT cv.id INTO conversation_id
    FROM crm.conversations cv
    WHERE cv.contact_point_id = member_record.contact_point_id
    ORDER BY cv.updated_at DESC
    LIMIT 1;

    IF conversation_id IS NULL THEN
      INSERT INTO crm.conversations (
        whatsapp_phone_number_id, contact_id, contact_point_id, account_id,
        provider_wa_id, status, last_message_at
      ) VALUES (
        phone_record.id, member_record.contact_id, member_record.contact_point_id,
        member_record.account_id, ltrim(member_record.normalized_value, '+'),
        'open', effective_now
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
      'queued', p_actor_user_id, p_campaign_id, effective_now, effective_now
    );

    INSERT INTO crm.outbound_jobs (
      id, conversation_id, message_id, channel, job_type, status, request_payload, payload,
      idempotency_key, scheduled_at, attempt_count, created_by_user_id, created_at, updated_at
    ) VALUES (
      job_id, conversation_id, message_id, 'whatsapp', 'campaign', 'pending',
      jsonb_build_object(
        'campaignId', p_campaign_id,
        'campaignMemberId', member_record.id,
        'preflightRunId', p_preflight_run_id,
        'purpose', campaign_record.purpose,
        'templateId', template_record.id,
        'templateParameters', member_record.template_parameters
      ),
      jsonb_build_object(
        'campaignId', p_campaign_id,
        'campaignMemberId', member_record.id,
        'preflightRunId', p_preflight_run_id,
        'purpose', campaign_record.purpose,
        'templateId', template_record.id,
        'templateParameters', member_record.template_parameters
      ),
      idempotency_key, effective_schedule_at, 0, p_actor_user_id, effective_now, effective_now
    );

    INSERT INTO crm.usage_ledger (
      message_id, provider, recipient_country_code, category, quantity,
      currency, estimated_unit_cost, rate_card_version, rate_card_id,
      charge_status, campaign_member_id, outbound_job_id, preflight_run_id,
      reservation_status, reserved_amount, reserved_at,
      reservation_expires_at, created_at, updated_at
    ) VALUES (
      message_id, 'meta_cloud', COALESCE(member_record.recipient_country_code, normalized_country), template_record.category, 1,
      member_currency, member_unit_cost, NULL, NULL,
      'estimated', member_record.id, job_id, p_preflight_run_id,
      'reserved', member_unit_cost, effective_now,
      effective_now + interval '30 minutes', effective_now, effective_now
    );

    UPDATE crm.campaign_members
    SET queued_job_id = job_id, updated_at = effective_now
    WHERE id = member_record.id AND queued_job_id IS NULL;

    queued_count := queued_count + 1;
    dispatch_cost := dispatch_cost + member_unit_cost;
  END LOOP;

  UPDATE crm.campaigns
  SET status = CASE WHEN effective_schedule_at > effective_now THEN 'scheduled' ELSE 'running' END,
      updated_at = effective_now
  WHERE id = p_campaign_id;

  RETURN QUERY
  SELECT p_campaign_id, p_preflight_run_id, queued_count, dispatch_cost, COALESCE(member_currency, 'MXN'), false, true;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_dispatch_whatsapp_campaign_atomic(UUID, UUID, INTEGER, UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_dispatch_whatsapp_campaign_atomic(UUID, UUID, INTEGER, UUID, TIMESTAMPTZ)
  TO authenticated, service_role;
