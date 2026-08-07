-- Controlled, city-first rollout metadata. This migration does not import businesses.

BEGIN;

CREATE TABLE IF NOT EXISTS public.international_markets (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  country_name TEXT NOT NULL,
  city_name TEXT NOT NULL,
  default_language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL,
  wave SMALLINT NOT NULL DEFAULT 1 CHECK (wave BETWEEN 1 AND 20),
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate', 'planned', 'extracting', 'qa', 'preview', 'active', 'paused', 'retired')),
  rollout_stage SMALLINT NOT NULL DEFAULT 0 CHECK (rollout_stage BETWEEN 0 AND 4),
  target_records INTEGER NOT NULL DEFAULT 1000
    CHECK (target_records IN (1000, 3000, 5000, 10000)),
  imported_records INTEGER NOT NULL DEFAULT 0 CHECK (imported_records >= 0),
  visible_records INTEGER NOT NULL DEFAULT 0 CHECK (visible_records >= 0),
  source_type TEXT NOT NULL DEFAULT 'overture_places',
  source_release TEXT,
  extraction_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sample_size INTEGER NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
  location_accuracy_percent NUMERIC(5,2)
    CHECK (location_accuracy_percent BETWEEN 0 AND 100),
  visible_duplicate_percent NUMERIC(5,2)
    CHECK (visible_duplicate_percent BETWEEN 0 AND 100),
  invalid_coordinate_percent NUMERIC(5,2)
    CHECK (invalid_coordinate_percent BETWEEN 0 AND 100),
  searches_30d INTEGER NOT NULL DEFAULT 0 CHECK (searches_30d >= 0),
  zero_result_searches_30d INTEGER NOT NULL DEFAULT 0 CHECK (zero_result_searches_30d >= 0),
  result_clicks_30d INTEGER NOT NULL DEFAULT 0 CHECK (result_clicks_30d >= 0),
  demand_score NUMERIC(5,2) CHECK (demand_score BETWEEN 0 AND 100),
  quality_approved_at TIMESTAMPTZ,
  quality_approved_by UUID REFERENCES auth.users(id),
  activated_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, city_name),
  CHECK (visible_records <= imported_records),
  CHECK (imported_records <= 10000)
);

CREATE TABLE IF NOT EXISTS public.international_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL REFERENCES public.international_markets(id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL DEFAULT 'overture_places',
  source_release TEXT NOT NULL,
  target_records INTEGER NOT NULL CHECK (target_records IN (1000, 3000, 5000, 10000)),
  extracted_records INTEGER NOT NULL DEFAULT 0 CHECK (extracted_records >= 0),
  eligible_records INTEGER NOT NULL DEFAULT 0 CHECK (eligible_records >= 0),
  imported_records INTEGER NOT NULL DEFAULT 0 CHECK (imported_records >= 0),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'extracting', 'extracted', 'validated', 'applied', 'failed', 'rolled_back')),
  checksum_sha256 TEXT,
  quality_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  migration_name TEXT,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (imported_records <= eligible_records),
  CHECK (eligible_records <= extracted_records OR extracted_records = 0)
);

CREATE INDEX IF NOT EXISTS idx_international_markets_status_wave
  ON public.international_markets(status, wave);
CREATE INDEX IF NOT EXISTS idx_international_markets_country
  ON public.international_markets(country_code, city_name);
