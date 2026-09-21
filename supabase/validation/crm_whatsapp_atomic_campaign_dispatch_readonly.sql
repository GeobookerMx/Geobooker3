-- READ ONLY validation for atomic WhatsApp campaign dispatch.
-- Run after migration 20260921100000. This script never creates jobs/messages,
-- never changes the queue gate and never calls Meta.

SELECT
  to_regclass('crm.whatsapp_campaign_dispatch_controls') IS NOT NULL AS control_table_exists,
  to_regprocedure('public.crm_dispatch_whatsapp_campaign_atomic(uuid,uuid,integer,uuid,timestamp with time zone)') IS NOT NULL AS dispatch_function_exists,
  to_regprocedure('public.crm_whatsapp_campaign_job_gate(uuid,uuid,timestamp with time zone)') IS NOT NULL AS worker_gate_exists,
  to_regprocedure('crm.release_whatsapp_campaign_reservation(uuid,uuid,text,text,timestamp with time zone)') IS NOT NULL AS release_function_exists,
  to_regprocedure('crm.release_expired_whatsapp_campaign_reservations(integer,timestamp with time zone)') IS NOT NULL AS expiry_cleanup_exists;

SELECT
  provider,
  queue_enabled,
  single_use,
  max_members_per_dispatch,
  authorization_expires_at IS NOT NULL AS has_expiry,
  authorized_by_user_id IS NOT NULL AS has_authorizer
FROM crm.whatsapp_campaign_dispatch_controls
WHERE provider = 'meta_cloud';

SELECT
  has_function_privilege('service_role', 'public.crm_dispatch_whatsapp_campaign_atomic(uuid,uuid,integer,uuid,timestamp with time zone)', 'EXECUTE') AS service_role_dispatch,
  has_function_privilege('anon', 'public.crm_dispatch_whatsapp_campaign_atomic(uuid,uuid,integer,uuid,timestamp with time zone)', 'EXECUTE') AS anon_dispatch,
  has_function_privilege('authenticated', 'public.crm_dispatch_whatsapp_campaign_atomic(uuid,uuid,integer,uuid,timestamp with time zone)', 'EXECUTE') AS authenticated_dispatch,
  has_function_privilege('service_role', 'crm.release_whatsapp_campaign_reservation(uuid,uuid,text,text,timestamp with time zone)', 'EXECUTE') AS service_role_release,
  has_function_privilege('anon', 'crm.release_whatsapp_campaign_reservation(uuid,uuid,text,text,timestamp with time zone)', 'EXECUTE') AS anon_release,
  has_function_privilege('authenticated', 'crm.release_whatsapp_campaign_reservation(uuid,uuid,text,text,timestamp with time zone)', 'EXECUTE') AS authenticated_release;

SELECT
  reservation_status,
  count(*) AS reservations,
  count(*) FILTER (WHERE reservation_expires_at <= now()) AS expired,
  count(*) FILTER (WHERE reservation_status = 'reserved' AND reservation_expires_at <= now()) AS expired_active
FROM crm.usage_ledger
WHERE campaign_member_id IS NOT NULL
GROUP BY reservation_status
ORDER BY reservation_status;

SELECT
  count(*) FILTER (WHERE oj.status IN ('pending', 'processing', 'retry')) AS active_campaign_jobs,
  count(*) FILTER (WHERE oj.status = 'unknown') AS ambiguous_campaign_jobs,
  count(*) FILTER (WHERE oj.status = 'dead_letter') AS dead_letter_campaign_jobs,
  count(*) FILTER (WHERE ul.reservation_status = 'released' AND m.provider_message_id IS NOT NULL) AS invalid_released_after_provider_id
FROM crm.outbound_jobs oj
LEFT JOIN crm.messages m ON m.id = oj.message_id
LEFT JOIN crm.usage_ledger ul ON ul.outbound_job_id = oj.id
WHERE oj.job_type = 'campaign';

SELECT
  count(*) FILTER (WHERE cm.queued_job_id IS NOT NULL AND oj.id IS NULL) AS dangling_member_job_links,
  count(*) FILTER (WHERE ul.reservation_status = 'reserved' AND cm.queued_job_id IS DISTINCT FROM ul.outbound_job_id) AS reservation_member_mismatch,
  count(*) FILTER (WHERE ul.reservation_status = 'reserved' AND ul.reservation_expires_at IS NULL) AS reservation_without_expiry
FROM crm.campaign_members cm
LEFT JOIN crm.outbound_jobs oj ON oj.id = cm.queued_job_id
LEFT JOIN crm.usage_ledger ul ON ul.campaign_member_id = cm.id AND ul.reservation_status = 'reserved';
