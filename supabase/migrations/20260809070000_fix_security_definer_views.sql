-- Fix Supabase Security Advisory: Security Definer Views
-- Migration: 20260809070000
-- Description: Recreates views with (security_invoker = true) so Postgres evaluates RLS policies of the querying user.

BEGIN;

-- 1. Fix public.chat_top_questions
CREATE OR REPLACE VIEW public.chat_top_questions
WITH (security_invoker = true) AS
SELECT
    user_message,
    COUNT(*) AS frecuencia,
    MAX(created_at) AS ultima_vez
FROM public.chat_conversations
WHERE is_sensitive = false
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_message
ORDER BY frecuencia DESC
LIMIT 50;

GRANT SELECT ON public.chat_top_questions TO authenticated, service_role;

-- 2. Fix public.chat_stats_daily
CREATE OR REPLACE VIEW public.chat_stats_daily
WITH (security_invoker = true) AS
SELECT
    DATE(created_at AT TIME ZONE 'America/Mexico_City') AS fecha,
    COUNT(*) AS total_mensajes,
    COUNT(DISTINCT session_id) AS sesiones_unicas,
    ROUND(AVG(response_time_ms)::numeric, 0) AS tiempo_promedio_ms,
    SUM(CASE WHEN is_sensitive THEN 1 ELSE 0 END) AS bloqueos_seguridad,
    SUM(CASE WHEN is_fallback THEN 1 ELSE 0 END) AS respuestas_fallback,
    SUM(CASE WHEN language ILIKE 'en%' THEN 1 ELSE 0 END) AS mensajes_ingles,
    SUM(CASE WHEN language NOT ILIKE 'en%' THEN 1 ELSE 0 END) AS mensajes_espanol
FROM public.chat_conversations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at AT TIME ZONE 'America/Mexico_City')
ORDER BY fecha DESC;

GRANT SELECT ON public.chat_stats_daily TO authenticated, service_role;

-- 3. Fix public.v_security_health
CREATE OR REPLACE VIEW public.v_security_health
WITH (security_invoker = true) AS
SELECT
  (
    SELECT COUNT(*)
    FROM pg_tables pt
    LEFT JOIN pg_class pc ON pc.relname = pt.tablename
    WHERE pt.schemaname = 'public'
      AND pc.relrowsecurity = FALSE
      AND pt.tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
  ) AS tables_without_rls,
  (SELECT overall_severity FROM public.security_audit_log ORDER BY audit_date DESC LIMIT 1) AS last_audit_severity,
  (SELECT audit_date FROM public.security_audit_log ORDER BY audit_date DESC LIMIT 1) AS last_audit_date,
  (SELECT checks_failed FROM public.security_audit_log ORDER BY audit_date DESC LIMIT 1) AS last_audit_failed,
  (
    SELECT COUNT(*) FROM public.security_events
    WHERE severity IN ('critical', 'high')
      AND created_at > NOW() - INTERVAL '30 days'
  ) AS critical_events_30d,
  (
    SELECT COUNT(DISTINCT identifier)
    FROM public.api_rate_limits
    WHERE last_call_at > NOW() - INTERVAL '24 hours'
      AND call_count > 5
  ) AS rate_limited_identifiers_24h;

GRANT SELECT ON public.v_security_health TO service_role;

DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.v_security_health TO authenticated';
  END IF;
END $$;

COMMIT;
