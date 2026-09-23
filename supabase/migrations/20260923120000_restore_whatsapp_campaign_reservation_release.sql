-- Restore the helper used by whatsapp-worker to release campaign reservations
-- before provider submission when a definitive local failure occurs.

ALTER TABLE crm.usage_ledger
  ADD COLUMN IF NOT EXISTS release_reason TEXT,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

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

  SELECT * INTO reservation
  FROM crm.usage_ledger
  WHERE outbound_job_id = p_job_id
    AND message_id = p_message_id
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

  SELECT * INTO job_record
  FROM crm.outbound_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  SELECT * INTO message_record
  FROM crm.messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF job_record.id IS NULL
    OR message_record.id IS NULL
    OR job_record.job_type <> 'campaign' THEN
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
  WHERE id = reservation.id
    AND reservation_status = 'reserved';

  UPDATE crm.campaign_members
  SET queued_job_id = NULL,
      eligibility_status = 'needs_review',
      eligibility_reasons = COALESCE(eligibility_reasons, '[]'::jsonb)
        || jsonb_build_array('reservation_released:' || safe_reason),
      updated_at = p_now
  WHERE id = reservation.campaign_member_id
    AND queued_job_id = p_job_id;

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
    ),
    p_now
  FROM crm.campaign_members cm
  WHERE cm.id = reservation.campaign_member_id;

  INSERT INTO crm.audit_log (
    actor_type, action, entity_type, entity_id, new_values, request_id
  ) VALUES (
    'system',
    'whatsapp.campaign_reservation_released',
    'outbound_job',
    p_job_id,
    jsonb_build_object(
      'message_id', p_message_id,
      'campaign_member_id', reservation.campaign_member_id,
      'final_status', p_final_status,
      'reason', safe_reason
    ),
    job_record.idempotency_key
  );

  RETURN QUERY SELECT true, false, 'released'::text;
END;
$$;

REVOKE ALL ON FUNCTION crm.release_whatsapp_campaign_reservation(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.release_whatsapp_campaign_reservation(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION crm.release_whatsapp_campaign_reservation(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) IS
  'Releases a reserved WhatsApp campaign usage ledger row only when no provider acceptance/ambiguity exists.';
