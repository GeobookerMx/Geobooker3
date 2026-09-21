-- Read-only validation for WhatsApp Campaign Wizard V2.
-- Expected: every boolean column is true and no rows are modified.

SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'campaigns' AND column_name = 'campaign_goal'
  ) AS campaign_goal_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'campaigns' AND column_name = 'estimated_cost'
  ) AS estimated_cost_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'campaign_members' AND column_name = 'estimated_unit_cost'
  ) AS member_cost_exists,
  to_regprocedure('public.crm_create_whatsapp_campaign_draft_v2(text,text,text,uuid,jsonb,uuid)') IS NOT NULL AS draft_function_exists,
  to_regprocedure('public.crm_prepare_whatsapp_campaign_review_v2(uuid,uuid)') IS NOT NULL AS review_function_exists,
  to_regprocedure('public.crm_whatsapp_campaign_report_v2(uuid)') IS NOT NULL AS report_function_exists,
  has_function_privilege('service_role', 'public.crm_create_whatsapp_campaign_draft_v2(text,text,text,uuid,jsonb,uuid)', 'EXECUTE') AS service_role_draft_execute,
  has_function_privilege('service_role', 'public.crm_prepare_whatsapp_campaign_review_v2(uuid,uuid)', 'EXECUTE') AS service_role_review_execute,
  has_function_privilege('service_role', 'public.crm_whatsapp_campaign_report_v2(uuid)', 'EXECUTE') AS service_role_report_execute,
  NOT has_function_privilege('anon', 'public.crm_create_whatsapp_campaign_draft_v2(text,text,text,uuid,jsonb,uuid)', 'EXECUTE') AS anon_draft_blocked,
  NOT has_function_privilege('authenticated', 'public.crm_create_whatsapp_campaign_draft_v2(text,text,text,uuid,jsonb,uuid)', 'EXECUTE') AS authenticated_draft_blocked,
  NOT has_function_privilege('anon', 'public.crm_prepare_whatsapp_campaign_review_v2(uuid,uuid)', 'EXECUTE') AS anon_review_blocked,
  NOT has_function_privilege('authenticated', 'public.crm_prepare_whatsapp_campaign_review_v2(uuid,uuid)', 'EXECUTE') AS authenticated_review_blocked,
  (SELECT count(*) FROM crm.outbound_jobs WHERE status IN ('pending', 'processing', 'retry')) = 0 AS no_active_outbound_jobs,
  (SELECT count(*) FROM crm.outbound_jobs WHERE status = 'dead_letter') = 0 AS no_dead_letter_jobs;
