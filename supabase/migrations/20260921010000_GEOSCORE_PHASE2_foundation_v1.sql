-- GEOSCORE_PHASE2: additive Location Intelligence / GeoScore V1 foundation.
--
-- Safety properties:
--   * Does not alter businesses.location or businesses.geog.
--   * Does not enable any product surface; every feature is fail-closed.
--   * Does not import geographic datasets or create outbound integrations.
--   * Browser clients can only read analyses they own; deletion is backend-only.
--   * All writes are backend-only through service_role.
--
-- Apply only after reconciling the remote migration history and taking a
-- database restore point. See docs/GEOSCORE_PHASE2_SCHEMA_RUNBOOK.md.

BEGIN;

-- GeoScore depends on the existing PostGIS installation, but this migration
-- deliberately does not create, move, upgrade or drop the extension.
DO $$
DECLARE
  postgis_schema TEXT;
BEGIN
  SELECT namespace.nspname
    INTO postgis_schema
  FROM pg_extension extension_row
  JOIN pg_namespace namespace
    ON namespace.oid = extension_row.extnamespace
  WHERE extension_row.extname = 'postgis';

  IF postgis_schema IS NULL THEN
    RAISE EXCEPTION
      'GEOSCORE_PHASE2 requires PostGIS. Enable and reconcile PostGIS before applying this migration.';
  END IF;

  RAISE NOTICE 'GEOSCORE_PHASE2 found PostGIS in schema %', postgis_schema;

  IF to_regclass('public.businesses') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'businesses'
        AND column_name = 'location'
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'businesses'
        AND column_name = 'geog'
    ) THEN
      RAISE NOTICE
        'GEOSCORE_PHASE2 detected both businesses.location and businesses.geog; neither column will be changed.';
    END IF;
  END IF;

  -- Dynamic type qualification supports PostGIS installed in public, gis or
  -- extensions without changing the installation.
  EXECUTE format($ddl$
    CREATE TABLE IF NOT EXISTS public.location_analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      business_type_key TEXT NOT NULL,
      business_category_id UUID,
      country_code TEXT NOT NULL DEFAULT 'MX'
        CHECK (country_code ~ '^[A-Z]{2}$'),
      location_kind TEXT NOT NULL DEFAULT 'ANALYSIS_LOCATION'
        CHECK (location_kind IN ('ANALYSIS_LOCATION', 'SPACE_LOCATION', 'BUSINESS_LOCATION')),
      analysis_location %I.geography(Point, 4326) NOT NULL,
      address_label TEXT,
      optional_space_id UUID,
      status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'partial', 'completed', 'failed', 'cancelled')),
      idempotency_key TEXT NOT NULL,
      cache_key TEXT,
      score_model_version TEXT NOT NULL,
      data_snapshot_version TEXT NOT NULL,
      geo_score NUMERIC(5, 2)
        CHECK (geo_score IS NULL OR geo_score BETWEEN 0 AND 100),
      data_confidence_score NUMERIC(5, 2)
        CHECK (data_confidence_score IS NULL OR data_confidence_score BETWEEN 0 AND 100),
      input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(input_snapshot) = 'object'),
      result_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(result_snapshot) = 'object'),
      failure_code TEXT,
      failure_detail TEXT,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (length(trim(business_type_key)) BETWEEN 2 AND 120),
      CHECK (length(trim(idempotency_key)) BETWEEN 8 AND 200),
      CHECK (completed_at IS NULL OR completed_at >= created_at),
      CHECK (
        status NOT IN ('completed', 'partial')
        OR (geo_score IS NOT NULL AND data_confidence_score IS NOT NULL)
      )
    )
  $ddl$, postgis_schema);
END;
$$;

-- Server-controlled feature switches. `enabled` is insufficient by itself:
-- runtime code must require enabled = true AND kill_switch = false.
CREATE TABLE IF NOT EXISTS public.location_intelligence_feature_flags (
  feature_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  kill_switch BOOLEAN NOT NULL DEFAULT TRUE,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(configuration) = 'object'),
  change_reason TEXT NOT NULL DEFAULT 'GEOSCORE_PHASE2 safe default',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (feature_key ~ '^LOCATION_INTELLIGENCE_[A-Z0-9_]+$')
);

CREATE TABLE IF NOT EXISTS public.geo_source_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL,
  dataset_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  dataset_version TEXT NOT NULL,
  source_date DATE,
  ingested_at TIMESTAMPTZ,
  refresh_frequency TEXT,
  license_name TEXT NOT NULL,
  license_reference TEXT NOT NULL,
  commercial_use_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  redistribution_constraints TEXT,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(capabilities) = 'object'),
  quality_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(quality_metadata) = 'object'),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'active', 'paused', 'retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'active' OR commercial_use_allowed),
  UNIQUE (source_key, dataset_key, dataset_version)
);

