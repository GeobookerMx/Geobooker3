-- Geobooker CRM global campaign planning.
--
-- Additive and no-send: extends the existing crm.campaigns domain with product,
-- geography, localization and commercial planning. It creates no audience,
-- schedule, outbound job or provider request.

DO $$
BEGIN
  IF to_regclass('crm.workspaces') IS NULL OR to_regclass('crm.campaigns') IS NULL THEN
    RAISE EXCEPTION 'crm_workspace_and_campaign_foundations_required';
  END IF;
END;
$$;

ALTER TABLE crm.campaigns
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_language_code TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS planned_budget NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'crm_campaigns_currency_format_check'
      AND conrelid = 'crm.campaigns'::regclass
  ) THEN
    ALTER TABLE crm.campaigns ADD CONSTRAINT crm_campaigns_currency_format_check
      CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'crm_campaigns_budget_nonnegative_check'
      AND conrelid = 'crm.campaigns'::regclass
  ) THEN
    ALTER TABLE crm.campaigns ADD CONSTRAINT crm_campaigns_budget_nonnegative_check
      CHECK (planned_budget IS NULL OR planned_budget >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'crm_campaigns_date_order_check'
      AND conrelid = 'crm.campaigns'::regclass
  ) THEN
    ALTER TABLE crm.campaigns ADD CONSTRAINT crm_campaigns_date_order_check
      CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS crm_campaigns_id_workspace_uidx
  ON crm.campaigns (id, workspace_id);

CREATE TABLE IF NOT EXISTS crm.product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  product_key TEXT NOT NULL CHECK (product_key ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  display_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  description TEXT,
  supported_channels TEXT[] NOT NULL DEFAULT '{}'::text[] CHECK (
    supported_channels <@ ARRAY['email', 'whatsapp', 'ads', 'landing', 'call', 'meeting']::text[]
  ),
  supported_country_codes TEXT[] NOT NULL DEFAULT '{}'::text[],
  default_currency TEXT CHECK (default_currency IS NULL OR default_currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'archived')),
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, product_key),
  UNIQUE (id, workspace_id),
  CHECK (array_position(supported_country_codes, NULL) IS NULL)
);

CREATE TABLE IF NOT EXISTS crm.campaign_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  campaign_id UUID NOT NULL,
  product_id UUID NOT NULL,
  product_role TEXT NOT NULL DEFAULT 'primary' CHECK (product_role IN ('primary', 'secondary', 'upsell')),
  offer_key TEXT,
  safe_offer_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (campaign_id, workspace_id) REFERENCES crm.campaigns(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id, workspace_id) REFERENCES crm.product_catalog(id, workspace_id) ON DELETE RESTRICT,
  UNIQUE (campaign_id, product_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_campaign_products_primary_uidx
  ON crm.campaign_products (campaign_id)
  WHERE product_role = 'primary';

CREATE TABLE IF NOT EXISTS crm.campaign_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  campaign_id UUID NOT NULL,
  scope_level TEXT NOT NULL CHECK (scope_level IN ('global', 'region', 'country', 'state', 'city', 'postal', 'radius')),
  is_included BOOLEAN NOT NULL DEFAULT TRUE,
  region_code TEXT,
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  state_code TEXT,
  city_name TEXT,
  postal_code TEXT,
  center_latitude NUMERIC(9, 6) CHECK (center_latitude IS NULL OR center_latitude BETWEEN -90 AND 90),
  center_longitude NUMERIC(9, 6) CHECK (center_longitude IS NULL OR center_longitude BETWEEN -180 AND 180),
  radius_km NUMERIC(8, 2) CHECK (radius_km IS NULL OR radius_km > 0),
  language_code TEXT,
  timezone TEXT,
  priority SMALLINT NOT NULL DEFAULT 100 CHECK (priority BETWEEN 1 AND 999),
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (campaign_id, workspace_id) REFERENCES crm.campaigns(id, workspace_id) ON DELETE CASCADE,
  CHECK (scope_level <> 'region' OR region_code IS NOT NULL),
  CHECK (scope_level NOT IN ('country', 'state', 'city', 'postal') OR country_code IS NOT NULL),
  CHECK (scope_level <> 'state' OR state_code IS NOT NULL),
  CHECK (scope_level <> 'city' OR city_name IS NOT NULL),
  CHECK (scope_level <> 'postal' OR postal_code IS NOT NULL),
  CHECK (scope_level <> 'radius' OR (
    center_latitude IS NOT NULL AND center_longitude IS NOT NULL AND radius_km IS NOT NULL
  ))
);

