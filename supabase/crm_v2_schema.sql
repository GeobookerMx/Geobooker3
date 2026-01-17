-- ==========================================================
-- SISTEMA CRM v2 - WhatsApp + Email Separados
-- Ejecutar en Supabase SQL Editor
-- ==========================================================

-- 1. AGREGAR COLUMNA SOURCE A MARKETING_CONTACTS
ALTER TABLE marketing_contacts 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv';

-- Actualizar contactos existentes según su origen
-- (Los que tienen tier son del CSV importado)
UPDATE marketing_contacts 
SET source = 'csv' 
WHERE source IS NULL;

-- 2. TABLA DE CONFIGURACIÓN DE CAMPAÑAS
DROP TABLE IF EXISTS campaign_config CASCADE;
CREATE TABLE campaign_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
    source TEXT NOT NULL CHECK (source IN ('csv', 'apify', 'google_places')),
    daily_limit INTEGER NOT NULL DEFAULT 10 CHECK (daily_limit >= 0 AND daily_limit <= 500),
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel, source)
);

-- Configuración inicial:
-- WhatsApp: 10 Nacional (Google Places GRATIS) + 10 Internacional (Apify $)
-- Email: 100 de CSV (reciclaje 15 días)
INSERT INTO campaign_config (channel, source, daily_limit, priority) VALUES
('whatsapp', 'csv', 0, 3),               -- CSV deshabilitado para WA (usamos scraping)
('whatsapp', 'google_places', 10, 2),    -- 10 NACIONALES/día (Google Places GRATIS)
('whatsapp', 'apify', 10, 1),            -- 10 INTERNACIONALES/día (Apify $)
('email', 'csv', 100, 2),                -- 100 de CSV para Email
('email', 'apify', 0, 1)                 -- 0 de Apify (Email solo con CSV)
ON CONFLICT (channel, source) DO UPDATE SET
    daily_limit = EXCLUDED.daily_limit,
    priority = EXCLUDED.priority;

-- 3. TABLA DE ESTADÍSTICAS DIARIAS
DROP TABLE IF EXISTS campaign_daily_stats CASCADE;
CREATE TABLE campaign_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stats_date DATE NOT NULL DEFAULT CURRENT_DATE,
    channel TEXT NOT NULL,
    source TEXT NOT NULL,
    sent INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    opened INTEGER DEFAULT 0,
    replied INTEGER DEFAULT 0,
    converted INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stats_date, channel, source)
);

CREATE INDEX idx_campaign_stats_date ON campaign_daily_stats(stats_date);
CREATE INDEX idx_campaign_stats_channel ON campaign_daily_stats(channel);

-- 4. ACTUALIZAR whatsapp_queue CON SOURCE
ALTER TABLE whatsapp_queue 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv';

-- 5. FUNCIÓN: GENERAR COLA WHATSAPP (10 Nacional Google Places + 10 Internacional Apify)
DROP FUNCTION IF EXISTS generate_whatsapp_queue_v2();

CREATE OR REPLACE FUNCTION generate_whatsapp_queue_v2()
RETURNS TABLE (
    total_added INTEGER,
    national_added INTEGER,
    international_added INTEGER
) AS $$
DECLARE
    v_gp_limit INTEGER;    -- Google Places (Nacional)
    v_apify_limit INTEGER; -- Apify (Internacional)
    v_gp_added INTEGER := 0;
    v_apify_added INTEGER := 0;
BEGIN
    -- Obtener límites de config
    SELECT daily_limit INTO v_gp_limit 
    FROM campaign_config 
    WHERE channel = 'whatsapp' AND source = 'google_places';
    
    SELECT daily_limit INTO v_apify_limit 
    FROM campaign_config 
    WHERE channel = 'whatsapp' AND source = 'apify';

    -- Default si no existe config
    v_gp_limit := COALESCE(v_gp_limit, 10);
    v_apify_limit := COALESCE(v_apify_limit, 10);

    -- Limpiar cola vieja (más de 24 horas pendiente)
    DELETE FROM whatsapp_queue 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '24 hours';

    -- 1. Insertar contactos NACIONALES (Google Places)
    WITH gp_contacts AS (
        SELECT id, phone, tier
        FROM marketing_contacts
        WHERE 
            source = 'google_places'
            AND phone IS NOT NULL AND phone != ''
            AND (whatsapp_status IS NULL OR whatsapp_status = 'pending')
            AND id NOT IN (SELECT contact_id FROM whatsapp_queue WHERE status = 'pending')
        ORDER BY 
            CASE tier WHEN 'AAA' THEN 1 WHEN 'AA' THEN 2 WHEN 'A' THEN 3 ELSE 4 END,
            RANDOM()
        LIMIT v_gp_limit
    )
    INSERT INTO whatsapp_queue (contact_id, phone_number, source, priority, status)
    SELECT id, phone, 'google_places', 
        CASE tier WHEN 'AAA' THEN 4 WHEN 'AA' THEN 3 WHEN 'A' THEN 2 ELSE 1 END,
        'pending'
    FROM gp_contacts;
    
    GET DIAGNOSTICS v_gp_added = ROW_COUNT;

    -- 2. Insertar contactos INTERNACIONALES (Apify)
    WITH apify_contacts AS (
        SELECT id, phone, tier
        FROM marketing_contacts
        WHERE 
            source = 'apify'
            AND phone IS NOT NULL AND phone != ''
            AND (whatsapp_status IS NULL OR whatsapp_status = 'pending')
            AND id NOT IN (SELECT contact_id FROM whatsapp_queue WHERE status = 'pending')
        ORDER BY RANDOM()
        LIMIT v_apify_limit
    )
    INSERT INTO whatsapp_queue (contact_id, phone_number, source, priority, status)
    SELECT id, phone, 'apify', 2, 'pending'
    FROM apify_contacts;
    
    GET DIAGNOSTICS v_apify_added = ROW_COUNT;

    RETURN QUERY SELECT 
        v_gp_added + v_apify_added,
        v_gp_added,
        v_apify_added;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCIÓN: GENERAR COLA EMAIL (Solo CSV, reciclaje 15 días)
