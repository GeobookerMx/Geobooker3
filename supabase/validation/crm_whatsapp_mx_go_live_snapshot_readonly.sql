-- Read-only snapshot for the Mexico campaign go-live gates.
WITH mx_market AS (
  SELECT * FROM crm.market_policies WHERE country_code = 'MX'
), mx_rate AS (
  SELECT * FROM crm.whatsapp_rate_cards
  WHERE country_code = 'MX' AND category = 'marketing'
  ORDER BY (status = 'active') DESC, effective_from DESC LIMIT 1
), marketing_frequency AS (
  SELECT * FROM crm.messaging_frequency_policies
  WHERE channel = 'whatsapp' AND purpose = 'marketing'
  ORDER BY is_active DESC, updated_at DESC LIMIT 1
), active_budget AS (
  SELECT * FROM crm.budget_policies
  WHERE provider = 'meta_cloud'
  ORDER BY is_active DESC, updated_at DESC LIMIT 1
), eligible_contacts AS (
  SELECT count(DISTINCT cp.contact_id) AS total
  FROM crm.contact_points cp
  JOIN crm.contacts c ON c.id = cp.contact_id AND c.contact_status = 'active'
  JOIN crm.channel_permissions perm
    ON perm.contact_id = c.id
   AND perm.channel = 'whatsapp'
   AND perm.purpose = 'marketing'
   AND perm.status IN ('allowed', 'opted_in')
   AND perm.consented_at IS NOT NULL
   AND NULLIF(btrim(perm.consent_source), '') IS NOT NULL
   AND NULLIF(btrim(perm.consent_text_version), '') IS NOT NULL
  WHERE cp.point_type = 'whatsapp'
    AND cp.validation_status = 'valid'
    AND COALESCE(c.country_code, cp.country_code) = 'MX'
    AND EXISTS (
      SELECT 1 FROM crm.consent_evidence ce
      WHERE ce.channel_permission_id = perm.id
        AND ce.contact_id = c.id
        AND ce.channel = 'whatsapp'
        AND ce.purpose = 'marketing'
    )
    AND NOT EXISTS (
      SELECT 1 FROM crm.suppressions s
      WHERE s.status = 'active'
        AND s.identifier_type = 'whatsapp'
        AND s.normalized_identifier = cp.normalized_value
        AND (s.channel = 'whatsapp' OR s.channel IS NULL)
    )
)
SELECT
  COALESCE((SELECT market_status FROM mx_market), 'missing') AS market_status,
  COALESCE((SELECT whatsapp_marketing_enabled FROM mx_market), false) AS market_enabled,
  (SELECT reviewed_at FROM mx_market) IS NOT NULL AS market_reviewed,
  COALESCE((SELECT daily_recipient_cap FROM mx_market), 0) AS market_daily_cap,
  COALESCE((SELECT status FROM mx_rate), 'missing') AS marketing_rate_status,
  COALESCE((SELECT currency FROM mx_rate), '-') AS marketing_rate_currency,
  COALESCE((SELECT unit_cost FROM mx_rate), 0) AS marketing_unit_cost,
  COALESCE((SELECT is_active FROM marketing_frequency), false) AS frequency_active,
  COALESCE((SELECT kill_switch FROM marketing_frequency), true) AS frequency_kill_switch,
  COALESCE((SELECT max_messages_7d FROM marketing_frequency), 0) AS max_messages_7d,
  COALESCE((SELECT is_active FROM active_budget), false) AS budget_active,
  COALESCE((SELECT kill_switch FROM active_budget), true) AS budget_kill_switch,
  COALESCE((SELECT daily_message_limit FROM active_budget), 0) AS budget_daily_message_limit,
  COALESCE((SELECT monthly_limit FROM active_budget), 0) AS budget_monthly_limit,
  (SELECT total FROM eligible_contacts) AS evidenced_eligible_contacts,
  (SELECT count(*) FROM crm.outbound_jobs WHERE status IN ('pending', 'processing', 'retry')) AS active_jobs,
  (SELECT count(*) FROM crm.outbound_jobs WHERE status = 'dead_letter') AS dead_letter_jobs;
