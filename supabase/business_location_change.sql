-- ==========================================================
-- BUSINESS LOCATION CHANGE FEATURE
-- Allows business owners to update their location (max 3/month)
-- ==========================================================

-- 1. Add tracking columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS location_changes_this_month INTEGER DEFAULT 0;

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS last_location_change TIMESTAMPTZ;

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS is_mobile_business BOOLEAN DEFAULT false;

-- 2. Add comments
COMMENT ON COLUMN businesses.location_changes_this_month IS 
'Number of location changes this month (resets monthly, max 3)';

COMMENT ON COLUMN businesses.last_location_change IS 
'Timestamp of last location change';

COMMENT ON COLUMN businesses.is_mobile_business IS 
'If true, shows mobile business badge on map';

-- 3. Function to check if user can change location
CREATE OR REPLACE FUNCTION can_change_business_location(p_business_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_changes INTEGER;
    v_last_change TIMESTAMPTZ;
    v_current_month DATE;
BEGIN
    SELECT location_changes_this_month, last_location_change
    INTO v_changes, v_last_change
    FROM businesses
    WHERE id = p_business_id;
    
    v_current_month := DATE_TRUNC('month', CURRENT_DATE);
    
    -- Reset if last change was in a previous month
    IF v_last_change IS NULL OR DATE_TRUNC('month', v_last_change) < v_current_month THEN
        v_changes := 0;
    END IF;
    
    RETURN jsonb_build_object(
        'can_change', v_changes < 3,
        'changes_used', v_changes,
        'changes_remaining', 3 - v_changes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to update business location
CREATE OR REPLACE FUNCTION update_business_location(
    p_business_id UUID,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_address TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_changes INTEGER;
    v_last_change TIMESTAMPTZ;
    v_current_month DATE;
BEGIN
    -- Check if user owns business
    IF NOT EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = p_business_id AND owner_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
    END IF;
    
    -- Get current change count
    SELECT location_changes_this_month, last_location_change
    INTO v_changes, v_last_change
    FROM businesses
    WHERE id = p_business_id;
    
    v_current_month := DATE_TRUNC('month', CURRENT_DATE);
    
    -- Reset if new month
    IF v_last_change IS NULL OR DATE_TRUNC('month', v_last_change) < v_current_month THEN
        v_changes := 0;
    END IF;
    
    -- Check limit
    IF v_changes >= 3 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Has alcanzado el límite de 3 cambios de ubicación este mes'
        );
    END IF;
    
    -- Update location
    UPDATE businesses
    SET 
        latitude = p_lat,
        longitude = p_lng,
        address = COALESCE(p_address, address),
        location_changes_this_month = v_changes + 1,
        last_location_change = NOW()
    WHERE id = p_business_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'changes_remaining', 2 - v_changes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Monthly reset job (run via Supabase cron or pg_cron)
-- This resets location_changes_this_month on first day of month
-- Configure in Supabase: Project Settings > Database > Cron Jobs
/*
SELECT cron.schedule(
    'reset-location-changes',
    '0 0 1 * *', -- First day of each month at midnight
    $$UPDATE businesses SET location_changes_this_month = 0$$
);
*/

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION can_change_business_location(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_business_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated;

-- 7. Verify
SELECT 'Business location change feature installed!' as status;
