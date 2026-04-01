-- Update daily metrics RPC to include breakdown JSON fields
CREATE OR REPLACE FUNCTION get_campaign_daily_metrics(
    p_campaign_id UUID,
    p_days INT DEFAULT 30
) RETURNS TABLE (
    date DATE,
    impressions INT,
    clicks INT,
    ctr DECIMAL,
    views_by_country JSONB,
    views_by_city JSONB,
    views_by_device JSONB,
    views_by_hour JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.date,
        m.impressions,
        m.clicks,
        m.ctr,
        m.views_by_country,
        m.views_by_city,
        m.views_by_device,
        m.views_by_hour
    FROM ad_campaign_metrics m
    WHERE m.campaign_id = p_campaign_id
    AND m.date >= CURRENT_DATE - p_days
    ORDER BY m.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_campaign_daily_metrics TO authenticated;
