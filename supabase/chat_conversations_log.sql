-- ============================================================
-- CHAT CONVERSATIONS LOG — GeoBot Analytics
-- Registra cada conversacion del chatbot para analisis y mejora
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla principal de conversaciones
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      text NOT NULL,                   -- ID anonimo de sesion (sin PII)
    user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- null si anonimo
    user_message    text NOT NULL,
    bot_response    text,
    language        text DEFAULT 'es-MX',
    pathname        text DEFAULT '/',
    hostname        text DEFAULT 'geobooker.com.mx',
    is_sensitive    boolean DEFAULT false,           -- true si fue bloqueado por seguridad
    is_fallback     boolean DEFAULT false,           -- true si respondio sin IA (API down)
    response_time_ms int,                            -- Tiempo de respuesta en ms
    created_at      timestamptz DEFAULT now()
);

-- Indice para busqueda por sesion
CREATE INDEX IF NOT EXISTS idx_chat_conv_session ON public.chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_created ON public.chat_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conv_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_language ON public.chat_conversations(language);

-- RLS: Solo admins pueden leer. Inserts permitidos desde service role (funciones Netlify)
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Politica de lectura solo para admins
CREATE POLICY "Admin puede leer conversaciones" ON public.chat_conversations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

-- Politica de insert para service_role (Netlify functions)
-- La funcion usa SUPABASE_SERVICE_ROLE_KEY, no necesita politica adicional
-- pero la dejamos abierta para inserts autenticados como fallback
CREATE POLICY "Insertar conversaciones" ON public.chat_conversations
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Vista de resumen para el dashboard de admin
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

-- Permisos de la vista
GRANT SELECT ON public.chat_stats_daily TO authenticated;

-- Preguntas mas frecuentes (top topics) — vista para admin
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

GRANT SELECT ON public.chat_top_questions TO authenticated;

-- Comentarios
COMMENT ON TABLE public.chat_conversations IS 'Log anonimizado de conversaciones del chatbot GeoBot para analisis y mejora continua.';
COMMENT ON COLUMN public.chat_conversations.session_id IS 'ID de sesion generado en el browser, no contiene PII.';
COMMENT ON COLUMN public.chat_conversations.user_id IS 'UUID del usuario autenticado. NULL si es usuario anonimo.';
COMMENT ON COLUMN public.chat_conversations.is_sensitive IS 'true si el mensaje fue detectado como solicitud de informacion sensible y fue bloqueado.';
