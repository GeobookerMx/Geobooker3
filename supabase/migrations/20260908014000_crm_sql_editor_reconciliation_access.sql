-- Allow trusted direct database administrators to run aggregate reconciliation
-- from Supabase SQL Editor, where no end-user JWT exists.
--
-- PostgREST requests use session_user=authenticator, so this does not grant anon
-- or authenticated API callers any additional access.

CREATE OR REPLACE FUNCTION crm.has_workspace_access(
  p_workspace_id UUID,
  p_allowed_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
  SELECT
    session_user IN ('postgres', 'supabase_admin')
    OR COALESCE(auth.role(), '') = 'service_role'
    OR crm.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM crm.workspace_users wu
      JOIN crm.workspaces w ON w.id = wu.workspace_id
      WHERE wu.workspace_id = p_workspace_id
        AND wu.user_id = auth.uid()
        AND wu.membership_status = 'active'
        AND w.status = 'active'
        AND (p_allowed_roles IS NULL OR wu.workspace_role = ANY (p_allowed_roles))
    );
$$;

CREATE OR REPLACE FUNCTION public.crm_workspace_foundation_status()
RETURNS TABLE (
  internal_workspace_id UUID,
  root_table TEXT,
  total_rows BIGINT,
  internal_rows BIGINT,
  unscoped_rows BIGINT,
  generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  relation_name TEXT;
  internal_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  FOREACH relation_name IN ARRAY ARRAY[
    'accounts', 'contacts', 'import_sources', 'import_batches',
    'whatsapp_business_accounts', 'pipelines', 'campaigns', 'budget_policies'
  ] LOOP
    RETURN QUERY EXECUTE format(
      'SELECT $1, %L::text, count(*)::bigint, '
      || 'count(*) FILTER (WHERE workspace_id = $1)::bigint, '
      || 'count(*) FILTER (WHERE workspace_id IS NULL)::bigint, now() '
      || 'FROM crm.%I',
      relation_name,
      relation_name
    ) USING internal_id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION crm.has_workspace_access(UUID, TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.has_workspace_access(UUID, TEXT[]) TO service_role;
REVOKE ALL ON FUNCTION public.crm_workspace_foundation_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_workspace_foundation_status() TO authenticated, service_role;

COMMENT ON FUNCTION public.crm_workspace_foundation_status() IS
  'Aggregate-only workspace reconciliation for trusted SQL Editor admins, service_role, and authenticated Geobooker admins.';
