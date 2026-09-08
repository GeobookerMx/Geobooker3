-- Read-only validation for 20260908015000_crm_global_campaign_planning.sql.

SELECT
  to_regclass('crm.product_catalog') AS product_catalog,
  to_regclass('crm.campaign_products') AS campaign_products,
  to_regclass('crm.campaign_targets') AS campaign_targets,
  to_regclass('crm.campaign_localizations') AS campaign_localizations,
  to_regclass('crm.campaign_commercial_terms') AS campaign_commercial_terms;

SELECT
  table_name,
  is_insertable_into
FROM information_schema.tables
WHERE table_schema = 'crm'
  AND table_name IN (
    'product_catalog', 'campaign_products', 'campaign_targets',
    'campaign_localizations', 'campaign_commercial_terms'
  )
ORDER BY table_name;

SELECT
  grantee,
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'crm'
  AND table_name IN (
    'product_catalog', 'campaign_products', 'campaign_targets',
    'campaign_localizations', 'campaign_commercial_terms'
  )
GROUP BY grantee, table_name
ORDER BY table_name, grantee;

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'crm'
  AND c.relname IN (
    'product_catalog', 'campaign_products', 'campaign_targets',
    'campaign_localizations', 'campaign_commercial_terms'
  )
ORDER BY c.relname;

SELECT
  has_table_privilege('anon', format('crm.%I', table_name), 'SELECT') AS anon_can_select,
  has_table_privilege('authenticated', format('crm.%I', table_name), 'SELECT') AS authenticated_can_select,
  has_table_privilege('service_role', format('crm.%I', table_name), 'SELECT') AS service_role_can_select,
  has_table_privilege('service_role', format('crm.%I', table_name), 'INSERT') AS service_role_can_insert,
  has_table_privilege('service_role', format('crm.%I', table_name), 'UPDATE') AS service_role_can_update,
  has_table_privilege('service_role', format('crm.%I', table_name), 'DELETE') AS service_role_can_delete,
  table_name
FROM unnest(ARRAY[
  'product_catalog', 'campaign_products', 'campaign_targets',
  'campaign_localizations', 'campaign_commercial_terms'
]) AS table_name
ORDER BY table_name;

SELECT *
FROM public.crm_global_campaign_plan_overview(
  '00000000-0000-0000-0000-000000000001'::uuid
);

