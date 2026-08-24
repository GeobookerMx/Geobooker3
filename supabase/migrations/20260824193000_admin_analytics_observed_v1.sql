-- Métricas administrativas observadas, agregadas en PostgreSQL.
-- Evita descargar miles de eventos al navegador y elimina topes de paginación.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_admin_analytics_observed_v1(
  p_days INTEGER DEFAULT 7,
  p_geo_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 7), 1), 90);
  v_geo_days INTEGER := LEAST(GREATEST(COALESCE(p_geo_days, 30), 1), 180);
  v_today DATE := (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;
  v_start DATE;
  v_previous_start DATE;
  v_geo_start DATE;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  v_start := v_today - (v_days - 1);
  v_previous_start := v_start - v_days;
  v_geo_start := v_today - (v_geo_days - 1);

  WITH
  day_series AS (
    SELECT generate_series(v_start, v_today, INTERVAL '1 day')::DATE AS day
  ),
  daily AS (
    SELECT
      ds.day,
      (SELECT COUNT(*) FROM public.page_analytics pa
       WHERE (pa.created_at AT TIME ZONE 'America/Mexico_City')::DATE = ds.day) AS page_views,
      (SELECT COUNT(DISTINCT pa.session_id) FROM public.page_analytics pa
       WHERE pa.session_id IS NOT NULL
         AND (pa.created_at AT TIME ZONE 'America/Mexico_City')::DATE = ds.day) AS unique_sessions,
      (SELECT COUNT(*) FROM public.search_analytics sa
       WHERE (sa.created_at AT TIME ZONE 'America/Mexico_City')::DATE = ds.day) AS searches,
      (SELECT COUNT(*) FROM public.route_analytics ra
       WHERE (ra.created_at AT TIME ZONE 'America/Mexico_City')::DATE = ds.day) AS routes
    FROM day_series ds
  ),
  hour_series AS (
    SELECT generate_series(0, 23) AS hour
  ),
  hourly AS (
    SELECT
      hs.hour,
      (SELECT COUNT(DISTINCT pa.session_id) FROM public.page_analytics pa
       WHERE pa.session_id IS NOT NULL
         AND (pa.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_start
         AND EXTRACT(HOUR FROM pa.created_at AT TIME ZONE 'America/Mexico_City')::INTEGER = hs.hour) AS unique_visitors,
      (SELECT COUNT(*) FROM public.search_analytics sa
       WHERE (sa.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_start
         AND EXTRACT(HOUR FROM sa.created_at AT TIME ZONE 'America/Mexico_City')::INTEGER = hs.hour) AS searches
    FROM hour_series hs
  ),
  current_searches AS (
    SELECT LOWER(TRIM(sa.query)) AS query, COUNT(*)::BIGINT AS current_count
    FROM public.search_analytics sa
    WHERE sa.query IS NOT NULL
      AND TRIM(sa.query) <> ''
      AND (sa.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_start
    GROUP BY LOWER(TRIM(sa.query))
  ),
  previous_searches AS (
    SELECT LOWER(TRIM(sa.query)) AS query, COUNT(*)::BIGINT AS previous_count
    FROM public.search_analytics sa
    WHERE sa.query IS NOT NULL
      AND TRIM(sa.query) <> ''
      AND (sa.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_previous_start
      AND (sa.created_at AT TIME ZONE 'America/Mexico_City')::DATE < v_start
    GROUP BY LOWER(TRIM(sa.query))
  ),
  top_searches AS (
    SELECT cs.query, cs.current_count, COALESCE(ps.previous_count, 0)::BIGINT AS previous_count
    FROM current_searches cs
    LEFT JOIN previous_searches ps USING (query)
    ORDER BY cs.current_count DESC, cs.query
    LIMIT 10
  ),
  device_counts AS (
    SELECT COALESCE(NULLIF(pa.device_type, ''), 'unknown') AS device, COUNT(*)::BIGINT AS count
    FROM public.page_analytics pa
    WHERE (pa.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_geo_start
    GROUP BY COALESCE(NULLIF(pa.device_type, ''), 'unknown')
  ),
  devices AS (
    SELECT
      dc.device,
      dc.count,
      ROUND(100.0 * dc.count / NULLIF(SUM(dc.count) OVER (), 0), 2) AS percentage
    FROM device_counts dc
  ),
  country_pages AS (
    SELECT
      COALESCE(NULLIF(pa.country, ''), 'Desconocido') AS country,
      COALESCE(NULLIF(pa.country_code, ''), 'XX') AS country_code,
      COUNT(*)::BIGINT AS page_views
    FROM public.page_analytics pa
    WHERE (pa.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_geo_start
    GROUP BY 1, 2
  ),
  country_searches AS (
    SELECT COALESCE(NULLIF(sa.country, ''), 'Desconocido') AS country, COUNT(*)::BIGINT AS searches
    FROM public.search_analytics sa
    WHERE (sa.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_geo_start
    GROUP BY 1
  ),
  countries AS (
    SELECT
      cp.country,
      cp.country_code,
      cp.page_views,
      COALESCE(cs.searches, 0)::BIGINT AS searches,
      ROUND(100.0 * cp.page_views / NULLIF(SUM(cp.page_views) OVER (), 0), 2) AS percentage
    FROM country_pages cp
    LEFT JOIN country_searches cs USING (country)
    ORDER BY cp.page_views DESC, cp.country
    LIMIT 10
  ),
  category_counts AS (
    SELECT COALESCE(NULLIF(b.category, ''), 'Sin categoría') AS name, COUNT(*)::BIGINT AS count
    FROM public.businesses b
    WHERE b.status = 'approved'
    GROUP BY 1
    ORDER BY count DESC, name
    LIMIT 8
  ),
  subcategory_counts AS (
    SELECT COALESCE(NULLIF(b.subcategory, ''), 'Sin subcategoría') AS name, COUNT(*)::BIGINT AS count
    FROM public.businesses b
    WHERE b.status = 'approved' AND b.subcategory IS NOT NULL
    GROUP BY 1
    ORDER BY count DESC, name
    LIMIT 10
  )
  SELECT JSONB_BUILD_OBJECT(
    'period_days', v_days,
    'geo_period_days', v_geo_days,
    'total_users', (SELECT COUNT(*) FROM public.user_profiles),
    'premium_users', (SELECT COUNT(*) FROM public.user_profiles up WHERE up.is_premium_owner = TRUE),
    'businesses_registered', (SELECT COUNT(*) FROM public.businesses),
    'recent_signups', (
      SELECT COUNT(*) FROM public.user_profiles up
      WHERE (up.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_start
    ),
    'recent_businesses', (
      SELECT COUNT(*) FROM public.businesses b
      WHERE (b.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_start
    ),
    'page_views', (SELECT COALESCE(SUM(d.page_views), 0) FROM daily d),
    'unique_visitors', (
      SELECT COUNT(DISTINCT pa.session_id)
      FROM public.page_analytics pa
      WHERE pa.session_id IS NOT NULL
        AND (pa.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_start
    ),
    'searches', (SELECT COALESCE(SUM(d.searches), 0) FROM daily d),
    'routes', (SELECT COALESCE(SUM(d.routes), 0) FROM daily d),
    'profile_views', (
      SELECT COUNT(*) FROM public.business_intent_logs bil
      WHERE bil.event_name = 'view_business_profile'
        AND (bil.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_start
    ),
    'pwa_installs', (
      SELECT COUNT(*) FROM public.app_download_events ade
      WHERE ade.target = 'pwa_install'
        AND (ade.created_at AT TIME ZONE 'America/Mexico_City')::DATE >= v_start
    ),
    'today_page_views', (SELECT d.page_views FROM daily d WHERE d.day = v_today),
    'today_searches', (SELECT d.searches FROM daily d WHERE d.day = v_today),
    'daily', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'date', d.day,
        'page_views', d.page_views,
        'unique_sessions', d.unique_sessions,
        'searches', d.searches,
        'routes', d.routes
      ) ORDER BY d.day) FROM daily d
    ), '[]'::JSONB),
    'hourly', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'hour', h.hour,
        'unique_visitors', h.unique_visitors,
        'searches', h.searches
      ) ORDER BY h.hour) FROM hourly h
    ), '[]'::JSONB),
    'top_searches', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'query', ts.query,
        'current_count', ts.current_count,
        'previous_count', ts.previous_count
      ) ORDER BY ts.current_count DESC, ts.query) FROM top_searches ts
    ), '[]'::JSONB),
    'devices', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'device', d.device,
        'count', d.count,
        'percentage', d.percentage
      ) ORDER BY d.count DESC, d.device) FROM devices d
    ), '[]'::JSONB),
    'countries', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'country', c.country,
        'country_code', c.country_code,
        'page_views', c.page_views,
        'searches', c.searches,
        'percentage', c.percentage
      ) ORDER BY c.page_views DESC, c.country) FROM countries c
    ), '[]'::JSONB),
    'categories', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT('name', cc.name, 'count', cc.count)
        ORDER BY cc.count DESC, cc.name) FROM category_counts cc
    ), '[]'::JSONB),
    'subcategories', COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT('name', sc.name, 'count', sc.count)
        ORDER BY sc.count DESC, sc.name) FROM subcategory_counts sc
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics_observed_v1(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics_observed_v1(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics_observed_v1(INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.get_admin_analytics_observed_v1(INTEGER, INTEGER) IS
'Métricas observadas del panel admin, agregadas en servidor y restringidas a administradores.';

COMMIT;

-- Verificación (ejecutar con sesión admin desde la aplicación):
-- SELECT public.get_admin_analytics_observed_v1(7, 30);