DROP FUNCTION IF EXISTS generate_email_queue_v2();

CREATE OR REPLACE FUNCTION generate_email_queue_v2()
RETURNS TABLE (
    total_added INTEGER,
    recycled_from_wa INTEGER,
    fresh_contacts INTEGER
) AS $$
DECLARE
    v_limit INTEGER;
    v_recycled INTEGER := 0;
    v_fresh INTEGER := 0;
BEGIN
    -- Obtener límite
    SELECT daily_limit INTO v_limit 
    FROM campaign_config 
    WHERE channel = 'email' AND source = 'csv';

    -- Limpiar cola vieja
    DELETE FROM email_queue 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '7 days';

    -- Prioridad 1: Contactos con WhatsApp enviado hace 15+ días
    WITH recycled AS (
        SELECT id, tier
        FROM marketing_contacts
        WHERE 
            source = 'csv'
            AND email IS NOT NULL AND email != ''
            AND email_status != 'bounced'
            AND whatsapp_status = 'sent'
            AND whatsapp_sent_at < NOW() - INTERVAL '15 days'
            AND (email_status IS NULL OR email_status = 'pending'
                 OR (email_status = 'sent' AND last_email_sent < NOW() - INTERVAL '30 days'))
            AND id NOT IN (SELECT contact_id FROM email_queue WHERE status = 'pending')
        ORDER BY tier DESC
        LIMIT v_limit / 2  -- 50% reciclados
    )
    INSERT INTO email_queue (contact_id, priority, status)
    SELECT id, 
        CASE tier WHEN 'AAA' THEN 4 WHEN 'AA' THEN 3 WHEN 'A' THEN 2 ELSE 1 END,
        'pending'
    FROM recycled;
    
    GET DIAGNOSTICS v_recycled = ROW_COUNT;

    -- Prioridad 2: Contactos frescos (nunca contactados)
    WITH fresh AS (
        SELECT id, tier
        FROM marketing_contacts
        WHERE 
            source = 'csv'
            AND email IS NOT NULL AND email != ''
            AND email_status != 'bounced'
            AND (whatsapp_status IS NULL OR whatsapp_status = 'pending')
            AND (email_status IS NULL OR email_status = 'pending')
            AND id NOT IN (SELECT contact_id FROM email_queue WHERE status = 'pending')
        ORDER BY 
            CASE tier WHEN 'AAA' THEN 1 WHEN 'AA' THEN 2 WHEN 'A' THEN 3 ELSE 4 END,
            RANDOM()
        LIMIT v_limit - v_recycled
    )
    INSERT INTO email_queue (contact_id, priority, status)
    SELECT id, 
        CASE tier WHEN 'AAA' THEN 4 WHEN 'AA' THEN 3 WHEN 'A' THEN 2 ELSE 1 END,
        'pending'
    FROM fresh;
    
    GET DIAGNOSTICS v_fresh = ROW_COUNT;

    RETURN QUERY SELECT 
        v_recycled + v_fresh,
        v_recycled,
        v_fresh;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN: OBTENER ESTADÍSTICAS DEL DÍA
