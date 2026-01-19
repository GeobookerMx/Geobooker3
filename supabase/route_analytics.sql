-- ==========================================================
-- ROUTE ANALYTICS & REAL TRACKING ENHANCEMENTS
-- Ejecutar en Supabase SQL Editor
-- ==========================================================

-- 1. Tabla para clicks en rutas/direcciones
CREATE TABLE IF NOT EXISTS route_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    business_name TEXT,
    source TEXT DEFAULT 'map', -- 'map', 'profile', 'search_result'
    device_type TEXT,
    country TEXT,
    city TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_route_analytics_business ON route_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_route_analytics_date ON route_analytics(created_at DESC);

-- 3. RLS
ALTER TABLE route_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert route analytics" ON route_analytics;
CREATE POLICY "Anyone can insert route analytics" ON route_analytics FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read route analytics" ON route_analytics;
CREATE POLICY "Admins can read route analytics" ON route_analytics FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Función para registrar click en ruta
CREATE OR REPLACE FUNCTION record_route_click(
    p_business_id UUID,
    p_business_name TEXT,
    p_source TEXT DEFAULT 'map'
) RETURNS VOID
LANGUAGE SQL SECURITY DEFINER AS $$
    INSERT INTO route_analytics (business_id, business_name, source)
    VALUES (p_business_id, p_business_name, p_source);
$$;

-- 5. Función para obtener conteo de rutas
CREATE OR REPLACE FUNCTION get_route_clicks_count(p_days INTEGER DEFAULT 7)
RETURNS BIGINT
LANGUAGE SQL SECURITY DEFINER AS $$
    SELECT COUNT(*) FROM route_analytics 
    WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL;
$$;

-- 6. Verification
SELECT 'Route analytics table created' as status;
