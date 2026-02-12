-- ================================================
-- SISTEMA DE TRACKING DE INTENCIÓN DE NEGOCIO
-- Geobooker - Métricas vendibles para Ads y Premium
-- ================================================
-- Ejecutar en: https://supabase.com/dashboard/project/_/sql/new

-- TABLA: business_intent_logs
-- Registra cada acción de intención sobre un negocio
-- (WhatsApp, llamada, direcciones, compartir, favorito)
CREATE TABLE IF NOT EXISTS business_intent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación del evento
    event_name TEXT NOT NULL,              -- tap_whatsapp, tap_call, open_directions, share_business, save_favorite
    
    -- Negocio
    business_id UUID NOT NULL,
    business_name TEXT,
    business_category TEXT,
    
    -- Usuario (anon tracking)
    device_id TEXT NOT NULL,               -- Persistente en localStorage (anon)
    session_id TEXT NOT NULL,              -- Por sesión en sessionStorage
    user_id UUID REFERENCES auth.users(id), -- NULL si es guest
    
    -- Contexto
    source TEXT DEFAULT 'business_profile', -- business_profile, map_popup, search_result
    platform TEXT DEFAULT 'web',            -- web, ios, android
    
    -- Geolocalización del usuario
    country TEXT,
    country_code TEXT,
    city TEXT,
    
    -- Dispositivo
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    browser TEXT,
    os TEXT,
    
    -- Metadata extra (flexible para futuros campos)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Tiempo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hour_of_day INTEGER GENERATED ALWAYS AS (EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City')) STORED,
    day_of_week INTEGER GENERATED ALWAYS AS (EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Mexico_City')) STORED
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_intent_created ON business_intent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_event ON business_intent_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_intent_business ON business_intent_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_intent_device ON business_intent_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_intent_country ON business_intent_logs(country_code);

-- Habilitar RLS
ALTER TABLE business_intent_logs ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede insertar (tracking anónimo)
CREATE POLICY "Anyone can insert intent logs"
ON business_intent_logs FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política: Solo admins pueden leer
CREATE POLICY "Admins can read intent logs"
ON business_intent_logs FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- ================================================
-- VISTA: KPI de intención por negocio (diario)
-- Para reportes vendibles a dueños de negocio
-- ================================================
CREATE OR REPLACE VIEW kpi_business_intent_daily AS
SELECT
    business_id,
    business_name,
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) FILTER (WHERE event_name = 'open_directions') AS directions,
    COUNT(*) FILTER (WHERE event_name = 'tap_call') AS calls,
    COUNT(*) FILTER (WHERE event_name = 'tap_whatsapp') AS whatsapp,
    COUNT(*) FILTER (WHERE event_name = 'share_business') AS shares,
    COUNT(*) FILTER (WHERE event_name = 'save_favorite') AS favorites,
    COUNT(*) AS total_intents,
    COUNT(DISTINCT device_id) AS unique_users
FROM business_intent_logs
GROUP BY business_id, business_name, DATE_TRUNC('day', created_at);

-- ================================================
-- VISTA: KPI de intención global (para dashboard admin)
-- ================================================
CREATE OR REPLACE VIEW kpi_intent_summary AS
SELECT
    DATE_TRUNC('day', created_at) AS day,
    event_name,
    COUNT(*) AS total,
    COUNT(DISTINCT device_id) AS unique_users,
    COUNT(DISTINCT business_id) AS businesses_impacted
FROM business_intent_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), event_name
ORDER BY day DESC, total DESC;

-- ================================================
-- FUNCIÓN: Obtener top negocios por intención
-- Útil para media kit y reportes de valor
-- ================================================
CREATE OR REPLACE FUNCTION get_top_businesses_by_intent(
    p_days INTEGER DEFAULT 30,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    business_id UUID,
    business_name TEXT,
    total_intents BIGINT,
    directions BIGINT,
    calls BIGINT,
    whatsapp BIGINT,
    shares BIGINT,
    unique_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bil.business_id,
        bil.business_name,
        COUNT(*) AS total_intents,
        COUNT(*) FILTER (WHERE bil.event_name = 'open_directions') AS directions,
        COUNT(*) FILTER (WHERE bil.event_name = 'tap_call') AS calls,
        COUNT(*) FILTER (WHERE bil.event_name = 'tap_whatsapp') AS whatsapp,
        COUNT(*) FILTER (WHERE bil.event_name = 'share_business') AS shares,
        COUNT(DISTINCT bil.device_id) AS unique_users
    FROM business_intent_logs bil
    WHERE bil.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY bil.business_id, bil.business_name
    ORDER BY total_intents DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- VISTA: KPI de campañas de ads (diario)
-- Para reportes vendibles a anunciantes
-- ================================================
CREATE OR REPLACE VIEW kpi_campaign_daily AS
SELECT
    campaign_id,
    date,
    impressions,
    clicks,
    CASE 
        WHEN impressions > 0 THEN ROUND((clicks::DECIMAL / impressions) * 100, 2)
        ELSE 0
    END AS ctr_percent
FROM ad_analytics
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY date DESC;

-- ================================================
-- VERIFICAR
-- ================================================
SELECT 'business_intent_logs' AS tabla, COUNT(*) AS registros FROM business_intent_logs;
