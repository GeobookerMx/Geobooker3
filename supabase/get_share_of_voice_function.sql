-- supabase/get_share_of_voice_function.sql
-- Function to calculate Share of Voice for a campaign

CREATE OR REPLACE FUNCTION get_share_of_voice(p_campaign_id UUID)
RETURNS TABLE(
    share_of_voice_percent DECIMAL,
    my_impressions BIGINT,
    category_total_impressions BIGINT,
    my_rank INTEGER,
    total_competitors INTEGER,
    category_name TEXT
) AS $$
DECLARE
    v_category TEXT;
    v_my_impressions BIGINT;
    v_total_category_impressions BIGINT;
    v_my_rank INTEGER;
    v_total_competitors INTEGER;
BEGIN
    -- Get campaign category and impressions
    SELECT 
        COALESCE(category_code, 'general') as cat,
        COALESCE(impressions, 0) as imp
    INTO v_category, v_my_impressions
    FROM ad_campaigns
    WHERE id = p_campaign_id;

    -- Get total impressions in this category (only active campaigns)
    SELECT COALESCE(SUM(impressions), 1) 
    INTO v_total_category_impressions
    FROM ad_campaigns
    WHERE (category_code = v_category OR (category_code IS NULL AND v_category = 'general'))
      AND status IN ('active', 'completed')
      AND impressions > 0;

    -- Get rank (1st, 2nd, 3rd...)
    SELECT COUNT(*) + 1
    INTO v_my_rank
    FROM ad_campaigns
    WHERE (category_code = v_category OR (category_code IS NULL AND v_category = 'general'))
      AND status IN ('active', 'completed')
      AND impressions > v_my_impressions;

    -- Get total competitors in category
    SELECT COUNT(*)
    INTO v_total_competitors
    FROM ad_campaigns
    WHERE (category_code = v_category OR (category_code IS NULL AND v_category = 'general'))
      AND status IN ('active', 'completed')
      AND impressions > 0;

    -- Return calculated values
    RETURN QUERY SELECT
        ROUND((v_my_impressions::DECIMAL / NULLIF(v_total_category_impressions, 0)) * 100, 2) as share_of_voice_percent,
        v_my_impressions,
        v_total_category_impressions,
        v_my_rank,
        v_total_competitors,
        v_category;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_share_of_voice('your-campaign-id-here');
