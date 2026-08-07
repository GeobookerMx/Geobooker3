-- Geobooker: vistas agregadas de eficiencia y embudo, agosto 2026.
-- Las ramas Preview pueden no replicar tablas operativas; por eso cada vista
-- se crea solamente cuando todas sus dependencias existen.

BEGIN;

DO $migration$
BEGIN
  IF to_regclass('public.user_sessions') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.admin_auth_funnel_30d_v1
      WITH (security_invoker = true) AS
      SELECT
        COUNT(*) FILTER (WHERE session_type = 'funnel_signup_form_view') AS signup_views,
        COUNT(*) FILTER (WHERE session_type = 'funnel_signup_form_start') AS signup_starts,
        COUNT(*) FILTER (WHERE session_type = 'funnel_signup_submit') AS signup_submits,
        COUNT(*) FILTER (WHERE session_type = 'funnel_signup_success') AS signup_successes,
        COUNT(*) FILTER (WHERE session_type = 'funnel_signup_error') AS signup_errors,
        COUNT(*) FILTER (WHERE session_type = 'funnel_login_form_view') AS login_views,
        COUNT(*) FILTER (WHERE session_type = 'funnel_login_form_start') AS login_starts,
        COUNT(*) FILTER (WHERE session_type = 'funnel_login_submit') AS login_submits,
        COUNT(*) FILTER (WHERE session_type = 'funnel_login_success') AS login_successes,
        COUNT(*) FILTER (WHERE session_type = 'funnel_login_error') AS login_errors,
        COUNT(*) FILTER (WHERE session_type = 'funnel_oauth_start') AS oauth_starts,
        COUNT(*) FILTER (WHERE session_type = 'funnel_oauth_callback_success') AS oauth_successes
      FROM public.user_sessions
      WHERE created_at >= NOW() - INTERVAL '30 days'
    $view$;
    EXECUTE 'GRANT SELECT ON public.admin_auth_funnel_30d_v1 TO authenticated';
  END IF;

  IF to_regclass('public.page_analytics') IS NOT NULL
     AND to_regclass('public.ad_campaign_metrics') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.admin_efficiency_snapshot_v1
      WITH (security_invoker = true) AS
      WITH pages AS (
        SELECT COUNT(*) AS page_views, COUNT(DISTINCT session_id) AS sessions
        FROM public.page_analytics
        WHERE created_at >= NOW() - INTERVAL '30 days'
      ), ads AS (
        SELECT COALESCE(SUM(impressions), 0) AS impressions,
               COALESCE(SUM(clicks), 0) AS clicks
        FROM public.ad_campaign_metrics
        WHERE date >= CURRENT_DATE - 29
      )
      SELECT
        pages.page_views,
        pages.sessions,
        ads.impressions AS ad_impressions,
        ads.clicks AS ad_clicks,
        ROUND(ads.impressions::numeric / NULLIF(pages.page_views, 0), 2) AS impressions_per_page,
        NOW() AS calculated_at
      FROM pages CROSS JOIN ads
    $view$;
    EXECUTE 'GRANT SELECT ON public.admin_efficiency_snapshot_v1 TO authenticated';
  END IF;
END
$migration$;

COMMIT;
