-- Read-only reconciliation for manually applied CRM migrations and workspace scope.
-- This file performs SELECT statements only and exposes no secrets or row data.

SELECT
  current_database() AS database_name,
  current_user AS database_role,
  now() AS checked_at;

SELECT
  expected.relation_name,
  to_regclass(expected.relation_name) IS NOT NULL AS present
FROM (VALUES
  ('crm.accounts'),
  ('crm.contacts'),
  ('crm.channel_permissions'),
  ('crm.suppressions'),
  ('crm.conversations'),
  ('crm.messages'),
  ('crm.activities'),
  ('crm.campaigns'),
  ('crm.campaign_members'),
  ('crm.campaign_events'),
  ('crm.campaign_dispatch_runs'),
  ('crm.market_policies'),
  ('crm.consent_evidence'),
  ('crm.workspaces'),
  ('crm.workspace_users'),
  ('crm.workspace_access_audit'),
  ('crm.ingestion_runs'),
  ('crm.source_events'),
  ('crm.source_entity_links'),
  ('crm.ingestion_reconciliation_snapshots')
) AS expected(relation_name)
ORDER BY expected.relation_name;

SELECT
  expected.function_name,
  to_regprocedure(expected.function_name) IS NOT NULL AS present
FROM (VALUES
  ('public.crm_campaign_readiness_overview()'),
  ('public.crm_whatsapp_campaign_preview(text,text,integer)'),
  ('public.crm_create_whatsapp_campaign_draft(text,text,uuid,text,text,integer,uuid)'),
  ('public.crm_prepare_whatsapp_campaign_review(uuid,integer,uuid)'),
  ('public.crm_whatsapp_campaign_approval_check(uuid)'),
  ('public.crm_approve_whatsapp_campaign(uuid,uuid,boolean)'),
  ('public.crm_whatsapp_campaign_dispatch_preflight(uuid,integer,uuid)'),
  ('public.crm_whatsapp_international_readiness()'),
  ('public.crm_whatsapp_campaign_market_check(uuid)'),
  ('public.crm_workspace_foundation_status()'),
  ('public.crm_ingestion_360_status(uuid)')
) AS expected(function_name)
ORDER BY expected.function_name;

SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'SELECT') AS anon_select,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'SELECT') AS authenticated_select,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'INSERT,UPDATE,DELETE') AS authenticated_write,
  has_table_privilege('service_role', format('%I.%I', n.nspname, c.relname), 'SELECT') AS service_select,
  has_table_privilege('service_role', format('%I.%I', n.nspname, c.relname), 'INSERT,UPDATE') AS service_write,
  has_table_privilege('service_role', format('%I.%I', n.nspname, c.relname), 'DELETE') AS service_delete
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'crm'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

SELECT
  role_row.rolname,
  config_value
FROM pg_roles role_row
CROSS JOIN LATERAL unnest(COALESCE(role_row.rolconfig, ARRAY[]::text[])) AS config_value
WHERE role_row.rolname = 'authenticator'
  AND config_value LIKE 'pgrst.db_schemas=%';

SELECT
  version,
  name,
  statements IS NOT NULL AS has_statements
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260907010000',
  '20260907020000',
  '20260907021000',
  '20260907022000',
  '20260907023000',
  '20260907024000',
  '20260907025000',
  '20260908010000',
  '20260908011000',
  '20260908012000',
  '20260908013000'
)
ORDER BY version;

-- Execute after the workspace migration. Every root table must report
-- unscoped_rows = 0 and total_rows = internal_rows.
SELECT * FROM public.crm_workspace_foundation_status();
