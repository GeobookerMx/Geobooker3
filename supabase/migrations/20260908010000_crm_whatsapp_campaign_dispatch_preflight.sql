-- WhatsApp campaign dispatch preflight.
--
-- This creates an auditable preflight run for approved campaigns. It plans
-- batch counts only; it does not schedule, enqueue outbound jobs, create
-- messages, call Meta Graph API, or send WhatsApp messages.

CREATE TABLE IF NOT EXISTS crm.campaign_dispatch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES crm.campaigns(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL DEFAULT 'preflight' CHECK (run_type IN ('preflight', 'schedule_preview')),
  status TEXT NOT NULL CHECK (status IN ('ready', 'blocked')),
  requested_member_count INTEGER CHECK (requested_member_count IS NULL OR requested_member_count >= 0),
  eligible_member_count INTEGER NOT NULL DEFAULT 0 CHECK (eligible_member_count >= 0),
  excluded_member_count INTEGER NOT NULL DEFAULT 0 CHECK (excluded_member_count >= 0),
  batch_size INTEGER NOT NULL CHECK (batch_size BETWEEN 1 AND 500),
  planned_batches JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  sending_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_campaign_dispatch_runs_campaign_idx
  ON crm.campaign_dispatch_runs (campaign_id, created_at DESC);

ALTER TABLE crm.campaign_dispatch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.campaign_dispatch_runs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE crm.campaign_dispatch_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.campaign_dispatch_runs TO service_role;
REVOKE DELETE ON TABLE crm.campaign_dispatch_runs FROM service_role;

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
  planned_batches JSONB := '[]'::jsonb;
  computed_status TEXT;
  new_run_id UUID;
  batch_total INTEGER;
  created_timestamp TIMESTAMPTZ := now();
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  safe_batch_size := LEAST(GREATEST(COALESCE(p_batch_size, 50), 1), 500);

  SELECT c.*
  INTO campaign_record
  FROM crm.campaigns c
  WHERE c.id = p_campaign_id
    AND c.channel = 'whatsapp';

  IF campaign_record.id IS NULL THEN
    RAISE EXCEPTION 'campaign_not_found' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*) FILTER (WHERE cm.eligibility_status = 'eligible' AND cm.queued_job_id IS NULL AND cm.provider_message_id IS NULL)::integer AS eligible_count,
    count(*) FILTER (WHERE cm.eligibility_status <> 'eligible')::integer AS excluded_count,
    count(*) FILTER (WHERE cm.eligibility_status = 'suppressed')::integer AS suppressed_count,
    count(*) FILTER (WHERE cm.eligibility_status = 'invalid_contact')::integer AS invalid_count,
    count(*) FILTER (WHERE cm.queued_job_id IS NOT NULL OR cm.provider_message_id IS NOT NULL)::integer AS already_processed_count
  INTO member_stats
  FROM crm.campaign_members cm
  WHERE cm.campaign_id = p_campaign_id;

  SELECT
    count(*) FILTER (WHERE oj.status IN ('pending', 'processing', 'retry', 'unknown'))::integer AS active_or_ambiguous_jobs,
    count(*) FILTER (WHERE oj.status = 'dead_letter')::integer AS dead_letter_jobs
  INTO job_risk
  FROM crm.outbound_jobs oj;

  SELECT bp.*
  INTO budget_record
  FROM crm.budget_policies bp
  WHERE bp.provider = 'meta_cloud'
  ORDER BY bp.is_active DESC, bp.kill_switch ASC, bp.updated_at DESC
  LIMIT 1;

  IF campaign_record.status <> 'approved' THEN
    reason_list := reason_list || '["campaign_must_be_approved"]'::jsonb;
  END IF;
  IF campaign_record.approved_at IS NULL THEN
    reason_list := reason_list || '["campaign_approval_timestamp_required"]'::jsonb;
  END IF;
  IF COALESCE(member_stats.eligible_count, 0) = 0 THEN
    reason_list := reason_list || '["no_unprocessed_eligible_members"]'::jsonb;
  END IF;
  IF COALESCE(member_stats.suppressed_count, 0) > 0 THEN
    reason_list := reason_list || '["suppressed_members_must_be_removed_before_dispatch"]'::jsonb;
  END IF;
  IF COALESCE(member_stats.invalid_count, 0) > 0 THEN
    reason_list := reason_list || '["invalid_members_must_be_removed_before_dispatch"]'::jsonb;
  END IF;
  IF COALESCE(member_stats.already_processed_count, 0) > 0 THEN
    reason_list := reason_list || '["campaign_has_already_processed_members"]'::jsonb;
  END IF;
  IF budget_record.id IS NULL OR NOT COALESCE(budget_record.is_active, false) THEN
    reason_list := reason_list || '["active_budget_policy_required"]'::jsonb;
  END IF;
  IF COALESCE(budget_record.kill_switch, true) THEN
    reason_list := reason_list || '["budget_kill_switch_enabled"]'::jsonb;
  END IF;
  IF COALESCE(job_risk.active_or_ambiguous_jobs, 0) > 0 OR COALESCE(job_risk.dead_letter_jobs, 0) > 0 THEN
    reason_list := reason_list || '["outbound_queue_not_clear"]'::jsonb;
  END IF;

  batch_total := CASE
    WHEN COALESCE(member_stats.eligible_count, 0) = 0 THEN 0
    ELSE CEIL(member_stats.eligible_count::numeric / safe_batch_size::numeric)::integer
  END;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'batch_index', batch_index,
    'planned_member_count', LEAST(safe_batch_size, GREATEST(COALESCE(member_stats.eligible_count, 0) - ((batch_index - 1) * safe_batch_size), 0)),
    'sending_enabled', false
  ) ORDER BY batch_index), '[]'::jsonb)
  INTO planned_batches
  FROM generate_series(1, batch_total) AS batch_index;

  computed_status := CASE WHEN jsonb_array_length(reason_list) = 0 THEN 'ready' ELSE 'blocked' END;

  INSERT INTO crm.campaign_dispatch_runs (
    campaign_id,
    run_type,
    status,
    requested_member_count,
    eligible_member_count,
    excluded_member_count,
    batch_size,
    planned_batches,
    reasons,
    sending_enabled,
    created_by_user_id,
    created_at
  )
  VALUES (
    p_campaign_id,
    'preflight',
    computed_status,
    COALESCE(member_stats.eligible_count, 0) + COALESCE(member_stats.excluded_count, 0),
    COALESCE(member_stats.eligible_count, 0),
    COALESCE(member_stats.excluded_count, 0),
    safe_batch_size,
    planned_batches,
    reason_list,
    false,
    p_actor_user_id,
    created_timestamp
  )
  RETURNING id INTO new_run_id;

  INSERT INTO crm.campaign_events (
    campaign_id,
    event_type,
    actor_user_id,
    metadata,
    occurred_at
  )
  VALUES (
    p_campaign_id,
    'dispatch_preflight_' || computed_status,
    p_actor_user_id,
    jsonb_build_object(
      'run_id', new_run_id,
      'batch_size', safe_batch_size,
      'batch_count', batch_total,
      'eligible_member_count', COALESCE(member_stats.eligible_count, 0),
      'excluded_member_count', COALESCE(member_stats.excluded_count, 0),
      'sending_enabled', false,
      'reasons', reason_list
    ),
    created_timestamp
  );

  RETURN QUERY
  SELECT
    new_run_id,
    p_campaign_id,
    computed_status,
    computed_status = 'ready',
    COALESCE(member_stats.eligible_count, 0)::integer,
    COALESCE(member_stats.excluded_count, 0)::integer,
    safe_batch_size,
    batch_total,
    reason_list,
    false,
    created_timestamp;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_whatsapp_campaign_dispatch_preflight(UUID, INTEGER, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_campaign_dispatch_preflight(UUID, INTEGER, UUID)
  TO authenticated, service_role;

COMMENT ON TABLE crm.campaign_dispatch_runs IS
  'Auditable WhatsApp campaign preflight runs. These records do not authorize or perform sending.';

COMMENT ON FUNCTION public.crm_whatsapp_campaign_dispatch_preflight(UUID, INTEGER, UUID) IS
  'Admin-only dispatch preflight. It plans batches but never creates outbound jobs or sends messages.';
