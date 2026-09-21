-- Read-only validation for 20260918161000_crm_whatsapp_activity_metrics.sql

SELECT
  to_regprocedure('crm.whatsapp_health_message_metrics(timestamp with time zone)') IS NOT NULL AS metrics_function_exists,
  has_function_privilege('service_role', 'crm.whatsapp_health_message_metrics(timestamp with time zone)', 'EXECUTE') AS service_role_execute,
  has_function_privilege('anon', 'crm.whatsapp_health_message_metrics(timestamp with time zone)', 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', 'crm.whatsapp_health_message_metrics(timestamp with time zone)', 'EXECUTE') AS authenticated_execute;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'crm'
  AND indexname = 'crm_activities_message_type_uidx';

SELECT message_id, activity_type, count(*) AS duplicate_count
FROM crm.activities
WHERE message_id IS NOT NULL
GROUP BY message_id, activity_type
HAVING count(*) > 1;

SELECT *
FROM crm.whatsapp_health_message_metrics(date_trunc('day', now()));

SELECT
  m.id AS message_id,
  m.current_status,
  count(a.id) FILTER (WHERE a.activity_type = 'whatsapp_outbound') AS outbound_activity_count
FROM crm.messages m
LEFT JOIN crm.activities a ON a.message_id = m.id
WHERE m.direction = 'outbound'
  AND m.provider_message_id IS NOT NULL
  AND m.current_status IN ('accepted', 'sent', 'delivered', 'read')
GROUP BY m.id, m.current_status
ORDER BY max(m.created_at) DESC
LIMIT 20;
