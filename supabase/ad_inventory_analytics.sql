-- ==========================================================
-- ENTERPRISE AD INVENTORY & ANALYTICS SYSTEM
-- Sistema de inventario de espacios publicitarios + métricas
-- Run in Supabase SQL Editor
-- ==========================================================

-- ============================================
-- PART 1: INVENTORY SLOTS SYSTEM
-- ============================================

-- 1. Tabla de slots de inventario por nivel geográfico
CREATE TABLE IF NOT EXISTS ad_inventory_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('global', 'region', 'country', 'city')),
    location_code TEXT, -- null for global, 'northamerica' for region, 'US' for country, 'Los Angeles' for city
    location_name TEXT,
    max_concurrent_ads INT DEFAULT 5,
    price_usd_per_month DECIMAL(10,2) DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Poblar slots iniciales
INSERT INTO ad_inventory_slots (level, location_code, location_name, max_concurrent_ads, price_usd_per_month) VALUES
-- Global
('global', NULL, 'Global (All Locations)', 2, 25000),

-- Regions
('region', 'northamerica', 'North America', 3, 15000),
('region', 'latam', 'Latin America', 3, 12000),
('region', 'europe', 'Europe', 3, 15000),

-- Countries - North America
('country', 'US', 'United States', 5, 17500),
('country', 'CA', 'Canada', 5, 10000),
('country', 'MX', 'Mexico', 5, 8000),

-- Countries - LATAM
('country', 'BR', 'Brazil', 5, 10000),
('country', 'CO', 'Colombia', 5, 6000),
('country', 'AR', 'Argentina', 5, 6000),

-- Countries - Europe
('country', 'ES', 'Spain', 5, 10000),
('country', 'FR', 'France', 5, 12000),
('country', 'DE', 'Germany', 5, 12000),
('country', 'GB', 'United Kingdom', 5, 12000),
('country', 'IT', 'Italy', 5, 10000),

-- Cities - USA
('city', 'los_angeles', 'Los Angeles, USA', 10, 2500),
('city', 'new_york', 'New York, USA', 10, 3000),
('city', 'miami', 'Miami, USA', 10, 2000),
('city', 'dallas', 'Dallas, USA', 10, 1500),
('city', 'houston', 'Houston, USA', 10, 1500),
('city', 'chicago', 'Chicago, USA', 10, 2000),

-- Cities - Mexico
('city', 'mexico_city', 'Mexico City, Mexico', 10, 1500),
('city', 'guadalajara', 'Guadalajara, Mexico', 10, 1000),
('city', 'monterrey', 'Monterrey, Mexico', 10, 1000)

ON CONFLICT DO NOTHING;

-- 3. Tabla de categorías para límite de 3 por categoría
CREATE TABLE IF NOT EXISTS ad_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '🏢'
);

INSERT INTO ad_categories (code, name, icon) VALUES
('beverages', 'Beverages & Alcohol', '🍺'),
('automotive', 'Automotive', '🚗'),
('tech', 'Technology', '💻'),
('retail', 'Retail & Fashion', '🛍️'),
('food', 'Food & Restaurants', '🍔'),
('travel', 'Travel & Tourism', '✈️'),
('finance', 'Finance & Banking', '💳'),
('entertainment', 'Entertainment', '🎬'),
('sports', 'Sports & Fitness', '⚽'),
('health', 'Health & Wellness', '💊'),
('education', 'Education', '📚'),
('real_estate', 'Real Estate', '🏠'),
('other', 'Other', '📦')
ON CONFLICT DO NOTHING;

-- 4. Agregar columna de categoría a ad_campaigns
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS category_code TEXT DEFAULT 'other';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS ad_level TEXT DEFAULT 'city';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS end_date DATE;

