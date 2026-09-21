-- Expected staged state. This script is read-only and sends nothing.

SELECT policy_name, currency, daily_message_limit, monthly_limit,
  is_active, kill_switch
FROM crm.budget_policies
WHERE provider = 'meta_cloud'
ORDER BY policy_name;

SELECT policy_name, purpose, minimum_interval_minutes, max_messages_24h,
  max_messages_7d, max_messages_30d, is_active, kill_switch
FROM crm.messaging_frequency_policies
WHERE channel = 'whatsapp'
ORDER BY purpose, policy_name;

SELECT rate_card_version, country_code, category, currency, unit_cost, status,
  source_checked_at
FROM crm.whatsapp_rate_cards
WHERE country_code = 'MX'
ORDER BY category, rate_card_version;

SELECT
  count(*) FILTER (WHERE enabled_for_campaigns) AS enabled_templates,
  count(*) FILTER (WHERE approval_status = 'approved') AS approved_templates
FROM crm.whatsapp_templates;

SELECT
  to_regprocedure('public.crm_whatsapp_global_daily_gate(timestamp with time zone)') IS NOT NULL AS gate_exists,
  has_function_privilege('service_role', 'public.crm_whatsapp_global_daily_gate(timestamp with time zone)', 'EXECUTE') AS service_role_execute,
  has_function_privilege('anon', 'public.crm_whatsapp_global_daily_gate(timestamp with time zone)', 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', 'public.crm_whatsapp_global_daily_gate(timestamp with time zone)', 'EXECUTE') AS authenticated_execute;

