BEGIN;

CREATE OR REPLACE FUNCTION public.get_security_audit_snapshot()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'tables_without_rls',
    COALESCE(
      (
        SELECT jsonb_agg(pt.tablename ORDER BY pt.tablename)
        FROM pg_catalog.pg_tables AS pt
        JOIN pg_catalog.pg_namespace AS pn
          ON pn.nspname = pt.schemaname
        JOIN pg_catalog.pg_class AS pc
          ON pc.relnamespace = pn.oid
         AND pc.relname = pt.tablename
        WHERE pt.schemaname = 'public'
          AND pc.relkind IN ('r', 'p')
          AND pc.relrowsecurity = FALSE
          AND pt.tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
      ),
      '[]'::jsonb
    ),
    'policies',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'tablename', policy.tablename,
            'policyname', policy.policyname,
            'cmd', policy.cmd,
            'roles', to_jsonb(policy.roles)
          )
          ORDER BY policy.tablename, policy.policyname
        )
        FROM pg_catalog.pg_policies AS policy
        WHERE policy.schemaname = 'public'
      ),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_security_audit_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_security_audit_snapshot() FROM anon;
REVOKE ALL ON FUNCTION public.get_security_audit_snapshot() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_audit_snapshot() TO service_role;

COMMENT ON FUNCTION public.get_security_audit_snapshot() IS
  'Returns a read-only, bounded RLS and policy snapshot for the scheduled security audit.';

COMMIT;
