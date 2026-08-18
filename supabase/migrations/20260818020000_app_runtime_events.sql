-- Geobooker app runtime telemetry for investor-grade MVP reporting.
-- Tracks first opens and app sessions without storing PII.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_runtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  device_id TEXT NOT NULL,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT,
  native_platform TEXT,
  app_version TEXT,
  app_build TEXT,
  os TEXT,
  device_type TEXT,
  country TEXT,
  country_code TEXT,
  city TEXT,
  language TEXT,
  traffic_source TEXT,
  traffic_medium TEXT,
  traffic_campaign TEXT,
  attribution_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_runtime_events_type_check
    CHECK (event_type IN ('first_open', 'session_start', 'session_resume'))
);

CREATE INDEX IF NOT EXISTS idx_app_runtime_events_created
  ON public.app_runtime_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_runtime_events_type_created
  ON public.app_runtime_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_runtime_events_platform_created
  ON public.app_runtime_events(platform, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_runtime_events_device_created
  ON public.app_runtime_events(device_id, created_at DESC);

ALTER TABLE public.app_runtime_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_runtime_events_public_insert_v1 ON public.app_runtime_events;

CREATE POLICY app_runtime_events_public_insert_v1
  ON public.app_runtime_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('first_open', 'session_start', 'session_resume')
    AND length(device_id) BETWEEN 12 AND 160
  );

DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS app_runtime_events_admin_select_v1 ON public.app_runtime_events';
    EXECUTE $policy$
    CREATE POLICY app_runtime_events_admin_select_v1
      ON public.app_runtime_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.admin_users au
          WHERE au.id = auth.uid()
        )
      )
    $policy$;
  END IF;
END
$$;

GRANT INSERT ON public.app_runtime_events TO anon, authenticated;
GRANT SELECT ON public.app_runtime_events TO authenticated;
GRANT ALL ON public.app_runtime_events TO service_role;

CREATE OR REPLACE VIEW public.admin_app_runtime_funnel_v1
WITH (security_invoker = true) AS
WITH window_30d AS (
  SELECT now() - interval '30 days' AS since
)
SELECT
  COALESCE(platform, native_platform, 'unknown') AS platform,
  COALESCE(app_version, 'unknown') AS app_version,
  COALESCE(app_build, 'unknown') AS app_build,
  COUNT(*) FILTER (WHERE event_type = 'first_open') AS first_opens_30d,
  COUNT(*) FILTER (WHERE event_type = 'session_start') AS session_starts_30d,
  COUNT(*) FILTER (WHERE event_type = 'session_resume') AS session_resumes_30d,
  COUNT(DISTINCT device_id) AS unique_devices_30d,
  MIN(created_at) AS first_seen_at,
  MAX(created_at) AS last_seen_at
FROM public.app_runtime_events, window_30d
WHERE created_at >= window_30d.since
GROUP BY 1, 2, 3
ORDER BY session_starts_30d DESC, first_opens_30d DESC, platform;

GRANT SELECT ON public.admin_app_runtime_funnel_v1 TO authenticated;

COMMENT ON TABLE public.app_runtime_events IS
'Anonymous app runtime events: first open, session start and session resume for web/PWA/iOS/Android MVP traction reporting.';

COMMENT ON VIEW public.admin_app_runtime_funnel_v1 IS
'Admin 30-day app runtime funnel grouped by platform, version and build.';

COMMIT;
