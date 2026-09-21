-- Read-only verification after applying the template reconciliation migration
-- and running Sync from Meta once more.

SELECT
  count(*) AS total_templates,
  count(*) FILTER (WHERE approval_status = 'approved') AS approved_templates,
  count(*) FILTER (WHERE enabled_for_campaigns) AS enabled_for_campaigns,
  count(*) FILTER (WHERE raw_hash IS NOT NULL) AS snapshots_hashed,
  count(*) FILTER (WHERE reconciliation_status = 'locale_mismatch') AS locale_mismatches,
  count(*) FILTER (WHERE reconciliation_status = 'name_mismatch') AS name_mismatches,
  count(*) FILTER (WHERE reconciliation_status = 'legacy') AS legacy_templates
FROM crm.whatsapp_templates;

SELECT
  provider_template_id,
  template_name,
  language_code,
  category,
  approval_status,
  quality_score,
  template_family,
  campaign_role,
  reconciliation_status,
  reconciliation_notes,
  enabled_for_campaigns,
  last_synced_at
FROM crm.whatsapp_templates
ORDER BY template_name, language_code;

