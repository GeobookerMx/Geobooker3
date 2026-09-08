-- WhatsApp campaign approval gate.
--
-- This adds an admin-only readiness check and a guarded approval function.
-- Approval still does not enqueue jobs, call Meta, schedule delivery or send.

CREATE OR REPLACE FUNCTION public.crm_whatsapp_campaign_approval_check(
  p_campaign_id UUID
)
RETURNS TABLE (
  campaign_id UUID,
  campaign_status TEXT,
  is_approvable BOOLEAN,
  eligible_members BIGINT,
  missing_consent_members BIGINT,
  suppressed_members BIGINT,
  invalid_members BIGINT,
  pending_outbound_jobs BIGINT,
  retry_outbound_jobs BIGINT,
  dead_letter_outbound_jobs BIGINT,
  approved_template BOOLEAN,
  active_budget_policy BOOLEAN,
  budget_kill_switch BOOLEAN,
  waba_ready BOOLEAN,
  phone_ready BOOLEAN,
  reasons JSONB,
  checked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  campaign_record RECORD;
  member_stats RECORD;
  job_stats RECORD;
  budget_record RECORD;
  waba_ok BOOLEAN;
  phone_ok BOOLEAN;
  template_ok BOOLEAN;
  reason_list JSONB := '[]'::jsonb;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT c.*
  INTO campaign_record
  FROM crm.campaigns c
  WHERE c.id = p_campaign_id
    AND c.channel = 'whatsapp';

  IF campaign_record.id IS NULL THEN
    RAISE EXCEPTION 'campaign_not_found' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*) FILTER (WHERE cm.eligibility_status = 'eligible') AS eligible_members,
    count(*) FILTER (WHERE cm.eligibility_status = 'missing_consent') AS missing_consent_members,
    count(*) FILTER (WHERE cm.eligibility_status = 'suppressed') AS suppressed_members,
    count(*) FILTER (WHERE cm.eligibility_status = 'invalid_contact') AS invalid_members
  INTO member_stats
  FROM crm.campaign_members cm
  WHERE cm.campaign_id = p_campaign_id;

  SELECT
    count(*) FILTER (WHERE oj.status = 'pending') AS pending_outbound_jobs,
    count(*) FILTER (WHERE oj.status = 'retry') AS retry_outbound_jobs,
    count(*) FILTER (WHERE oj.status = 'dead_letter') AS dead_letter_outbound_jobs
  INTO job_stats
  FROM crm.outbound_jobs oj;

  SELECT bp.*
  INTO budget_record
  FROM crm.budget_policies bp
  WHERE bp.provider = 'meta_cloud'
  ORDER BY bp.is_active DESC, bp.kill_switch ASC, bp.updated_at DESC
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM crm.whatsapp_business_accounts waba
    WHERE waba.provider = 'meta_cloud'
      AND waba.status = 'active'
  )
  INTO waba_ok;

  SELECT EXISTS (
    SELECT 1
    FROM crm.whatsapp_phone_numbers wpn
    JOIN crm.whatsapp_business_accounts waba ON waba.id = wpn.business_account_id
    WHERE waba.provider = 'meta_cloud'
      AND waba.status = 'active'
      AND wpn.status = 'active'
      AND wpn.provider_phone_number_id IS NOT NULL
  )
  INTO phone_ok;

  template_ok := campaign_record.purpose = 'service' OR EXISTS (
    SELECT 1
    FROM crm.whatsapp_templates wt
    WHERE wt.id = campaign_record.template_id
      AND wt.approval_status = 'approved'
  );

  IF campaign_record.status <> 'review_ready' THEN
    reason_list := reason_list || '["campaign_must_be_review_ready"]'::jsonb;
  END IF;
  IF COALESCE(member_stats.eligible_members, 0) = 0 THEN
    reason_list := reason_list || '["no_eligible_members"]'::jsonb;
  END IF;
  IF COALESCE(member_stats.suppressed_members, 0) > 0 THEN
    reason_list := reason_list || '["suppressed_members_require_resolution"]'::jsonb;
  END IF;
  IF COALESCE(member_stats.invalid_members, 0) > 0 THEN
    reason_list := reason_list || '["invalid_members_require_resolution"]'::jsonb;
  END IF;
  IF NOT template_ok THEN
    reason_list := reason_list || '["approved_template_required"]'::jsonb;
  END IF;
  IF budget_record.id IS NULL OR NOT COALESCE(budget_record.is_active, false) THEN
    reason_list := reason_list || '["active_budget_policy_required"]'::jsonb;
  END IF;
  IF COALESCE(budget_record.kill_switch, true) THEN
    reason_list := reason_list || '["budget_kill_switch_enabled"]'::jsonb;
  END IF;
  IF NOT waba_ok THEN
    reason_list := reason_list || '["production_waba_not_active"]'::jsonb;
  END IF;
  IF NOT phone_ok THEN
    reason_list := reason_list || '["production_phone_number_not_active"]'::jsonb;
  END IF;
  IF COALESCE(job_stats.retry_outbound_jobs, 0) > 0 OR COALESCE(job_stats.dead_letter_outbound_jobs, 0) > 0 THEN
    reason_list := reason_list || '["outbound_queue_has_risk"]'::jsonb;
  END IF;

  RETURN QUERY
  SELECT
    campaign_record.id,
    campaign_record.status,
    jsonb_array_length(reason_list) = 0,
    COALESCE(member_stats.eligible_members, 0)::bigint,
    COALESCE(member_stats.missing_consent_members, 0)::bigint,
    COALESCE(member_stats.suppressed_members, 0)::bigint,
    COALESCE(member_stats.invalid_members, 0)::bigint,
    COALESCE(job_stats.pending_outbound_jobs, 0)::bigint,
    COALESCE(job_stats.retry_outbound_jobs, 0)::bigint,
    COALESCE(job_stats.dead_letter_outbound_jobs, 0)::bigint,
    template_ok,
    COALESCE(budget_record.is_active, false),
    COALESCE(budget_record.kill_switch, true),
    waba_ok,
    phone_ok,
    reason_list,
    now();
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_approve_whatsapp_campaign(
  p_campaign_id UUID,
  p_actor_user_id UUID DEFAULT auth.uid(),
  p_confirm_no_send BOOLEAN DEFAULT false
)
RETURNS TABLE (
  campaign_id UUID,
  status TEXT,
  approved_at TIMESTAMPTZ,
  sending_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  check_record RECORD;
  approved_timestamp TIMESTAMPTZ := now();
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  IF NOT COALESCE(p_confirm_no_send, false) THEN
    RAISE EXCEPTION 'no_send_confirmation_required' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO check_record
  FROM public.crm_whatsapp_campaign_approval_check(p_campaign_id);

  IF NOT COALESCE(check_record.is_approvable, false) THEN
    RAISE EXCEPTION 'campaign_not_approvable: %', check_record.reasons USING ERRCODE = '22023';
  END IF;

  UPDATE crm.campaigns c
  SET
    status = 'approved',
    approved_by_user_id = p_actor_user_id,
    approved_at = approved_timestamp,
    audience_rule = c.audience_rule || jsonb_build_object(
      'approved_no_send', true,
      'sending_enabled', false
    ),
    updated_at = approved_timestamp
  WHERE c.id = p_campaign_id
    AND c.channel = 'whatsapp'
  RETURNING c.id INTO campaign_id;

  IF campaign_id IS NULL THEN
    RAISE EXCEPTION 'campaign_not_found' USING ERRCODE = '22023';
  END IF;

  INSERT INTO crm.campaign_events (
    campaign_id,
    event_type,
    actor_user_id,
    metadata
  )
  VALUES (
    p_campaign_id,
    'campaign_approved_no_send',
    p_actor_user_id,
    jsonb_build_object(
      'sending_enabled', false,
      'eligible_members', check_record.eligible_members,
      'approved_no_send', true
    )
  );

  RETURN QUERY
  SELECT
    p_campaign_id,
    'approved'::text,
    approved_timestamp,
    false;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_whatsapp_campaign_approval_check(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_campaign_approval_check(UUID)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.crm_approve_whatsapp_campaign(UUID, UUID, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_approve_whatsapp_campaign(UUID, UUID, BOOLEAN)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.crm_whatsapp_campaign_approval_check(UUID) IS
  'Admin-only WhatsApp campaign approval gate. It sends nothing.';

COMMENT ON FUNCTION public.crm_approve_whatsapp_campaign(UUID, UUID, BOOLEAN) IS
  'Admin-only guarded approval. Approval does not schedule, enqueue or send WhatsApp messages.';