CREATE INDEX IF NOT EXISTS idx_international_batches_market_created
  ON public.international_import_batches(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_international_batches_status
  ON public.international_import_batches(status);

CREATE OR REPLACE FUNCTION public.set_international_rollout_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_international_markets_updated_at
  ON public.international_markets;
CREATE TRIGGER trg_international_markets_updated_at
  BEFORE UPDATE ON public.international_markets
  FOR EACH ROW EXECUTE FUNCTION public.set_international_rollout_updated_at();

DROP TRIGGER IF EXISTS trg_international_import_batches_updated_at
  ON public.international_import_batches;
CREATE TRIGGER trg_international_import_batches_updated_at
  BEFORE UPDATE ON public.international_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_international_rollout_updated_at();

ALTER TABLE public.international_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS international_markets_public_active_v1
  ON public.international_markets;
CREATE POLICY international_markets_public_active_v1
  ON public.international_markets
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS international_markets_admin_all_v1 ON public.international_markets';
    EXECUTE $policy$
      CREATE POLICY international_markets_admin_all_v1
      ON public.international_markets
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS international_batches_admin_all_v1 ON public.international_import_batches';
    EXECUTE $policy$
      CREATE POLICY international_batches_admin_all_v1
      ON public.international_import_batches
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
    $policy$;
  END IF;
END $$;

GRANT SELECT ON public.international_markets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.international_import_batches TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.international_markets TO authenticated;
GRANT ALL ON public.international_markets TO service_role;
GRANT ALL ON public.international_import_batches TO service_role;

INSERT INTO public.international_markets (
  id, country_code, country_name, city_name, default_language, timezone,
  wave, status, rollout_stage, target_records, source_release, extraction_enabled
) VALUES
  ('us-los-angeles', 'US', 'United States', 'Los Angeles', 'en', 'America/Los_Angeles', 1, 'preview', 1, 3000, '2026-06-17.0', TRUE),
  ('ca-toronto', 'CA', 'Canada', 'Toronto', 'en', 'America/Toronto', 1, 'preview', 1, 3000, '2026-06-17.0', TRUE),
  ('es-madrid', 'ES', 'Spain', 'Madrid', 'es', 'Europe/Madrid', 1, 'preview', 1, 3000, '2026-06-17.0', TRUE),
  ('us-miami', 'US', 'United States', 'Miami', 'en', 'America/New_York', 2, 'candidate', 0, 1000, NULL, FALSE),
  ('us-houston', 'US', 'United States', 'Houston', 'en', 'America/Chicago', 2, 'candidate', 0, 1000, NULL, FALSE),
  ('ca-vancouver', 'CA', 'Canada', 'Vancouver', 'en', 'America/Vancouver', 2, 'candidate', 0, 1000, NULL, FALSE),
  ('es-barcelona', 'ES', 'Spain', 'Barcelona', 'es', 'Europe/Madrid', 2, 'candidate', 0, 1000, NULL, FALSE),
  ('gb-london', 'GB', 'United Kingdom', 'London', 'en', 'Europe/London', 3, 'candidate', 0, 1000, NULL, FALSE),
  ('co-bogota', 'CO', 'Colombia', 'Bogota', 'es', 'America/Bogota', 3, 'candidate', 0, 1000, NULL, FALSE),
  ('ar-buenos-aires', 'AR', 'Argentina', 'Buenos Aires', 'es', 'America/Argentina/Buenos_Aires', 3, 'candidate', 0, 1000, NULL, FALSE),
  ('cl-santiago', 'CL', 'Chile', 'Santiago', 'es', 'America/Santiago', 3, 'candidate', 0, 1000, NULL, FALSE),
  ('pe-lima', 'PE', 'Peru', 'Lima', 'es', 'America/Lima', 3, 'candidate', 0, 1000, NULL, FALSE)
ON CONFLICT (id) DO UPDATE SET
  country_code = EXCLUDED.country_code,
  country_name = EXCLUDED.country_name,
  city_name = EXCLUDED.city_name,
  default_language = EXCLUDED.default_language,
  timezone = EXCLUDED.timezone,
  wave = EXCLUDED.wave,
  target_records = EXCLUDED.target_records,
  updated_at = NOW();

UPDATE public.international_markets AS market
SET
  imported_records = counts.imported_records,
  visible_records = counts.visible_records,
  updated_at = NOW()
FROM (
  SELECT
    country_code,
    city,
    COUNT(*)::INTEGER AS imported_records,
    COUNT(*) FILTER (WHERE is_visible)::INTEGER AS visible_records
  FROM public.international_businesses
  GROUP BY country_code, city
) AS counts
WHERE market.country_code = counts.country_code
  AND LOWER(market.city_name) = LOWER(counts.city);

COMMIT;
