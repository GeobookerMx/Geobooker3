-- Read-only validation. Expected safe state: policy exists but is inactive and
-- kill-switched; marketing frequency remains inactive and kill-switched.

SELECT policy_name, currency, daily_limit, monthly_limit, daily_message_limit,
  warning_percent, high_warning_percent, hard_block_percent, timezone_name,
  is_active, kill_switch
FROM crm.budget_policies
WHERE policy_name = 'geobooker_whatsapp_pilot_mx_v1';

SELECT policy_name, minimum_interval_minutes, max_messages_24h,
  max_messages_7d, max_messages_30d, is_active, kill_switch
FROM crm.messaging_frequency_policies
WHERE channel = 'whatsapp' AND purpose = 'marketing';

SELECT
  to_regprocedure('public.crm_whatsapp_global_daily_gate(timestamp with time zone)') IS NOT NULL AS gate_exists,
  has_function_privilege('service_role', 'public.crm_whatsapp_global_daily_gate(timestamp with time zone)', 'EXECUTE') AS service_role_execute,
  has_function_privilege('anon', 'public.crm_whatsapp_global_daily_gate(timestamp with time zone)', 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', 'public.crm_whatsapp_global_daily_gate(timestamp with time zone)', 'EXECUTE') AS authenticated_execute;