CREATE TABLE IF NOT EXISTS public.location_score_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_key TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'MX'
    CHECK (country_code ~ '^[A-Z]{2}$'),
  model_version TEXT NOT NULL,
  weights JSONB NOT NULL
    CHECK (jsonb_typeof(weights) = 'object'),
  normalization_config JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(normalization_config) = 'object'),
  minimum_confidence NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (minimum_confidence BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (length(trim(business_type_key)) BETWEEN 2 AND 120),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from),
  CHECK (NOT is_active OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  UNIQUE (business_type_key, country_code, model_version)
);

CREATE TABLE IF NOT EXISTS public.location_analysis_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL
    REFERENCES public.location_analyses(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  radius_meters INTEGER CHECK (radius_meters IS NULL OR radius_meters BETWEEN 1 AND 50000),
  travel_mode TEXT CHECK (travel_mode IS NULL OR travel_mode IN ('WALK', 'DRIVE', 'BICYCLE')),
  value_numeric NUMERIC,
  value_text TEXT,
  value_json JSONB,
  unit TEXT,
  observed_or_estimated TEXT NOT NULL
    CHECK (observed_or_estimated IN ('OBSERVED', 'ESTIMATED', 'MODELLED', 'PROXY', 'NOT_AVAILABLE')),
  confidence_score NUMERIC(5, 2) NOT NULL
    CHECK (confidence_score BETWEEN 0 AND 100),
  contribution_to_score NUMERIC(8, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (length(trim(metric_key)) BETWEEN 2 AND 120),
  CHECK (num_nonnulls(value_numeric, value_text, value_json) <= 1)
);

CREATE TABLE IF NOT EXISTS public.location_analysis_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL
    REFERENCES public.location_analyses(id) ON DELETE CASCADE,
  source_id UUID NOT NULL
    REFERENCES public.geo_source_registry(id) ON DELETE RESTRICT,
  metric_key TEXT,
  method TEXT NOT NULL,
  coverage TEXT,
  confidence_score NUMERIC(5, 2) NOT NULL
    CHECK (confidence_score BETWEEN 0 AND 100),
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(source_snapshot) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- `IF NOT EXISTS` must not silently accept a relation created with an
-- incompatible shape. Fail with a GeoScore-specific error before indexes,
-- triggers, grants or policies are attempted.
DO $$
DECLARE
  missing_columns TEXT;
  incompatible_columns TEXT;
BEGIN
  SELECT string_agg(format('%I.%I', expected.table_name, expected.column_name), ', ')
    INTO missing_columns
  FROM (VALUES
    ('location_intelligence_feature_flags', 'feature_key'),
    ('location_intelligence_feature_flags', 'enabled'),
    ('location_intelligence_feature_flags', 'kill_switch'),
    ('location_intelligence_feature_flags', 'updated_at'),
    ('geo_source_registry', 'id'),
    ('geo_source_registry', 'dataset_version'),
    ('geo_source_registry', 'updated_at'),
    ('location_score_profiles', 'id'),
    ('location_score_profiles', 'business_type_key'),
    ('location_score_profiles', 'country_code'),
    ('location_score_profiles', 'model_version'),
    ('location_score_profiles', 'is_active'),
    ('location_score_profiles', 'updated_at'),
    ('location_analyses', 'id'),
    ('location_analyses', 'owner_user_id'),
    ('location_analyses', 'analysis_location'),
    ('location_analyses', 'idempotency_key'),
    ('location_analyses', 'cache_key'),
    ('location_analyses', 'score_model_version'),
    ('location_analyses', 'data_snapshot_version'),
    ('location_analyses', 'status'),
    ('location_analyses', 'created_at'),
    ('location_analyses', 'updated_at'),
    ('location_analysis_metrics', 'id'),
    ('location_analysis_metrics', 'analysis_id'),
    ('location_analysis_metrics', 'metric_key'),
    ('location_analysis_metrics', 'radius_meters'),
    ('location_analysis_metrics', 'travel_mode'),
    ('location_analysis_sources', 'id'),
    ('location_analysis_sources', 'analysis_id'),
    ('location_analysis_sources', 'source_id'),
    ('location_analysis_sources', 'metric_key')
  ) AS expected(table_name, column_name)
  LEFT JOIN information_schema.columns actual
    ON actual.table_schema = 'public'
   AND actual.table_name = expected.table_name
   AND actual.column_name = expected.column_name
  WHERE actual.column_name IS NULL;

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION
      'GEOSCORE_PHASE2 found incompatible pre-existing tables; required columns are missing: %',
      missing_columns;
  END IF;

  SELECT string_agg(
    format('%I.%I expected %s, found %s',
      expected.table_name,
      expected.column_name,
      expected.expected_udt,
      actual.udt_name
    ),
    '; '
  )
    INTO incompatible_columns
  FROM (VALUES
    ('location_intelligence_feature_flags', 'feature_key', 'text'),
    ('location_intelligence_feature_flags', 'enabled', 'bool'),
    ('location_intelligence_feature_flags', 'kill_switch', 'bool'),
    ('geo_source_registry', 'id', 'uuid'),
    ('location_score_profiles', 'id', 'uuid'),
    ('location_analyses', 'id', 'uuid'),
    ('location_analyses', 'owner_user_id', 'uuid'),
    ('location_analyses', 'analysis_location', 'geography'),
    ('location_analyses', 'idempotency_key', 'text'),
    ('location_analysis_metrics', 'id', 'uuid'),
    ('location_analysis_metrics', 'analysis_id', 'uuid'),
    ('location_analysis_sources', 'id', 'uuid'),
    ('location_analysis_sources', 'analysis_id', 'uuid')
  ) AS expected(table_name, column_name, expected_udt)
  JOIN information_schema.columns actual
    ON actual.table_schema = 'public'
   AND actual.table_name = expected.table_name
   AND actual.column_name = expected.column_name
  WHERE actual.udt_name <> expected.expected_udt;

  IF incompatible_columns IS NOT NULL THEN
    RAISE EXCEPTION
      'GEOSCORE_PHASE2 found incompatible pre-existing column types: %',
      incompatible_columns;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS location_analyses_owner_idempotency_uidx
  ON public.location_analyses(owner_user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS location_analyses_owner_created_idx
  ON public.location_analyses(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS location_analyses_status_created_idx
  ON public.location_analyses(status, created_at);
CREATE INDEX IF NOT EXISTS location_analyses_cache_idx
  ON public.location_analyses(cache_key, score_model_version, data_snapshot_version)
  WHERE cache_key IS NOT NULL AND status IN ('partial', 'completed');
CREATE INDEX IF NOT EXISTS location_analyses_location_gist
  ON public.location_analyses USING GIST (analysis_location);
CREATE INDEX IF NOT EXISTS location_metrics_analysis_idx
  ON public.location_analysis_metrics(analysis_id, metric_key);
CREATE UNIQUE INDEX IF NOT EXISTS location_metrics_identity_uidx
  ON public.location_analysis_metrics(
    analysis_id,
    metric_key,
    COALESCE(radius_meters, -1),
    COALESCE(travel_mode, '')
  );
CREATE INDEX IF NOT EXISTS location_sources_analysis_idx
  ON public.location_analysis_sources(analysis_id);
CREATE UNIQUE INDEX IF NOT EXISTS location_sources_identity_uidx
  ON public.location_analysis_sources(
    analysis_id,
    source_id,
    COALESCE(metric_key, '')
  );
CREATE UNIQUE INDEX IF NOT EXISTS location_score_profiles_one_active_uidx
  ON public.location_score_profiles(business_type_key, country_code)
  WHERE is_active;

CREATE OR REPLACE FUNCTION public.geoscore_phase2_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS geoscore_phase2_feature_flags_updated_at
  ON public.location_intelligence_feature_flags;
CREATE TRIGGER geoscore_phase2_feature_flags_updated_at
  BEFORE UPDATE ON public.location_intelligence_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.geoscore_phase2_set_updated_at();

DROP TRIGGER IF EXISTS geoscore_phase2_sources_updated_at
  ON public.geo_source_registry;
CREATE TRIGGER geoscore_phase2_sources_updated_at
  BEFORE UPDATE ON public.geo_source_registry
  FOR EACH ROW EXECUTE FUNCTION public.geoscore_phase2_set_updated_at();

DROP TRIGGER IF EXISTS geoscore_phase2_profiles_updated_at
  ON public.location_score_profiles;
CREATE TRIGGER geoscore_phase2_profiles_updated_at
  BEFORE UPDATE ON public.location_score_profiles
  FOR EACH ROW EXECUTE FUNCTION public.geoscore_phase2_set_updated_at();

DROP TRIGGER IF EXISTS geoscore_phase2_analyses_updated_at
  ON public.location_analyses;
CREATE TRIGGER geoscore_phase2_analyses_updated_at
  BEFORE UPDATE ON public.location_analyses
  FOR EACH ROW EXECUTE FUNCTION public.geoscore_phase2_set_updated_at();

ALTER TABLE public.location_intelligence_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_source_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_score_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_analysis_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_analysis_sources ENABLE ROW LEVEL SECURITY;

-- Reset any historical/default privileges before granting the narrow owner API.
REVOKE ALL ON TABLE
  public.location_intelligence_feature_flags,
  public.geo_source_registry,
  public.location_score_profiles,
  public.location_analyses,
  public.location_analysis_metrics,
  public.location_analysis_sources
FROM PUBLIC, anon, authenticated;

-- Configuration, sources, profiles and all writes remain backend-only.
GRANT ALL ON TABLE
  public.location_intelligence_feature_flags,
  public.geo_source_registry,
  public.location_score_profiles,
  public.location_analyses,
  public.location_analysis_metrics,
  public.location_analysis_sources
TO service_role;

-- Authenticated users can read only their own data. Deletion is backend-only
-- so retention, revocation and privacy requests can be audited atomically.
GRANT SELECT ON public.location_analyses TO authenticated;
GRANT SELECT ON public.location_analysis_metrics TO authenticated;
GRANT SELECT ON public.location_analysis_sources TO authenticated;

DROP POLICY IF EXISTS location_analyses_owner_select_v1
  ON public.location_analyses;
CREATE POLICY location_analyses_owner_select_v1
  ON public.location_analyses
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS location_analyses_owner_delete_v1
  ON public.location_analyses;

DROP POLICY IF EXISTS location_metrics_owner_select_v1
  ON public.location_analysis_metrics;
CREATE POLICY location_metrics_owner_select_v1
  ON public.location_analysis_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.location_analyses analysis
      WHERE analysis.id = location_analysis_metrics.analysis_id
        AND analysis.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS location_sources_owner_select_v1
  ON public.location_analysis_sources;
CREATE POLICY location_sources_owner_select_v1
  ON public.location_analysis_sources
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.location_analyses analysis
      WHERE analysis.id = location_analysis_sources.analysis_id
        AND analysis.owner_user_id = auth.uid()
    )
  );

INSERT INTO public.location_intelligence_feature_flags (
  feature_key,
  enabled,
  kill_switch,
  configuration,
  change_reason
)
SELECT
  feature_key,
  FALSE,
  TRUE,
  '{}'::jsonb,
  'GEOSCORE_PHASE2 foundation: disabled pending data, privacy, security and QA gates'
FROM unnest(ARRAY[
  'LOCATION_INTELLIGENCE_ENABLED',
  'LOCATION_INTELLIGENCE_MX_ENABLED',
  'LOCATION_INTELLIGENCE_COMPARISON_ENABLED',
  'LOCATION_INTELLIGENCE_PDF_ENABLED',
  'LOCATION_INTELLIGENCE_SHARE_ENABLED',
  'LOCATION_INTELLIGENCE_FIRST_PARTY_SIGNALS_ENABLED',
  'LOCATION_INTELLIGENCE_TRAFFIC_ENABLED'
]) AS feature_key
ON CONFLICT (feature_key) DO NOTHING;

COMMENT ON TABLE public.location_intelligence_feature_flags IS
  'Server-controlled GeoScore flags. Runtime must require enabled=true and kill_switch=false.';
COMMENT ON TABLE public.geo_source_registry IS
  'Versioned source, license, capability and quality registry; no secrets or raw provider credentials.';
COMMENT ON TABLE public.location_score_profiles IS
  'Versioned deterministic score profiles. Activation requires explicit approval metadata.';
COMMENT ON TABLE public.location_analyses IS
  'Immutable-version GeoScore analysis envelope. analysis_location is a business/site pin, never implicitly the user current location.';
COMMENT ON COLUMN public.location_analyses.analysis_location IS
  'Purpose-bound analysis point. Do not populate from device GPS unless the user explicitly chooses Use my location.';
COMMENT ON TABLE public.location_analysis_metrics IS
  'Structured auditable metrics; at most one scalar/text/JSON value per row.';
COMMENT ON TABLE public.location_analysis_sources IS
  'Per-analysis data provenance linked to an approved, versioned source registry entry.';

-- Migration-time privilege assertions. RLS alone is not treated as the grant boundary.
DO $$
DECLARE
  backend_table TEXT;
BEGIN
  FOREACH backend_table IN ARRAY ARRAY[
    'location_intelligence_feature_flags',
    'geo_source_registry',
    'location_score_profiles'
  ]
  LOOP
    IF has_table_privilege('anon', format('public.%I', backend_table), 'SELECT,INSERT,UPDATE,DELETE')
       OR has_table_privilege('authenticated', format('public.%I', backend_table), 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'GEOSCORE_PHASE2 backend-only table public.% has browser privileges', backend_table;
    END IF;
  END LOOP;

  IF has_table_privilege('anon', 'public.location_analyses', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('authenticated', 'public.location_analyses', 'INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'GEOSCORE_PHASE2 analysis write boundary is not fail-closed';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.location_analyses', 'SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'GEOSCORE_PHASE2 service_role lacks required analysis privileges';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