CREATE OR REPLACE FUNCTION get_daily_campaign_stats()
RETURNS TABLE (
    channel TEXT,
    source TEXT,
    daily_limit INTEGER,
    sent_today INTEGER,
    remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.channel,
        cc.source,
        cc.daily_limit,
        COALESCE(cds.sent, 0)::INTEGER as sent_today,
        (cc.daily_limit - COALESCE(cds.sent, 0))::INTEGER as remaining
    FROM campaign_config cc
    LEFT JOIN campaign_daily_stats cds 
        ON cc.channel = cds.channel 
        AND cc.source = cds.source 
        AND cds.stats_date = CURRENT_DATE
    WHERE cc.is_active = TRUE
    ORDER BY cc.channel, cc.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNCIÓN: REGISTRAR ENVÍO Y ACTUALIZAR STATS
CREATE OR REPLACE FUNCTION register_campaign_send(
    p_channel TEXT,
    p_source TEXT,
    p_contact_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Actualizar o insertar estadísticas del día
    INSERT INTO campaign_daily_stats (stats_date, channel, source, sent)
    VALUES (CURRENT_DATE, p_channel, p_source, 1)
    ON CONFLICT (stats_date, channel, source) 
    DO UPDATE SET sent = campaign_daily_stats.sent + 1;

    -- Actualizar estado del contacto
    IF p_channel = 'whatsapp' THEN
        UPDATE marketing_contacts 
        SET whatsapp_status = 'sent', whatsapp_sent_at = NOW()
        WHERE id = p_contact_id;
    ELSE
        UPDATE marketing_contacts 
        SET email_status = 'sent', last_email_sent = NOW()
        WHERE id = p_contact_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RLS POLICIES
ALTER TABLE campaign_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access campaign_config" ON campaign_config;
CREATE POLICY "Admin access campaign_config" ON campaign_config
    FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admin access campaign_daily_stats" ON campaign_daily_stats;
CREATE POLICY "Admin access campaign_daily_stats" ON campaign_daily_stats
    FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- 10. FUNCIÓN: SINCRONIZAR scan_leads → marketing_contacts
CREATE OR REPLACE FUNCTION sync_scan_leads_to_marketing()
RETURNS TABLE (
    synced INTEGER,
    skipped INTEGER
) AS $$
DECLARE
    v_synced INTEGER := 0;
    v_skipped INTEGER := 0;
BEGIN
    -- Insertar leads con teléfono que no existan en marketing_contacts
    WITH new_contacts AS (
        SELECT DISTINCT ON (slc.normalized_value)
            sl.name AS company_name,
            NULL::TEXT AS contact_name,
            slc.normalized_value AS phone,
            NULL::TEXT AS email,
            sl.category AS category,
            'B' AS tier,
            sl.address AS city,
            'google_places' AS source,
            CONCAT('Google Maps: ', COALESCE(sl.google_maps_url, '')) AS notes
        FROM scan_leads sl
        JOIN scan_lead_contacts slc ON slc.lead_id = sl.id
        WHERE 
            slc.type = 'phone'
            AND slc.normalized_value IS NOT NULL
            AND slc.normalized_value != ''
            AND sl.status IN ('new', 'contacted')
            AND NOT EXISTS (
                SELECT 1 FROM marketing_contacts mc 
                WHERE mc.phone = slc.normalized_value
            )
    )
    INSERT INTO marketing_contacts (
        company_name, contact_name, phone, email, 
        category, tier, city, source, notes
    )
    SELECT * FROM new_contacts;
    
    GET DIAGNOSTICS v_synced = ROW_COUNT;

    -- Contar cuántos ya existían (skipped)
    SELECT COUNT(*) INTO v_skipped
    FROM scan_lead_contacts slc
    WHERE slc.type = 'phone'
    AND EXISTS (
        SELECT 1 FROM marketing_contacts mc 
        WHERE mc.phone = slc.normalized_value
    );

    RETURN QUERY SELECT v_synced, v_skipped;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. FUNCIÓN: SINCRONIZAR scraping_history (Apify) → marketing_contacts
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
    -- Insertar leads de scraping_history que no existan en marketing_contacts
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
            CONCAT(
                'Apify Scraping | ',
                sh.search_query, ' @ ', sh.search_location,
                CASE WHEN sh.website IS NOT NULL THEN ' | Web: ' || sh.website ELSE '' END
            ) AS notes
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

    -- Contar cuántos tienen email (para futuras campañas de email)
    SELECT COUNT(*) INTO v_with_email
    FROM marketing_contacts 
    WHERE source = 'apify' 
    AND email IS NOT NULL 
    AND email != '';

    -- Contar cuántos ya existían (skipped)
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

-- 13. VERIFICACIÓN FINAL
DO $$
DECLARE
    v_gp_count INTEGER;
    v_apify_count INTEGER;
    v_csv_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_gp_count FROM marketing_contacts WHERE source = 'google_places';
    SELECT COUNT(*) INTO v_apify_count FROM marketing_contacts WHERE source = 'apify';
    SELECT COUNT(*) INTO v_csv_count FROM marketing_contacts WHERE source = 'csv';
    
    RAISE NOTICE '✅ Sistema CRM v2 configurado correctamente';
    RAISE NOTICE '📱 WhatsApp: 10 Nacional (Google Places) + 10 Internacional (Apify) = 20/día';
    RAISE NOTICE '📧 Email: 100 CSV/día (reciclaje 15 días)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Contactos por fuente:';
    RAISE NOTICE '   🇲🇽 Google Places (Nacional): %', v_gp_count;
    RAISE NOTICE '   🌍 Apify (Internacional): %', v_apify_count;
    RAISE NOTICE '   📁 CSV (Email): %', v_csv_count;
    RAISE NOTICE '';
    RAISE NOTICE '💡 Para sincronizar leads:';
    RAISE NOTICE '   Nacional: SELECT * FROM sync_scan_leads_to_marketing();';
    RAISE NOTICE '   Internacional: SELECT * FROM sync_apify_leads_to_marketing();';
END $$;

-- ==========================================================
-- FIN - Ahora ejecutar y verificar en el frontend
-- ==========================================================
