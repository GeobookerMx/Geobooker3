-- Read-only validation after applying
-- 20260917010000_crm_whatsapp_commercial_safety_gates.sql

SELECT
  to_regclass('crm.whatsapp_rate_cards') IS NOT NULL AS rate_cards_exists,
  to_regclass('crm.messaging_frequency_policies') IS NOT NULL AS frequency_policies_exists,
  to_regprocedure('public.crm_whatsapp_outbound_guard(uuid,text,text,text,uuid,timestamptz)') IS NOT NULL AS guard_exists,
  has_function_privilege(
    'service_role',
    'public.crm_whatsapp_outbound_guard(uuid,text,text,text,uuid,timestamptz)',
    'EXECUTE'
  ) AS service_role_execute,
  has_function_privilege(
    'anon',
    'public.crm_whatsapp_outbound_guard(uuid,text,text,text,uuid,timestamptz)',
    'EXECUTE'
  ) AS anon_execute,
  has_function_privilege(
    'authenticated',
    'public.crm_whatsapp_outbound_guard(uuid,text,text,text,uuid,timestamptz)',
    'EXECUTE'
  ) AS authenticated_execute;

SELECT
  count(*) AS total_frequency_policies,
  count(*) FILTER (WHERE is_active) AS active_frequency_policies,
  count(*) FILTER (WHERE is_active AND NOT kill_switch) AS open_frequency_policies
FROM crm.messaging_frequency_policies
WHERE channel = 'whatsapp';

SELECT
  count(*) AS total_rate_cards,
  count(*) FILTER (WHERE status = 'active') AS active_rate_cards
FROM crm.whatsapp_rate_cards;

