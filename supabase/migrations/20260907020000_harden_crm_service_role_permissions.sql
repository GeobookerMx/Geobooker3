-- Harden CRM direct Data API permissions after exposing the `crm` schema.
--
-- Browser-facing roles must not receive direct table access to CRM data. Admin
-- UI access should go through authenticated Edge Functions/RPCs, while server
-- workflows use service_role without DELETE by default.

CREATE SCHEMA IF NOT EXISTS crm;

REVOKE ALL ON SCHEMA crm FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA crm TO service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA crm FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA crm FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA crm
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA crm
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;

-- service_role is the backend role used by Edge Functions. It can read/write
-- CRM operational tables, but deletion remains disabled unless a future
-- migration grants it table-by-table with a specific reason.
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA crm TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA crm TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA crm
  GRANT SELECT, INSERT, UPDATE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA crm
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;

REVOKE DELETE ON ALL TABLES IN SCHEMA crm FROM service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA crm
  REVOKE DELETE ON TABLES FROM service_role;

DO $$
DECLARE
  table_row RECORD;
BEGIN
  IF has_schema_privilege('anon', 'crm', 'USAGE')
     OR has_schema_privilege('authenticated', 'crm', 'USAGE') THEN
    RAISE EXCEPTION 'CRM schema is directly accessible to browser-facing roles';
  END IF;

  IF NOT has_schema_privilege('service_role', 'crm', 'USAGE') THEN
    RAISE EXCEPTION 'service_role lacks USAGE on crm';
  END IF;

  FOR table_row IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'crm'
  LOOP
    IF has_table_privilege('anon', format('crm.%I', table_row.tablename), 'SELECT,INSERT,UPDATE,DELETE')
       OR has_table_privilege('authenticated', format('crm.%I', table_row.tablename), 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'Browser-facing role retains direct privileges on crm.%', table_row.tablename;
    END IF;

    IF NOT has_table_privilege('service_role', format('crm.%I', table_row.tablename), 'SELECT,INSERT,UPDATE') THEN
      RAISE EXCEPTION 'service_role lacks CRM write privileges on crm.%', table_row.tablename;
    END IF;

    IF has_table_privilege('service_role', format('crm.%I', table_row.tablename), 'DELETE') THEN
      RAISE EXCEPTION 'service_role unexpectedly has DELETE on crm.%', table_row.tablename;
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
