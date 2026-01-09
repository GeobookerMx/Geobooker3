-- ================================================
-- SISTEMA DE ANALYTICS INTERNO - Geobooker
-- ================================================
-- Ejecutar en: https://supabase.com/dashboard/project/_/sql/new

-- TABLA: page_analytics
-- Registra cada visita a la plataforma
CREATE TABLE IF NOT EXISTS page_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información de la página
    page_path TEXT NOT NULL,              -- /home, /categories, /business/123
    page_title TEXT,                       -- Título de la página
    referrer TEXT,                         -- De dónde viene el usuario
    
    -- Información del usuario
    user_id UUID REFERENCES auth.users(id), -- NULL si es guest
    session_id TEXT,                       -- Para agrupar por sesión
    
    -- Geolocalización
    country TEXT,                          -- Mexico, USA, Spain
    country_code TEXT,                     -- MX, US, ES
    city TEXT,                             -- CDMX, Monterrey
    region TEXT,                           -- Estado/Provincia
    
    -- Dispositivo
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    browser TEXT,                          -- Chrome, Firefox, Safari
    os TEXT,                               -- Windows, iOS, Android
    
    -- Tiempo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hour_of_day INTEGER GENERATED ALWAYS AS (EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City')) STORED,
    day_of_week INTEGER GENERATED ALWAYS AS (EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Mexico_City')) STORED,
    
    -- Métricas adicionales
    time_on_page INTEGER,                  -- Segundos en la página
    is_bounce BOOLEAN DEFAULT FALSE        -- Si salió sin interactuar
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_page_analytics_created ON page_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_analytics_country ON page_analytics(country);
CREATE INDEX IF NOT EXISTS idx_page_analytics_hour ON page_analytics(hour_of_day);
CREATE INDEX IF NOT EXISTS idx_page_analytics_page ON page_analytics(page_path);

-- Habilitar RLS
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede insertar (tracking anónimo)
CREATE POLICY "Anyone can insert analytics"
ON page_analytics FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política: Solo admins pueden leer
CREATE POLICY "Admins can read analytics"
ON page_analytics FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- ================================================
-- TABLA: search_analytics
-- Registra búsquedas realizadas
-- ================================================
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Búsqueda
    query TEXT NOT NULL,                   -- Término buscado
    category TEXT,                         -- Categoría filtrada
    subcategory TEXT,                      -- Subcategoría
    
    -- Resultados
    results_count INTEGER DEFAULT 0,       -- Cuántos resultados
    clicked_result_id TEXT,                -- ID del negocio clickeado
    
    -- Ubicación del usuario
    user_lat DECIMAL(10, 6),
    user_lng DECIMAL(10, 6),
    country TEXT,
    city TEXT,
    
    -- Tiempo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    hour_of_day INTEGER GENERATED ALWAYS AS (EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City')) STORED
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_hour ON search_analytics(hour_of_day);

-- RLS
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert search analytics"
ON search_analytics FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read search analytics"
ON search_analytics FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- ================================================
-- FUNCIÓN: Obtener estadísticas por hora (24hrs)
-- ================================================
CREATE OR REPLACE FUNCTION get_hourly_analytics(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
    hour INTEGER,
    page_views BIGINT,
    searches BIGINT,
    unique_visitors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.hour,
        COALESCE(pv.count, 0) AS page_views,
        COALESCE(sa.count, 0) AS searches,
        COALESCE(uv.count, 0) AS unique_visitors
    FROM generate_series(0, 23) AS h(hour)
    LEFT JOIN (
        SELECT hour_of_day, COUNT(*) as count
        FROM page_analytics
        WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY hour_of_day
    ) pv ON h.hour = pv.hour_of_day
    LEFT JOIN (
        SELECT hour_of_day, COUNT(*) as count
        FROM search_analytics
        WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY hour_of_day
    ) sa ON h.hour = sa.hour_of_day
    LEFT JOIN (
        SELECT hour_of_day, COUNT(DISTINCT session_id) as count
        FROM page_analytics
        WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY hour_of_day
    ) uv ON h.hour = uv.hour_of_day
    ORDER BY h.hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- FUNCIÓN: Obtener tráfico por país
-- ================================================
CREATE OR REPLACE FUNCTION get_country_analytics(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    country TEXT,
    country_code TEXT,
    page_views BIGINT,
    searches BIGINT,
    percentage DECIMAL(5, 2)
) AS $$
DECLARE
    total_views BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_views
    FROM page_analytics
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL;
    
    IF total_views = 0 THEN total_views := 1; END IF;
    
    RETURN QUERY
    SELECT 
        COALESCE(pa.country, 'Desconocido') AS country,
        COALESCE(pa.country_code, 'XX') AS country_code,
        COUNT(*) AS page_views,
        COALESCE(sa.searches, 0) AS searches,
        ROUND((COUNT(*)::DECIMAL / total_views) * 100, 2) AS percentage
    FROM page_analytics pa
    LEFT JOIN (
        SELECT country AS c, COUNT(*) as searches
        FROM search_analytics
        WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY country
    ) sa ON pa.country = sa.c
    WHERE pa.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY pa.country, pa.country_code, sa.searches
    ORDER BY page_views DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- VERIFICAR que las tablas se crearon
-- ================================================
SELECT 'page_analytics' as tabla, COUNT(*) as registros FROM page_analytics
UNION ALL
SELECT 'search_analytics', COUNT(*) FROM search_analytics;
