-- Ejecutar este SQL completo en Supabase SQL Editor
-- Sincroniza leads de Apify a marketing_contacts

CREATE OR REPLACE FUNCTION sync_apify_leads_to_marketing()
RETURNS TABLE (
    synced INTEGER,
    skipped INTEGER,
    with_email INTEGER
) AS $$
DECLARE
    v_synced INTEGER := 0;
    v_skipped INTEGER := 0;
    v_with_email INTEGER := 0;
BEGIN
    WITH new_contacts AS (
        SELECT DISTINCT ON (sh.phone)
            sh.name AS company_name,
            NULL::TEXT AS contact_name,
            sh.phone AS phone,
            sh.email AS email,
            sh.category AS category,
            COALESCE(sh.tier, 'B') AS tier,
            sh.city AS city,
            'apify' AS source,
            CONCAT('Apify: ', sh.search_query, ' @ ', sh.search_location) AS notes
        FROM scraping_history sh
        WHERE 
            sh.phone IS NOT NULL
            AND sh.phone != ''
            AND sh.source = 'apify'
            AND NOT EXISTS (
                SELECT 1 FROM marketing_contacts mc 
                WHERE mc.phone = sh.phone
            )
    )
    INSERT INTO marketing_contacts (
        company_name, contact_name, phone, email, 
        category, tier, city, source, notes
    )
    SELECT * FROM new_contacts;
    
    GET DIAGNOSTICS v_synced = ROW_COUNT;

    SELECT COUNT(*) INTO v_with_email
    FROM marketing_contacts 
    WHERE source = 'apify' 
    AND email IS NOT NULL 
    AND email != '';

    SELECT COUNT(*) INTO v_skipped
    FROM scraping_history sh
    WHERE sh.phone IS NOT NULL
    AND sh.source = 'apify'
    AND EXISTS (
        SELECT 1 FROM marketing_contacts mc 
        WHERE mc.phone = sh.phone
    );

    RETURN QUERY SELECT v_synced, v_skipped, v_with_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
