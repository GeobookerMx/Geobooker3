-- Enable exactly one reviewed template for the first no-send campaign dry run.
-- This does not enable a market, rate, queue, worker or WhatsApp sending.

DO $$
DECLARE
  target_id UUID;
BEGIN
  SELECT id INTO target_id
  FROM crm.whatsapp_templates
  WHERE template_name = 'gb_ads_followup_es_mx'
    AND lower(replace(language_code, '-', '_')) = 'es_mx'
    AND category = 'marketing'
    AND approval_status = 'approved'
    AND provider_status = 'APPROVED'
    AND reconciliation_status = 'ready_for_campaign'
  ORDER BY last_synced_at DESC NULLS LAST
  LIMIT 1;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'gb_ads_followup_es_mx_not_ready_for_campaign'
      USING ERRCODE = '22023';
  END IF;

  UPDATE crm.whatsapp_templates
  SET
    enabled_for_campaigns = true,
    reviewed_at = COALESCE(reviewed_at, now()),
    reconciliation_notes = COALESCE(reconciliation_notes, '[]'::jsonb)
      || '["ENABLED_FOR_CONTROLLED_MX_DRY_RUN"]'::jsonb,
    updated_at = now()
  WHERE id = target_id;
END;
$$;