CREATE TABLE IF NOT EXISTS crm.campaign_localizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  campaign_id UUID NOT NULL,
  locale_code TEXT NOT NULL,
  language_code TEXT NOT NULL,
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'ads', 'landing', 'call')),
  whatsapp_template_id UUID REFERENCES crm.whatsapp_templates(id) ON DELETE SET NULL,
  email_template_key TEXT,
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    approval_status IN ('draft', 'internal_review', 'provider_pending', 'approved', 'rejected', 'paused')
  ),
  content_reference JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (campaign_id, workspace_id) REFERENCES crm.campaigns(id, workspace_id) ON DELETE CASCADE,
  UNIQUE (campaign_id, locale_code, channel),
  CHECK (channel <> 'whatsapp' OR whatsapp_template_id IS NOT NULL OR approval_status IN ('draft', 'internal_review')),
  CHECK (approval_status NOT IN ('approved', 'rejected') OR reviewed_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS crm.campaign_commercial_terms (
  campaign_id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE RESTRICT,
  pricing_model TEXT NOT NULL CHECK (
    pricing_model IN ('fixed', 'retainer', 'per_contact', 'per_qualified_lead', 'per_held_meeting', 'revenue_share', 'hybrid')
  ),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  setup_fee NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (setup_fee >= 0),
  recurring_fee NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (recurring_fee >= 0),
  performance_unit TEXT CHECK (
    performance_unit IS NULL OR performance_unit IN ('contact', 'qualified_lead', 'held_meeting', 'won_revenue')
  ),
  performance_unit_fee NUMERIC(14, 2) CHECK (performance_unit_fee IS NULL OR performance_unit_fee >= 0),
  media_budget NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (media_budget >= 0),
  messaging_budget NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (messaging_budget >= 0),
  target_gross_margin_percent NUMERIC(5, 2) CHECK (
    target_gross_margin_percent IS NULL OR target_gross_margin_percent BETWEEN 0 AND 100
  ),
  billing_cadence TEXT NOT NULL DEFAULT 'one_time' CHECK (
    billing_cadence IN ('one_time', 'weekly', 'monthly', 'quarterly', 'milestone')
  ),
  terms_status TEXT NOT NULL DEFAULT 'draft' CHECK (terms_status IN ('draft', 'reviewed', 'contracted', 'closed')),
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (campaign_id, workspace_id) REFERENCES crm.campaigns(id, workspace_id) ON DELETE CASCADE,
  CHECK ((performance_unit IS NULL) = (performance_unit_fee IS NULL))
);

CREATE INDEX IF NOT EXISTS crm_product_catalog_workspace_status_idx
  ON crm.product_catalog (workspace_id, status, product_category);
CREATE INDEX IF NOT EXISTS crm_campaign_targets_geo_idx
  ON crm.campaign_targets (workspace_id, country_code, state_code, city_name, priority);
CREATE INDEX IF NOT EXISTS crm_campaign_localizations_lookup_idx
  ON crm.campaign_localizations (workspace_id, language_code, country_code, channel, approval_status);
CREATE INDEX IF NOT EXISTS crm_campaigns_global_filters_idx
  ON crm.campaigns (workspace_id, status, owner_user_id, starts_at, ends_at);

DO $$
DECLARE
  relation_name TEXT;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'product_catalog', 'campaign_products', 'campaign_targets',
    'campaign_localizations', 'campaign_commercial_terms'
  ] LOOP
    EXECUTE format('ALTER TABLE crm.%I ENABLE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('ALTER TABLE crm.%I FORCE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('REVOKE ALL ON TABLE crm.%I FROM PUBLIC, anon, authenticated', relation_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE crm.%I TO service_role', relation_name);
    EXECUTE format('REVOKE DELETE ON TABLE crm.%I FROM service_role', relation_name);
  END LOOP;
END;
$$;

DO $$
DECLARE
  relation_name TEXT;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'product_catalog', 'campaign_targets', 'campaign_localizations', 'campaign_commercial_terms'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON crm.%I', relation_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON crm.%I FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at()',
      relation_name
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_global_campaign_plan_overview(
  p_workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
)
RETURNS TABLE (
  campaign_id UUID,
  campaign_name TEXT,
  campaign_status TEXT,
  channel TEXT,
  target_count BIGINT,
  country_count BIGINT,
  city_count BIGINT,
  language_count BIGINT,
  product_count BIGINT,
  has_commercial_terms BOOLEAN,
  planned_budget NUMERIC,
  configuration_ready BOOLEAN,
  configuration_reasons JSONB,
  generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
BEGIN
  IF NOT crm.has_workspace_access(p_workspace_id, ARRAY['owner', 'admin', 'manager', 'analyst']) THEN
    RAISE EXCEPTION 'workspace_access_denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH rollup AS (
    SELECT
      c.id,
      c.name,
      c.status,
      c.channel,
      c.planned_budget,
      count(DISTINCT target.id) AS target_count,
      count(DISTINCT target.country_code) FILTER (WHERE target.country_code IS NOT NULL) AS country_count,
      count(DISTINCT concat_ws('|', target.country_code, target.state_code, target.city_name))
        FILTER (WHERE target.city_name IS NOT NULL) AS city_count,
      count(DISTINCT localization.language_code) AS language_count,
      count(DISTINCT product.product_id) AS product_count,
      bool_or(terms.campaign_id IS NOT NULL) AS has_terms
    FROM crm.campaigns c
    LEFT JOIN crm.campaign_targets target ON target.campaign_id = c.id AND target.workspace_id = c.workspace_id
    LEFT JOIN crm.campaign_localizations localization ON localization.campaign_id = c.id AND localization.workspace_id = c.workspace_id
    LEFT JOIN crm.campaign_products product ON product.campaign_id = c.id AND product.workspace_id = c.workspace_id
    LEFT JOIN crm.campaign_commercial_terms terms ON terms.campaign_id = c.id AND terms.workspace_id = c.workspace_id
    WHERE c.workspace_id = p_workspace_id
    GROUP BY c.id, c.name, c.status, c.channel, c.planned_budget
  )
  SELECT
    rollup.id,
    rollup.name,
    rollup.status,
    rollup.channel,
    rollup.target_count,
    rollup.country_count,
    rollup.city_count,
    rollup.language_count,
    rollup.product_count,
    rollup.has_terms,
    rollup.planned_budget,
    rollup.target_count > 0 AND rollup.language_count > 0 AND rollup.product_count > 0,
    to_jsonb(ARRAY_REMOVE(ARRAY[
      CASE WHEN rollup.target_count = 0 THEN 'target_required' END,
      CASE WHEN rollup.language_count = 0 THEN 'localization_required' END,
      CASE WHEN rollup.product_count = 0 THEN 'product_required' END,
      CASE WHEN NOT rollup.has_terms THEN 'commercial_terms_recommended' END
    ], NULL)),
    now()
  FROM rollup
  ORDER BY rollup.name;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_global_campaign_plan_overview(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_global_campaign_plan_overview(UUID) TO authenticated, service_role;

COMMENT ON TABLE crm.product_catalog IS
  'Workspace-scoped configurable Geobooker product catalog; no products are activated by this migration.';
COMMENT ON TABLE crm.campaign_targets IS
  'Hierarchical include/exclude geography and locale planning. It does not select or contact recipients.';
COMMENT ON TABLE crm.campaign_localizations IS
  'Campaign language/channel references; provider approval remains mandatory for WhatsApp templates.';
COMMENT ON TABLE crm.campaign_commercial_terms IS
  'Commercial planning terms with media and messaging budgets separated from Geobooker fees.';
COMMENT ON FUNCTION public.crm_global_campaign_plan_overview(UUID) IS
  'Workspace-authorized aggregate configuration readiness. It sends nothing and returns no contacts.';

