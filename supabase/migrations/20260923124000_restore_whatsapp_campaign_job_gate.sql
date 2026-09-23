BEGIN;

-- Restore the public RPC used by whatsapp-worker before submitting a campaign
-- message to Meta. The worker calls admin.rpc('crm_whatsapp_campaign_job_gate')
-- without schema qualification, so this helper must exist in the exposed public
-- RPC namespace while still being executable only by service_role.

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

  SELECT *
    INTO job_record
  FROM crm.outbound_jobs
  WHERE id = p_job_id
    AND message_id = p_message_id
    AND job_type = 'campaign';

  SELECT *
    INTO reservation
  FROM crm.usage_ledger
  WHERE outbound_job_id = p_job_id
    AND message_id = p_message_id;

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
    JOIN crm.campaigns c
      ON c.id = cm.campaign_id
    JOIN crm.contact_points cp
      ON cp.id = cm.contact_point_id
    WHERE cm.id = reservation.campaign_member_id
      AND cm.queued_job_id = p_job_id
      AND c.status IN ('approved', 'scheduled', 'running');

    IF member_gate.id IS NULL THEN
      reason_list := reason_list || '["campaign_or_member_not_dispatchable"]'::jsonb;
    ELSE
      campaign_record := member_gate;

      SELECT cp.*
        INTO permission_gate
      FROM crm.channel_permissions cp
      WHERE cp.contact_id = member_gate.contact_id
        AND cp.channel = 'whatsapp'
        AND cp.purpose = member_gate.purpose;

      IF permission_gate.id IS NULL
        OR (member_gate.purpose = 'marketing' AND permission_gate.status <> 'opted_in')
        OR (member_gate.purpose = 'transactional' AND permission_gate.status NOT IN ('allowed', 'opted_in'))
        OR NOT EXISTS (
          SELECT 1
          FROM crm.consent_evidence ce
          WHERE ce.channel_permission_id = permission_gate.id
            AND ce.contact_id = member_gate.contact_id
            AND ce.channel = 'whatsapp'
            AND ce.purpose = member_gate.purpose
        )
        OR EXISTS (
          SELECT 1
          FROM crm.channel_permissions blocked
          WHERE blocked.contact_id = member_gate.contact_id
            AND blocked.channel = 'whatsapp'
            AND blocked.status IN ('opted_out', 'suppressed', 'invalid', 'complaint')
        )
        OR EXISTS (
          SELECT 1
          FROM crm.suppressions s
          WHERE s.status = 'active'
            AND s.identifier_type = 'whatsapp'
            AND s.normalized_identifier = member_gate.normalized_value
            AND (s.channel = 'whatsapp' OR s.channel IS NULL)
        ) THEN
        reason_list := reason_list || '["campaign_consent_or_suppression_changed"]'::jsonb;
      END IF;
    END IF;
  END IF;

  SELECT *
    INTO budget_record
  FROM crm.budget_policies
  WHERE provider = 'meta_cloud'
    AND is_active
  ORDER BY updated_at DESC
  LIMIT 1;

  IF budget_record.id IS NULL OR budget_record.kill_switch THEN
    reason_list := reason_list || '["budget_kill_switch_enabled"]'::jsonb;
  END IF;

  IF campaign_record.purpose IS NOT NULL THEN
    SELECT *
      INTO frequency_record
    FROM crm.messaging_frequency_policies
    WHERE channel = 'whatsapp'
      AND purpose = campaign_record.purpose
      AND is_active
    ORDER BY updated_at DESC
    LIMIT 1;

    IF frequency_record.id IS NULL OR frequency_record.kill_switch THEN
      reason_list := reason_list || '["frequency_kill_switch_enabled"]'::jsonb;
    END IF;
  END IF;

  RETURN QUERY SELECT
    jsonb_array_length(reason_list) = 0,
    reason_list,
    COALESCE(reservation.reservation_status, 'missing');
END;
$$;

REVOKE ALL ON FUNCTION public.crm_whatsapp_campaign_job_gate(UUID, UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_campaign_job_gate(UUID, UUID, TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION public.crm_whatsapp_campaign_job_gate(UUID, UUID, TIMESTAMPTZ) IS
  'Service-role-only worker recheck for a previously reserved WhatsApp campaign job. It validates reservation, campaign state, consent, suppression, budget and frequency before provider submission.';

NOTIFY pgrst, 'reload schema';

COMMIT;
