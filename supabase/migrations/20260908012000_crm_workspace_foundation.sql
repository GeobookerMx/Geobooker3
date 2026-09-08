-- Geobooker CRM workspace/tenant foundation.
--
-- Additive transition only. Existing CRM root records are assigned to the
-- reserved Geobooker internal workspace so current B2B consumers continue to
-- work. Client tenant access is NOT enabled by this migration.

CREATE TABLE IF NOT EXISTS crm.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_key TEXT NOT NULL UNIQUE CHECK (workspace_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  display_name TEXT NOT NULL,
  workspace_type TEXT NOT NULL CHECK (workspace_type IN ('internal_b2b', 'client_leads')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'suspended', 'archived')),
  default_country_code TEXT CHECK (default_country_code IS NULL OR default_country_code ~ '^[A-Z]{2}$'),
  default_currency TEXT CHECK (default_currency IS NULL OR default_currency ~ '^[A-Z]{3}$'),
  default_language_code TEXT,
  default_timezone TEXT,
  plan_key TEXT,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.workspace_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_role TEXT NOT NULL CHECK (
    workspace_role IN ('owner', 'admin', 'manager', 'agent', 'analyst', 'viewer')
  ),
  membership_status TEXT NOT NULL DEFAULT 'invited' CHECK (
    membership_status IN ('invited', 'active', 'suspended', 'revoked')
  ),
  invited_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id),
  CHECK (membership_status <> 'active' OR accepted_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS crm.workspace_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  access_type TEXT NOT NULL CHECK (
    access_type IN ('member_access', 'platform_admin', 'support_access', 'export', 'configuration_change')
  ),
  action TEXT NOT NULL,
  reason TEXT,
  request_id TEXT,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_workspace_users_user_idx
  ON crm.workspace_users (user_id, membership_status, workspace_id);
CREATE INDEX IF NOT EXISTS crm_workspace_access_audit_timeline_idx
  ON crm.workspace_access_audit (workspace_id, occurred_at DESC);

ALTER TABLE crm.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.workspace_users FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.workspace_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.workspace_access_audit FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE crm.workspaces FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE crm.workspace_users FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE crm.workspace_access_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.workspaces TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.workspace_users TO service_role;
GRANT SELECT, INSERT ON TABLE crm.workspace_access_audit TO service_role;
REVOKE DELETE ON TABLE crm.workspaces FROM service_role;
REVOKE DELETE ON TABLE crm.workspace_users FROM service_role;
REVOKE UPDATE, DELETE ON TABLE crm.workspace_access_audit FROM service_role;

DROP TRIGGER IF EXISTS set_updated_at ON crm.workspaces;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.workspaces
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON crm.workspace_users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.workspace_users
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

INSERT INTO crm.workspaces (
  id,
  workspace_key,
  display_name,
  workspace_type,
  status,
  default_country_code,
  default_currency,
  default_language_code,
  default_timezone,
  source_metadata
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'geobooker_internal',
  'Geobooker B2B',
  'internal_b2b',
  'active',
  'MX',
  'MXN',
  'es-MX',
  'America/Mexico_City',
  '{"reserved":true,"client_portal_enabled":false}'::jsonb
)
ON CONFLICT (workspace_key) DO NOTHING;

DO $$
DECLARE
  relation_name TEXT;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'accounts',
    'contacts',
    'import_sources',
    'import_batches',
    'whatsapp_business_accounts',
    'pipelines',
    'campaigns',
    'budget_policies'
  ] LOOP
    IF to_regclass(format('crm.%I', relation_name)) IS NULL THEN
      RAISE EXCEPTION 'Required CRM root table is missing: crm.%', relation_name;
    END IF;

    EXECUTE format(
      'ALTER TABLE crm.%I ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES crm.workspaces(id) ON DELETE RESTRICT',
      relation_name
    );
    EXECUTE format(
      'UPDATE crm.%I SET workspace_id = $1 WHERE workspace_id IS NULL',
      relation_name
    ) USING '00000000-0000-0000-0000-000000000001'::uuid;
    EXECUTE format(
      'ALTER TABLE crm.%I ALTER COLUMN workspace_id SET DEFAULT %L::uuid',
      relation_name,
      '00000000-0000-0000-0000-000000000001'
    );
    EXECUTE format(
      'ALTER TABLE crm.%I ALTER COLUMN workspace_id SET NOT NULL',
      relation_name
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON crm.%I (workspace_id)',
      'crm_' || relation_name || '_workspace_idx',
      relation_name
    );
  END LOOP;
END;
$$;

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
    COALESCE(auth.role(), '') = 'service_role'
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
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
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

COMMENT ON TABLE crm.workspaces IS
  'Tenant boundary for internal B2B and future client Leads workspaces. Client portal access remains disabled.';
COMMENT ON TABLE crm.workspace_access_audit IS
  'Append-only audit for tenant and cross-tenant access. No payload secrets are permitted.';
COMMENT ON FUNCTION public.crm_workspace_foundation_status() IS
  'Admin-only reconciliation of CRM root workspace backfill; returns counts only.';
