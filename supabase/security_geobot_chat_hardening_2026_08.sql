-- ============================================================================
-- Geobooker Security Hardening - GeoBot chat logs
-- Fecha: 2026-08-04
-- Objetivo:
-- - Crear la tabla base del chatbot si aun no existe.
-- - Evitar que usuarios anonimos/autenticados inserten directamente logs.
-- - Mantener lectura solo para administradores.
-- - Agregar vistas operativas y retencion para reducir exposicion de conversaciones.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_message text NOT NULL,
  bot_response text,
  language text DEFAULT 'es-MX',
  pathname text DEFAULT '/',
  hostname text DEFAULT 'geobooker.com.mx',
  is_sensitive boolean DEFAULT false,
  is_fallback boolean DEFAULT false,
  response_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_session ON public.chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_created ON public.chat_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conv_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_language ON public.chat_conversations(language);
CREATE INDEX IF NOT EXISTS idx_chat_conv_hostname ON public.chat_conversations(hostname);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insertar conversaciones" ON public.chat_conversations;
DROP POLICY IF EXISTS "GeoBot server-only insert" ON public.chat_conversations;
DROP POLICY IF EXISTS "Admin puede leer conversaciones" ON public.chat_conversations;
DROP POLICY IF EXISTS "Admin read chat_conversations" ON public.chat_conversations;

-- Lectura solo para administradores. Ajustado para instalaciones con admin_users.id, admin_users.user_id o admin_users.email.
CREATE POLICY "Admin read chat_conversations"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE coalesce(to_jsonb(au)->>'user_id', '') = auth.uid()::text
       OR coalesce(to_jsonb(au)->>'id', '') = auth.uid()::text
       OR lower(coalesce(to_jsonb(au)->>'email', '')) = lower(coalesce(auth.jwt()->>'email', ''))
  )
);

-- No se crea politica INSERT para anon/authenticated.
-- Las Netlify Functions insertan con SUPABASE_SERVICE_ROLE_KEY y bypass RLS.
REVOKE INSERT, UPDATE, DELETE ON public.chat_conversations FROM anon, authenticated;
GRANT SELECT ON public.chat_conversations TO authenticated;

CREATE OR REPLACE VIEW public.chat_stats_daily AS
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

CREATE OR REPLACE VIEW public.chat_top_questions AS
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

GRANT SELECT ON public.chat_stats_daily TO authenticated;
GRANT SELECT ON public.chat_top_questions TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_old_chat_conversations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.chat_conversations
  WHERE created_at < now() - interval '90 days'
     OR (is_sensitive = true AND created_at < now() - interval '30 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_chat_conversations() FROM PUBLIC;

COMMENT ON TABLE public.chat_conversations IS
  'Log anonimizado de conversaciones del chatbot GeoBot para analisis y mejora continua.';
COMMENT ON COLUMN public.chat_conversations.session_id IS
  'ID de sesion generado en el browser, no contiene PII.';
COMMENT ON COLUMN public.chat_conversations.user_id IS
  'UUID del usuario autenticado. NULL si es usuario anonimo.';
COMMENT ON COLUMN public.chat_conversations.is_sensitive IS
  'true si el mensaje fue detectado como solicitud de informacion sensible y fue bloqueado.';
COMMENT ON FUNCTION public.purge_old_chat_conversations() IS
  'Purga logs antiguos de GeoBot: 90 dias general, 30 dias para eventos sensibles.';

NOTIFY pgrst, 'reload schema';

COMMIT;
