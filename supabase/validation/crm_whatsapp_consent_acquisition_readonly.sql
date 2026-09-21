-- Read-only validation for WhatsApp consent acquisition.
-- Expected: every boolean column is true and no rows are modified.

SELECT
  to_regclass('crm.whatsapp_consent_requests') IS NOT NULL AS table_exists,
  COALESCE((
    SELECT c.relrowsecurity AND c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'crm' AND c.relname = 'whatsapp_consent_requests'
  ), false) AS rls_forced,
  has_table_privilege('service_role', 'crm.whatsapp_consent_requests', 'SELECT') AS service_role_select,
  has_table_privilege('service_role', 'crm.whatsapp_consent_requests', 'INSERT') AS service_role_insert,
  has_table_privilege('service_role', 'crm.whatsapp_consent_requests', 'UPDATE') AS service_role_update,
  NOT has_table_privilege('service_role', 'crm.whatsapp_consent_requests', 'DELETE') AS service_role_delete_blocked,
  NOT has_table_privilege('anon', 'crm.whatsapp_consent_requests', 'SELECT') AS anon_blocked,
  NOT has_table_privilege('authenticated', 'crm.whatsapp_consent_requests', 'SELECT') AS authenticated_blocked,
  to_regclass('crm.crm_whatsapp_consent_code_uidx') IS NOT NULL AS code_hash_unique_index,
  to_regclass('crm.crm_consent_evidence_reference_uidx') IS NOT NULL AS evidence_idempotency_index;

