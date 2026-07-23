-- ============================================================================
-- Geobooker Growth + Enterprise Lead Tracking
-- Fecha: 2026-07-22
-- Objetivo:
-- 1) Medir descargas/aperturas vs registros/login por plataforma.
-- 2) Guardar metadata de leads Enterprise sin romper el flujo actual.
-- 3) Crear una vista simple para auditoria del embudo de usuarios.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Perfil de usuario: origen, plataforma y ultimos accesos
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS registration_platform TEXT,
  ADD COLUMN IF NOT EXISTS registration_source TEXT,
  ADD COLUMN IF NOT EXISTS registration_app_version TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_platform TEXT,
  ADD COLUMN IF NOT EXISTS last_login_source TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_platform TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_source TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_registration_platform
  ON public.user_profiles(registration_platform);

CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login_at
  ON public.user_profiles(last_login_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Eventos de signup/login: plataforma, app version y dispositivo
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_sessions
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS app_version TEXT,
  ADD COLUMN IF NOT EXISTS os TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS traffic_source TEXT,
  ADD COLUMN IF NOT EXISTS traffic_medium TEXT,
  ADD COLUMN IF NOT EXISTS traffic_campaign TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS attribution_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_user_sessions_platform
  ON public.user_sessions(platform);

CREATE INDEX IF NOT EXISTS idx_user_sessions_platform_created
  ON public.user_sessions(platform, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Page analytics: aperturas anonimas/autenticadas por plataforma
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.page_analytics
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS app_version TEXT;

CREATE INDEX IF NOT EXISTS idx_page_analytics_platform_created
  ON public.page_analytics(platform, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Enterprise leads: metadata operativa para venta directa/asistida
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.enterprise_leads
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS quoted_price_usd NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_source_created
  ON public.enterprise_leads(lead_source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_plan_created
  ON public.enterprise_leads(selected_plan, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Vista de embudo: descargas/app opens no se pueden leer directo de tiendas,
--    pero si medimos aperturas reales, registros, logins y negocios reclamados.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.admin_growth_funnel_v1
WITH (security_invoker = true) AS
WITH events_30d AS (
  SELECT now() - interval '30 days' AS since
),
page_base AS (
  SELECT
    COALESCE(platform, device_type, 'unknown') AS platform,
    session_id,
    user_id,
    created_at
  FROM public.page_analytics, events_30d
  WHERE created_at >= events_30d.since
),
session_base AS (
  SELECT
    COALESCE(platform, 'unknown') AS platform,
    session_type,
    user_id,
    created_at
  FROM public.user_sessions, events_30d
  WHERE created_at >= events_30d.since
),
profile_base AS (
  SELECT
    COALESCE(registration_platform, 'unknown') AS platform,
    id,
    created_at,
    last_login_at
  FROM public.user_profiles, events_30d
  WHERE created_at >= events_30d.since OR last_login_at >= events_30d.since
),
claim_base AS (
  SELECT
    COALESCE(up.registration_platform, up.last_login_platform, 'unknown') AS platform,
    bc.id,
    bc.user_id,
    bc.status,
    bc.created_at
  FROM public.business_claims bc
  LEFT JOIN public.user_profiles up ON up.id = bc.user_id,
  events_30d
  WHERE bc.created_at >= events_30d.since
),
business_owner_base AS (
  SELECT
    COALESCE(up.registration_platform, up.last_login_platform, 'unknown') AS platform,
    b.id,
    b.owner_id,
    b.created_at
  FROM public.businesses b
  LEFT JOIN public.user_profiles up ON up.id = b.owner_id,
  events_30d
  WHERE b.owner_id IS NOT NULL
    AND b.created_at >= events_30d.since
)
SELECT
  platform,
  COUNT(DISTINCT session_id) FILTER (WHERE source = 'page') AS app_or_web_sessions_30d,
  COUNT(*) FILTER (WHERE source = 'profile_signup') AS profile_signups_30d,
  COUNT(*) FILTER (WHERE source = 'session_signup') AS tracked_signups_30d,
  COUNT(*) FILTER (WHERE source = 'session_login') AS tracked_logins_30d,
  COUNT(*) FILTER (WHERE source = 'business_claim') AS business_claims_30d,
  COUNT(*) FILTER (WHERE source = 'business_owner') AS owned_businesses_created_30d
FROM (
  SELECT platform, session_id, NULL::UUID AS user_id, 'page' AS source FROM page_base
  UNION ALL
  SELECT platform, NULL::TEXT AS session_id, id AS user_id, 'profile_signup' AS source FROM profile_base WHERE created_at >= (SELECT since FROM events_30d)
  UNION ALL
  SELECT platform, NULL::TEXT AS session_id, user_id, 'session_signup' AS source FROM session_base WHERE session_type LIKE 'signup_%'
  UNION ALL
  SELECT platform, NULL::TEXT AS session_id, user_id, 'session_login' AS source FROM session_base WHERE session_type LIKE 'login_%'
  UNION ALL
  SELECT platform, NULL::TEXT AS session_id, user_id, 'business_claim' AS source FROM claim_base
  UNION ALL
  SELECT platform, NULL::TEXT AS session_id, owner_id AS user_id, 'business_owner' AS source FROM business_owner_base
) funnel
GROUP BY platform
ORDER BY app_or_web_sessions_30d DESC NULLS LAST, platform;

COMMENT ON VIEW public.admin_growth_funnel_v1 IS
'Embudo operativo de crecimiento por plataforma: sesiones, registros, logins, claims y negocios creados en los ultimos 30 dias.';

-- ---------------------------------------------------------------------------
-- 6. Queries rapidas de verificacion manual
-- ---------------------------------------------------------------------------
-- SELECT * FROM public.admin_growth_funnel_v1;
-- SELECT session_type, platform, count(*) FROM public.user_sessions GROUP BY session_type, platform ORDER BY count(*) DESC;
-- SELECT registration_platform, count(*) FROM public.user_profiles GROUP BY registration_platform ORDER BY count(*) DESC;
-- SELECT status, selected_plan, count(*) FROM public.enterprise_leads GROUP BY status, selected_plan ORDER BY count(*) DESC;
