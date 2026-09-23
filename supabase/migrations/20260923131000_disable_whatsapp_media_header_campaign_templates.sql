BEGIN;

-- Campaign sends must not use Meta templates with media headers until the CRM
-- has a stable, provider-approved media mapping per template. Reusing the
-- synced WhatsApp example URL can produce provider status 131053
-- (Media upload error) after Meta accepts the message request.

UPDATE crm.whatsapp_templates wt
SET
  enabled_for_campaigns = false,
  reconciliation_status = CASE
    WHEN reconciliation_status = 'ready_for_campaign' THEN 'pass'
    ELSE reconciliation_status
  END,
  reconciliation_notes = (
    SELECT jsonb_agg(DISTINCT note)
    FROM jsonb_array_elements_text(
      COALESCE(wt.reconciliation_notes, '[]'::jsonb)
      || '["CAMPAIGN_DISABLED_MEDIA_HEADER_REQUIRES_STABLE_PROVIDER_MEDIA"]'::jsonb
    ) AS notes(note)
  ),
  updated_at = now()
WHERE wt.enabled_for_campaigns = true
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(wt.components, '[]'::jsonb)) AS component(value)
    WHERE upper(component.value->>'type') = 'HEADER'
      AND upper(COALESCE(component.value->>'format', '')) IN ('IMAGE', 'VIDEO', 'DOCUMENT')
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