-- 5. Función para verificar disponibilidad
CREATE OR REPLACE FUNCTION check_ad_availability(
    p_level TEXT,
    p_location_code TEXT,
    p_category_code TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
    v_max_slots INT;
    v_active_campaigns INT;
    v_category_count INT;
BEGIN
    -- Get max slots for this level/location
    SELECT max_concurrent_ads INTO v_max_slots
    FROM ad_inventory_slots
    WHERE level = p_level 
    AND (location_code = p_location_code OR (p_level = 'global' AND location_code IS NULL))
    LIMIT 1;
    
    IF v_max_slots IS NULL THEN
        v_max_slots := 5; -- Default
    END IF;
    
    -- Count active campaigns overlapping with date range
    SELECT COUNT(*) INTO v_active_campaigns
    FROM ad_campaigns
    WHERE status IN ('active', 'pending_review')
    AND ad_level = p_level
    AND (
        (p_level = 'global') OR
        (p_location_code = ANY(target_countries)) OR
        (p_location_code = ANY(target_cities))
    )
    AND (start_date <= p_end_date AND end_date >= p_start_date);
    
    -- Count campaigns in same category (limit 3)
    SELECT COUNT(*) INTO v_category_count
    FROM ad_campaigns
    WHERE status IN ('active', 'pending_review')
    AND category_code = p_category_code
    AND ad_level = p_level
    AND (start_date <= p_end_date AND end_date >= p_start_date);
    
    RETURN jsonb_build_object(
        'available', v_active_campaigns < v_max_slots AND v_category_count < 3,
        'max_slots', v_max_slots,
        'used_slots', v_active_campaigns,
        'remaining_slots', v_max_slots - v_active_campaigns,
        'category_limit', 3,
        'category_used', v_category_count,
        'category_available', v_category_count < 3
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función para obtener inventario completo
CREATE OR REPLACE FUNCTION get_ad_inventory_status(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    level TEXT,
    location_code TEXT,
    location_name TEXT,
    max_slots INT,
    active_campaigns BIGINT,
    available_slots BIGINT,
    price_usd DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.level,
        s.location_code,
        s.location_name,
        s.max_concurrent_ads,
        COALESCE(COUNT(c.id), 0) as active_campaigns,
        s.max_concurrent_ads - COALESCE(COUNT(c.id), 0) as available_slots,
        s.price_usd_per_month
    FROM ad_inventory_slots s
    LEFT JOIN ad_campaigns c ON (
        c.status IN ('active', 'pending_review')
        AND c.ad_level = s.level
        AND (
            (s.level = 'global') OR
            (s.location_code = ANY(c.target_countries)) OR
            (s.location_code = ANY(c.target_cities))
        )
        AND (c.start_date <= p_date AND c.end_date >= p_date)
    )
    GROUP BY s.id, s.level, s.location_code, s.location_name, s.max_concurrent_ads, s.price_usd_per_month
    ORDER BY 
        CASE s.level 
            WHEN 'global' THEN 1 
            WHEN 'region' THEN 2 
            WHEN 'country' THEN 3 
            WHEN 'city' THEN 4 
        END,
        s.location_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- PART 2: CAMPAIGN ANALYTICS / METRICS
-- ============================================

-- 7. Drop existing view if it exists (fix for conflict)
DROP VIEW IF EXISTS ad_campaign_metrics CASCADE;

-- 7b. Tabla de métricas de campañas (para reportes)
CREATE TABLE IF NOT EXISTS ad_campaign_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Impressions (veces que se mostró el anuncio)
    impressions INT DEFAULT 0,
    
    -- Unique users who saw the ad
    unique_views INT DEFAULT 0,
    
    -- Clicks on the ad
    clicks INT DEFAULT 0,
    
    -- Click-through rate (calculated)
    ctr DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions ELSE 0 END
    ) STORED,
    
    -- Geographic breakdown (JSONB for flexibility)
    views_by_country JSONB DEFAULT '{}',
    views_by_city JSONB DEFAULT '{}',
    
    -- Device breakdown
    views_by_device JSONB DEFAULT '{}', -- {"mobile": 500, "desktop": 300, "tablet": 50}
    
    -- Time breakdown
    views_by_hour JSONB DEFAULT '{}', -- {"08": 100, "12": 200, "18": 150}
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id, date)
);

-- 8. Índice para consultas rápidas por campaña y fecha
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_date 
ON ad_campaign_metrics(campaign_id, date DESC);

-- 9. Función para registrar una impresión (llamada desde frontend)
CREATE OR REPLACE FUNCTION record_ad_impression(
    p_campaign_id UUID,
    p_country TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_device TEXT DEFAULT 'unknown'
) RETURNS VOID AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Insert or update today's metrics
    INSERT INTO ad_campaign_metrics (campaign_id, date, impressions, unique_views)
    VALUES (p_campaign_id, v_today, 1, 1)
    ON CONFLICT (campaign_id, date) DO UPDATE SET
        impressions = ad_campaign_metrics.impressions + 1,
        views_by_country = COALESCE(ad_campaign_metrics.views_by_country, '{}') || 
            jsonb_build_object(COALESCE(p_country, 'unknown'), 
                COALESCE((ad_campaign_metrics.views_by_country->COALESCE(p_country, 'unknown'))::int, 0) + 1),
        views_by_city = COALESCE(ad_campaign_metrics.views_by_city, '{}') || 
            jsonb_build_object(COALESCE(p_city, 'unknown'), 
                COALESCE((ad_campaign_metrics.views_by_city->COALESCE(p_city, 'unknown'))::int, 0) + 1),
        views_by_device = COALESCE(ad_campaign_metrics.views_by_device, '{}') || 
            jsonb_build_object(p_device, 
                COALESCE((ad_campaign_metrics.views_by_device->p_device)::int, 0) + 1),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Función para registrar un click
