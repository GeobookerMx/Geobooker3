-- Read-only audit. Does not enable templates or sending.
SELECT
  id,
  template_name,
  language_code,
  category,
  approval_status,
  provider_status,
  reconciliation_status,
  enabled_for_campaigns,
  campaign_role,
  quality_score,
  last_synced_at
FROM crm.whatsapp_templates
WHERE lower(replace(language_code, '-', '_')) = 'es_mx'
  AND category = 'marketing'
ORDER BY
  (approval_status = 'approved') DESC,
  (reconciliation_status = 'ready_for_campaign') DESC,
  template_name;
