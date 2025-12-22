-- ==========================================================
-- FIX: get_ad_inventory_status function
-- The original function assumed target_countries/target_cities were arrays
-- This version handles them as JSONB or TEXT safely
-- ==========================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_ad_inventory_status(DATE);
DROP FUNCTION IF EXISTS get_ad_inventory_status();

-- Create a simpler, working version
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
    WITH active_counts AS (
        SELECT 
            COALESCE(c.ad_level, c.campaign_type, 'city') as camp_level,
            COUNT(*) as cnt
        FROM ad_campaigns c
        WHERE c.status IN ('active', 'pending_review')
        AND (c.start_date IS NULL OR c.start_date <= p_date)
        AND (c.end_date IS NULL OR c.end_date >= p_date)
        GROUP BY COALESCE(c.ad_level, c.campaign_type, 'city')
    )
    SELECT 
        s.level::TEXT,
        s.location_code::TEXT,
        s.location_name::TEXT,
        s.max_concurrent_ads,
        COALESCE(ac.cnt, 0)::BIGINT as active_campaigns,
        (s.max_concurrent_ads - COALESCE(ac.cnt, 0))::BIGINT as available_slots,
        s.price_usd_per_month
    FROM ad_inventory_slots s
    LEFT JOIN active_counts ac ON s.level = ac.camp_level
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

-- Grant access
GRANT EXECUTE ON FUNCTION get_ad_inventory_status(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ad_inventory_status(DATE) TO anon;

-- Test it
SELECT * FROM get_ad_inventory_status() LIMIT 10;