CREATE OR REPLACE FUNCTION record_ad_click(p_campaign_id UUID) RETURNS VOID AS $$
BEGIN
    INSERT INTO ad_campaign_metrics (campaign_id, date, clicks)
    VALUES (p_campaign_id, CURRENT_DATE, 1)
    ON CONFLICT (campaign_id, date) DO UPDATE SET
        clicks = ad_campaign_metrics.clicks + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Función para obtener resumen de campaña (para reportes)
CREATE OR REPLACE FUNCTION get_campaign_report(
    p_campaign_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_campaign RECORD;
    v_metrics RECORD;
    v_result JSONB;
BEGIN
    -- Get campaign details
    SELECT * INTO v_campaign FROM ad_campaigns WHERE id = p_campaign_id;
    
    IF v_campaign IS NULL THEN
        RETURN jsonb_build_object('error', 'Campaign not found');
    END IF;
    
    -- Set date range defaults
    IF p_start_date IS NULL THEN p_start_date := v_campaign.start_date; END IF;
    IF p_end_date IS NULL THEN p_end_date := COALESCE(v_campaign.end_date, CURRENT_DATE); END IF;
    
    -- Aggregate metrics
    SELECT 
        COALESCE(SUM(impressions), 0) as total_impressions,
        COALESCE(SUM(clicks), 0) as total_clicks,
        CASE WHEN SUM(impressions) > 0 
            THEN ROUND((SUM(clicks)::DECIMAL / SUM(impressions)) * 100, 2) 
            ELSE 0 END as ctr_percent,
        COUNT(DISTINCT date) as active_days
    INTO v_metrics
    FROM ad_campaign_metrics
    WHERE campaign_id = p_campaign_id
    AND date BETWEEN p_start_date AND p_end_date;
    
    -- Build result
    v_result := jsonb_build_object(
        'campaign', jsonb_build_object(
            'id', v_campaign.id,
            'advertiser', v_campaign.advertiser_name,
            'status', v_campaign.status,
            'start_date', v_campaign.start_date,
            'end_date', v_campaign.end_date,
            'budget_usd', v_campaign.total_budget
        ),
        'period', jsonb_build_object(
            'from', p_start_date,
            'to', p_end_date
        ),
        'metrics', jsonb_build_object(
            'total_impressions', v_metrics.total_impressions,
            'total_clicks', v_metrics.total_clicks,
            'ctr_percent', v_metrics.ctr_percent,
            'active_days', v_metrics.active_days,
            'avg_daily_impressions', CASE WHEN v_metrics.active_days > 0 
                THEN ROUND(v_metrics.total_impressions::DECIMAL / v_metrics.active_days) 
                ELSE 0 END
        ),
        'generated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Función para obtener métricas diarias (para gráficas)
CREATE OR REPLACE FUNCTION get_campaign_daily_metrics(
    p_campaign_id UUID,
    p_days INT DEFAULT 30
) RETURNS TABLE (
    date DATE,
    impressions INT,
    clicks INT,
    ctr DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.date,
        m.impressions,
        m.clicks,
        m.ctr
    FROM ad_campaign_metrics m
    WHERE m.campaign_id = p_campaign_id
    AND m.date >= CURRENT_DATE - p_days
    ORDER BY m.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- PART 3: ENABLE RLS
-- ============================================

ALTER TABLE ad_inventory_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaign_metrics ENABLE ROW LEVEL SECURITY;

-- Everyone can read inventory and categories
CREATE POLICY "Public read inventory" ON ad_inventory_slots FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON ad_categories FOR SELECT USING (true);

-- Only authenticated users can see their campaign metrics
CREATE POLICY "Users read own campaign metrics" ON ad_campaign_metrics
FOR SELECT USING (
    campaign_id IN (
        SELECT id FROM ad_campaigns WHERE advertiser_email = auth.jwt()->>'email'
    )
    OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION check_ad_availability TO authenticated;
GRANT EXECUTE ON FUNCTION get_ad_inventory_status TO authenticated;
GRANT EXECUTE ON FUNCTION record_ad_impression TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_ad_click TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_campaign_report TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_daily_metrics TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Inventory slots created:' as status, COUNT(*) as count FROM ad_inventory_slots;
SELECT 'Categories created:' as status, COUNT(*) as count FROM ad_categories;
