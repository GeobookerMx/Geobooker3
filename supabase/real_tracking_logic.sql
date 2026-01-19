-- 1. Tendencia de Actividad de Ads (Global)
DROP FUNCTION IF EXISTS get_global_ad_activity_trend(INTEGER);
CREATE OR REPLACE FUNCTION get_global_ad_activity_trend(p_days INTEGER DEFAULT 7)
RETURNS TABLE (date DATE, impressions BIGINT, clicks BIGINT)
LANGUAGE SQL SECURITY DEFINER AS $$
    WITH date_series AS (SELECT generate_series(CURRENT_DATE - (p_days - 1) * INTERVAL '1 day', CURRENT_DATE, '1 day'::INTERVAL)::DATE as d)
    SELECT ds.d as date, COALESCE(SUM(m.impressions), 0)::BIGINT as impressions, COALESCE(SUM(m.clicks), 0)::BIGINT as clicks
    FROM date_series ds LEFT JOIN ad_campaign_metrics m ON ds.d = m.date GROUP BY ds.d ORDER BY ds.d;
$$;

-- 2. Tendencias de Búsqueda Reales
DROP FUNCTION IF EXISTS get_real_search_trends(INTEGER);
CREATE OR REPLACE FUNCTION get_real_search_trends(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (term TEXT, count BIGINT, previous_count BIGINT, trend_percentage DECIMAL)
LANGUAGE SQL SECURITY DEFINER AS $$
    WITH current_p AS (SELECT query, COUNT(*) as c FROM search_analytics WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY query),
         previous_p AS (SELECT query, COUNT(*) as c FROM search_analytics WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' GROUP BY query)
    SELECT cp.query, cp.c, COALESCE(pp.c, 0), CASE WHEN COALESCE(pp.c, 0) = 0 THEN 100.0 ELSE ROUND(((cp.c::DECIMAL - pp.c) / pp.c) * 100, 2) END
    FROM current_p cp LEFT JOIN previous_p pp ON cp.query = pp.query ORDER BY cp.c DESC LIMIT p_limit;
$$;

-- 3. Embudo de Conversión Real
DROP FUNCTION IF EXISTS get_real_conversion_funnel();
CREATE OR REPLACE FUNCTION get_real_conversion_funnel()
RETURNS TABLE (etapa TEXT, cantidad BIGINT, porcentaje DECIMAL)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE total_visitors BIGINT;
BEGIN
    SELECT COUNT(DISTINCT session_id) INTO total_visitors FROM page_analytics;
    IF total_visitors = 0 THEN total_visitors := 1; END IF;
    etapa := 'Visitantes'; cantidad := total_visitors; porcentaje := 100.0; RETURN NEXT;
    etapa := 'Búsquedas'; SELECT COUNT(DISTINCT id) INTO cantidad FROM search_analytics; porcentaje := ROUND((cantidad::DECIMAL / total_visitors) * 100, 2); RETURN NEXT;
    etapa := 'Interacción'; SELECT COUNT(*) INTO cantidad FROM page_analytics WHERE page_path LIKE '/business/%'; porcentaje := ROUND((cantidad::DECIMAL / total_visitors) * 100, 2); RETURN NEXT;
    etapa := 'Registros'; SELECT COUNT(*) INTO cantidad FROM user_profiles; porcentaje := ROUND((cantidad::DECIMAL / total_visitors) * 100, 2); RETURN NEXT;
    etapa := 'Conversión (Negocios)'; SELECT COUNT(*) INTO cantidad FROM businesses; porcentaje := ROUND((cantidad::DECIMAL / total_visitors) * 100, 2); RETURN NEXT;
END;
$$;

-- 4. Métricas de Comportamiento Reales
DROP FUNCTION IF EXISTS get_user_behavior_stats();
CREATE OR REPLACE FUNCTION get_user_behavior_stats()
RETURNS TABLE (metrica TEXT, valor TEXT, icono TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE avg_dur FLOAT; p_per_s FLOAT; bounce FLOAT; total_s BIGINT;
BEGIN
    SELECT COUNT(DISTINCT session_id) INTO total_s FROM page_analytics;
    IF total_s = 0 THEN total_s := 1; END IF;
    WITH s_times AS (SELECT session_id, EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as dur FROM page_analytics GROUP BY session_id)
    SELECT AVG(dur) INTO avg_dur FROM s_times WHERE dur > 0;
    SELECT (COUNT(*)::FLOAT / total_s) INTO p_per_s FROM page_analytics;
    WITH s_counts AS (SELECT session_id, COUNT(*) as c FROM page_analytics GROUP BY session_id)
    SELECT (COUNT(*)::FLOAT / total_s * 100) INTO bounce FROM s_counts WHERE c = 1;
    metrica := 'Tiempo prom. sesión'; valor := COALESCE(FLOOR(avg_dur/60)::TEXT || ':' || LPAD(FLOOR(avg_dur%60)::TEXT, 2, '0'), '0:00'); icono := '⏱️'; RETURN NEXT;
    metrica := 'Páginas por sesión'; valor := ROUND(p_per_s::DECIMAL, 1)::TEXT; icono := '📄'; RETURN NEXT;
    metrica := 'Tasa de rebote'; valor := ROUND(bounce::DECIMAL, 1)::TEXT || '%'; icono := '↩️'; RETURN NEXT;
    WITH rec AS (SELECT user_id, COUNT(DISTINCT session_id) as s FROM page_analytics WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(DISTINCT session_id) > 1)
    SELECT (COUNT(*)::FLOAT / NULLIF((SELECT COUNT(DISTINCT user_id) FROM page_analytics), 0) * 100) INTO bounce FROM rec;
    metrica := 'Usuarios recurrentes'; valor := ROUND(COALESCE(bounce, 0)::DECIMAL, 1)::TEXT || '%'; icono := '🔄'; RETURN NEXT;
END;
$$;

