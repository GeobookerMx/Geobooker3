-- CRM 2.0 sales operations foundation (additive and inactive).
-- Creates no pipeline seed, opportunity, task, score or outbound action.

CREATE TABLE IF NOT EXISTS crm.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  default_currency TEXT CHECK (default_currency IS NULL OR default_currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'archived')),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES crm.pipelines(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  stage_type TEXT NOT NULL DEFAULT 'open' CHECK (stage_type IN ('open', 'won', 'lost')),
  default_probability SMALLINT NOT NULL DEFAULT 0 CHECK (default_probability BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, stage_key),
  UNIQUE (pipeline_id, position),
  UNIQUE (id, pipeline_id)
);

CREATE TABLE IF NOT EXISTS crm.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES crm.accounts(id) ON DELETE RESTRICT,
  primary_contact_id UUID REFERENCES crm.contacts(id) ON DELETE SET NULL,
  pipeline_id UUID NOT NULL REFERENCES crm.pipelines(id) ON DELETE RESTRICT,
  stage_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14, 2) CHECK (amount IS NULL OR amount >= 0),
  currency TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  probability SMALLINT CHECK (probability IS NULL OR probability BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'cancelled')),
  loss_reason TEXT,
  source_key TEXT,
  attribution_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  assigned_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, pipeline_id),
  FOREIGN KEY (stage_id, pipeline_id) REFERENCES crm.pipeline_stages(id, pipeline_id) ON DELETE RESTRICT,
  CHECK ((status IN ('won', 'lost', 'cancelled') AND closed_at IS NOT NULL) OR (status = 'open' AND closed_at IS NULL)),
  CHECK (status <> 'lost' OR loss_reason IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS crm.opportunity_contacts (
  opportunity_id UUID NOT NULL REFERENCES crm.opportunities(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm.contacts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'stakeholder' CHECK (
    role IN ('decision_maker', 'influencer', 'champion', 'procurement', 'finance', 'technical', 'stakeholder')
  ),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, contact_id, role)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_opportunity_contacts_primary_uidx
  ON crm.opportunity_contacts (opportunity_id)
  WHERE is_primary;

CREATE TABLE IF NOT EXISTS crm.opportunity_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES crm.opportunities(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES crm.pipelines(id) ON DELETE RESTRICT,
  from_stage_id UUID,
  to_stage_id UUID NOT NULL,
  changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (opportunity_id, pipeline_id) REFERENCES crm.opportunities(id, pipeline_id) ON DELETE CASCADE,
  FOREIGN KEY (from_stage_id, pipeline_id) REFERENCES crm.pipeline_stages(id, pipeline_id) ON DELETE RESTRICT,
  FOREIGN KEY (to_stage_id, pipeline_id) REFERENCES crm.pipeline_stages(id, pipeline_id) ON DELETE RESTRICT,
  CHECK (from_stage_id IS NULL OR from_stage_id <> to_stage_id)
);

CREATE TABLE IF NOT EXISTS crm.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES crm.accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm.contacts(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES crm.opportunities(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('call', 'email', 'whatsapp', 'meeting', 'research', 'follow_up', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(account_id, contact_id, opportunity_id) > 0),
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status <> 'completed')
);

CREATE TABLE IF NOT EXISTS crm.score_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account', 'contact', 'opportunity')),
  display_name TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (model_key, version),
  CHECK (NOT is_active OR activated_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_score_models_active_uidx
  ON crm.score_models (model_key)
  WHERE is_active;

CREATE TABLE IF NOT EXISTS crm.score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_model_id UUID NOT NULL REFERENCES crm.score_models(id) ON DELETE RESTRICT,
  account_id UUID REFERENCES crm.accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm.contacts(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES crm.opportunities(id) ON DELETE CASCADE,
  score NUMERIC(5, 2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL CHECK (source IN ('imported', 'rule_engine', 'manual')),
  computed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(account_id, contact_id, opportunity_id) = 1)
);

CREATE TABLE IF NOT EXISTS crm.attribution_touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES crm.accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm.contacts(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES crm.opportunities(id) ON DELETE CASCADE,
  touch_type TEXT NOT NULL CHECK (touch_type IN ('first_touch', 'last_touch', 'conversion', 'manual')),
  source TEXT,
  medium TEXT,
  campaign TEXT,
  content TEXT,
  term TEXT,
  channel_group TEXT,
  landing_path TEXT,
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  language_code TEXT,
  external_event_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(account_id, contact_id, opportunity_id) > 0)
);

ALTER TABLE crm.activities ADD COLUMN IF NOT EXISTS opportunity_id UUID
  REFERENCES crm.opportunities(id) ON DELETE SET NULL;
ALTER TABLE crm.activities ADD COLUMN IF NOT EXISTS task_id UUID
  REFERENCES crm.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS crm_opportunities_pipeline_idx
  ON crm.opportunities (pipeline_id, stage_id, status, expected_close_date);
CREATE INDEX IF NOT EXISTS crm_opportunities_owner_idx
  ON crm.opportunities (assigned_owner_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS crm_stage_history_timeline_idx
  ON crm.opportunity_stage_history (opportunity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS crm_tasks_owner_due_idx
  ON crm.tasks (assigned_to_user_id, status, due_at);
CREATE INDEX IF NOT EXISTS crm_tasks_account_idx
  ON crm.tasks (account_id, status, due_at);
CREATE INDEX IF NOT EXISTS crm_score_snapshots_account_idx
  ON crm.score_snapshots (account_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS crm_score_snapshots_contact_idx
  ON crm.score_snapshots (contact_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS crm_attribution_account_idx
  ON crm.attribution_touches (account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS crm_attribution_campaign_idx
  ON crm.attribution_touches (campaign, country_code, occurred_at DESC);
CREATE INDEX IF NOT EXISTS crm_activities_opportunity_idx
  ON crm.activities (opportunity_id, occurred_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pipelines', 'pipeline_stages', 'opportunities', 'opportunity_contacts',
    'opportunity_stage_history', 'tasks', 'score_models', 'score_snapshots',
    'attribution_touches'
  ] LOOP
    EXECUTE format('ALTER TABLE crm.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE crm.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE crm.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE crm.%I TO service_role', table_name);
    EXECUTE format('GRANT SELECT ON TABLE crm.%I TO authenticated', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON crm.%I FOR SELECT TO authenticated USING (crm.is_admin(auth.uid()))',
      table_name || '_admin_read', table_name
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['pipelines', 'pipeline_stages', 'opportunities', 'tasks'] LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON crm.%I FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at()',
      table_name
    );
  END LOOP;
END;
$$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA crm TO service_role;

COMMENT ON TABLE crm.opportunities IS 'CRM opportunities; no automatic creation from imported contacts.';
COMMENT ON TABLE crm.score_models IS 'Versioned scoring rules; inactive until explicitly approved.';
COMMENT ON TABLE crm.attribution_touches IS 'CRM attribution without client secrets or GA4 personal data.';

CREATE OR REPLACE FUNCTION public.crm_sales_overview()
RETURNS TABLE (
  active_accounts BIGINT,
  active_contacts BIGINT,
  open_opportunities BIGINT,
  won_opportunities BIGINT,
  unassigned_opportunities BIGINT,
  overdue_tasks BIGINT,
  tasks_due_next_7_days BIGINT,
  generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
BEGIN
  IF NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT
    (SELECT count(*) FROM crm.accounts WHERE account_status = 'active'),
    (SELECT count(*) FROM crm.contacts WHERE contact_status = 'active'),
    (SELECT count(*) FROM crm.opportunities WHERE status = 'open'),
    (SELECT count(*) FROM crm.opportunities WHERE status = 'won'),
    (SELECT count(*) FROM crm.opportunities WHERE status = 'open' AND assigned_owner_id IS NULL),
    (SELECT count(*) FROM crm.tasks WHERE status IN ('pending', 'in_progress') AND due_at < now()),
    (SELECT count(*) FROM crm.tasks
      WHERE status IN ('pending', 'in_progress') AND due_at >= now() AND due_at < now() + interval '7 days'),
    now();
END;
$$;

REVOKE ALL ON FUNCTION public.crm_sales_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_sales_overview() TO authenticated, service_role;
