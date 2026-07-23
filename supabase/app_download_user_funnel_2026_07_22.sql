-- ============================================================================
-- Geobooker App Downloads + User Login Funnel
-- Fecha: 2026-07-22
-- Objetivo:
-- 1) Medir clics reales hacia Google Play, App Store o hub PWA.
-- 2) Cruzar descargas/intencion con registros y logins por plataforma.
-- 3) Mantener datos privados: insercion anonima controlada, lectura admin.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL DEFAULT 'download_intent',
  target TEXT NOT NULL DEFAULT 'hub', -- hub, android_store, ios_store
  platform_hint TEXT,
  source TEXT,
  campaign TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  country TEXT,
  country_code TEXT,
  city TEXT,
  platform TEXT,
  app_version TEXT,
  os TEXT,
  device_type TEXT,
  traffic_source TEXT,
  traffic_medium TEXT,
  traffic_campaign TEXT,
  language TEXT,
  attribution_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_download_events_created
  ON public.app_download_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_download_events_target_created
  ON public.app_download_events(target, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_download_events_platform_created
  ON public.app_download_events(platform, created_at DESC);

ALTER TABLE public.app_download_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_download_events_public_insert_v1 ON public.app_download_events;
DROP POLICY IF EXISTS app_download_events_admin_select_v1 ON public.app_download_events;

CREATE POLICY app_download_events_public_insert_v1
  ON public.app_download_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('download_intent', 'qr_scan', 'store_click')
    AND target IN ('hub', 'android_store', 'ios_store', 'pwa_install')
  );

CREATE POLICY app_download_events_admin_select_v1
  ON public.app_download_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

GRANT INSERT ON public.app_download_events TO anon, authenticated;
GRANT SELECT ON public.app_download_events TO authenticated;
GRANT ALL ON public.app_download_events TO service_role;

-- Vista de embudo 30 dias: no sustituye Google Play/App Store Connect,
-- pero si muestra la intencion interna y los usuarios que realmente entran.
CREATE OR REPLACE VIEW public.admin_app_user_funnel_v1
WITH (security_invoker = true) AS
WITH window_30d AS (
  SELECT now() - interval '30 days' AS since
),
downloads AS (
  SELECT
    COALESCE(platform_hint, platform, target, 'unknown') AS platform,
    COUNT(*) AS download_clicks_30d,
    COUNT(*) FILTER (WHERE target = 'android_store') AS google_play_clicks_30d,
    COUNT(*) FILTER (WHERE target = 'ios_store') AS app_store_clicks_30d,
    COUNT(*) FILTER (WHERE target = 'hub') AS download_hub_clicks_30d
  FROM public.app_download_events, window_30d
  WHERE created_at >= window_30d.since
  GROUP BY 1
),
page_sessions AS (
  SELECT
    COALESCE(platform, device_type, 'unknown') AS platform,
    COUNT(DISTINCT session_id) AS app_or_web_sessions_30d
  FROM public.page_analytics, window_30d
  WHERE created_at >= window_30d.since
  GROUP BY 1
),
signups AS (
  SELECT
    COALESCE(registration_platform, 'unknown') AS platform,
    COUNT(*) AS profile_signups_30d
  FROM public.user_profiles, window_30d
  WHERE created_at >= window_30d.since
  GROUP BY 1
),
sessions AS (
  SELECT
    COALESCE(platform, 'unknown') AS platform,
    COUNT(*) FILTER (WHERE session_type LIKE 'signup_%') AS tracked_signups_30d,
    COUNT(*) FILTER (WHERE session_type LIKE 'login_%') AS tracked_logins_30d
  FROM public.user_sessions, window_30d
  WHERE created_at >= window_30d.since
  GROUP BY 1
)
SELECT
  COALESCE(d.platform, ps.platform, s.platform, us.platform, 'unknown') AS platform,
  COALESCE(d.download_clicks_30d, 0) AS download_clicks_30d,
  COALESCE(d.google_play_clicks_30d, 0) AS google_play_clicks_30d,
  COALESCE(d.app_store_clicks_30d, 0) AS app_store_clicks_30d,
  COALESCE(d.download_hub_clicks_30d, 0) AS download_hub_clicks_30d,
  COALESCE(ps.app_or_web_sessions_30d, 0) AS app_or_web_sessions_30d,
  COALESCE(s.profile_signups_30d, 0) AS profile_signups_30d,
  COALESCE(us.tracked_signups_30d, 0) AS tracked_signups_30d,
  COALESCE(us.tracked_logins_30d, 0) AS tracked_logins_30d,
  CASE
    WHEN COALESCE(d.download_clicks_30d, 0) = 0 THEN 0
    ELSE ROUND((COALESCE(s.profile_signups_30d, 0)::numeric / d.download_clicks_30d::numeric) * 100, 2)
  END AS signup_rate_from_download_clicks
FROM downloads d
FULL OUTER JOIN page_sessions ps ON ps.platform = d.platform
FULL OUTER JOIN signups s ON s.platform = COALESCE(d.platform, ps.platform)
FULL OUTER JOIN sessions us ON us.platform = COALESCE(d.platform, ps.platform, s.platform)
ORDER BY download_clicks_30d DESC, app_or_web_sessions_30d DESC, platform;

COMMENT ON TABLE public.app_download_events IS
'Eventos internos de intencion de descarga de Geobooker: QR, hub, Google Play, App Store y PWA.';

COMMENT ON VIEW public.admin_app_user_funnel_v1 IS
'Embudo admin de descargas/clics, sesiones, registros y logins por plataforma en los ultimos 30 dias.';

COMMIT;

-- Verificacion:
-- SELECT * FROM public.admin_app_user_funnel_v1;
-- SELECT target, platform_hint, count(*) FROM public.app_download_events GROUP BY target, platform_hint ORDER BY count(*) DESC;
