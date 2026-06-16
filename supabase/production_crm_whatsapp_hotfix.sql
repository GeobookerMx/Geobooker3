-- ==========================================================
-- GEOBOOKER - HOTFIX DE PRODUCCION CRM + WHATSAPP
-- Fecha: 2026-06-16
-- Objetivo:
-- 1. Unificar limites de WhatsApp nacional/global
-- 2. Sincronizar campaign_config <-> campaign_daily_stats
-- 3. Corregir timezone a America/Mexico_City
-- 4. Mantener compatibilidad con unified_whatsapp_outreach
-- 5. Evitar DROP de tablas con datos reales
-- ==========================================================

-- ----------------------------------------------------------
-- 1. MARKETING_CONTACTS: asegurar columna source
-- ----------------------------------------------------------
ALTER TABLE marketing_contacts
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv';

UPDATE marketing_contacts
SET source = 'csv'
WHERE source IS NULL OR source = '';

-- ----------------------------------------------------------
-- 2. WHATSAPP_QUEUE: asegurar columna source
-- ----------------------------------------------------------
ALTER TABLE whatsapp_queue
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv';

-- ----------------------------------------------------------
-- 3. CAMPAIGN_CONFIG: tabla de limites por canal/fuente
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
    source TEXT NOT NULL CHECK (source IN ('csv', 'apify', 'google_places')),
    daily_limit INTEGER NOT NULL DEFAULT 10 CHECK (daily_limit >= 0 AND daily_limit <= 500),
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel, source)
);

INSERT INTO campaign_config (channel, source, daily_limit, priority, is_active) VALUES
('whatsapp', 'csv', 0, 3, TRUE),
('whatsapp', 'google_places', 10, 2, TRUE),
('whatsapp', 'apify', 10, 1, TRUE),
('email', 'csv', 100, 2, TRUE),
('email', 'apify', 0, 1, TRUE)
ON CONFLICT (channel, source) DO UPDATE SET
    daily_limit = EXCLUDED.daily_limit,
    priority = EXCLUDED.priority,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_campaign_config_channel_source
ON campaign_config(channel, source);

-- ----------------------------------------------------------
-- 4. CAMPAIGN_DAILY_STATS: tabla unificada de contadores diarios
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stats_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Mexico_City')::DATE,
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

ALTER TABLE campaign_daily_stats
ALTER COLUMN stats_date SET DEFAULT (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;

CREATE INDEX IF NOT EXISTS idx_campaign_daily_stats_date
ON campaign_daily_stats(stats_date);

CREATE INDEX IF NOT EXISTS idx_campaign_daily_stats_channel_source
ON campaign_daily_stats(channel, source);

-- ----------------------------------------------------------
-- 5. WHATSAPP BUSINESS SETTINGS
-- ----------------------------------------------------------
INSERT INTO crm_settings (setting_key, setting_value, description)
VALUES (
    'whatsapp_business',
    jsonb_build_object(
        'phone', '525526702368',
        'display_number', '+52 55 2670 2368',
        'daily_limit', 20,
        'limit_scan_invite', 10,
        'limit_apify', 10,
        'default_message_es', 'Hola, te contacto de Geobooker para mostrarte como ganar visibilidad local.',
        'default_message_en', 'Hi, I am reaching out from Geobooker to show how your business can gain visibility.'
    ),
    'WhatsApp Business configuration'
)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- ----------------------------------------------------------
-- 6. GENERADOR DE COLA WHATSAPP V2
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_whatsapp_queue_v2()
RETURNS TABLE (
    total_added INTEGER,
    national_added INTEGER,
    international_added INTEGER
)
AS $$
DECLARE
    v_gp_limit INTEGER := 10;
    v_apify_limit INTEGER := 10;
    v_gp_added INTEGER := 0;
    v_apify_added INTEGER := 0;
BEGIN
    SELECT daily_limit INTO v_gp_limit
    FROM campaign_config
    WHERE channel = 'whatsapp' AND source = 'google_places' AND is_active = TRUE;

    SELECT daily_limit INTO v_apify_limit
    FROM campaign_config
    WHERE channel = 'whatsapp' AND source = 'apify' AND is_active = TRUE;

    v_gp_limit := COALESCE(v_gp_limit, 10);
    v_apify_limit := COALESCE(v_apify_limit, 10);

    DELETE FROM whatsapp_queue
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '24 hours';

    WITH gp_contacts AS (
        SELECT id, phone, tier
        FROM marketing_contacts
        WHERE source = 'google_places'
          AND phone IS NOT NULL
          AND phone != ''
          AND (whatsapp_status IS NULL OR whatsapp_status = 'pending')
          AND id NOT IN (
              SELECT contact_id FROM whatsapp_queue WHERE status = 'pending'
          )
        ORDER BY
            CASE tier WHEN 'AAA' THEN 1 WHEN 'AA' THEN 2 WHEN 'A' THEN 3 ELSE 4 END,
            RANDOM()
        LIMIT v_gp_limit
    )
    INSERT INTO whatsapp_queue (contact_id, phone_number, source, priority, status)
    SELECT
        id,
        phone,
        'google_places',
        CASE tier WHEN 'AAA' THEN 4 WHEN 'AA' THEN 3 WHEN 'A' THEN 2 ELSE 1 END,
        'pending'
    FROM gp_contacts;

    GET DIAGNOSTICS v_gp_added = ROW_COUNT;

    WITH apify_contacts AS (
        SELECT id, phone, tier
        FROM marketing_contacts
        WHERE source = 'apify'
          AND phone IS NOT NULL
          AND phone != ''
          AND (whatsapp_status IS NULL OR whatsapp_status = 'pending')
          AND id NOT IN (
              SELECT contact_id FROM whatsapp_queue WHERE status = 'pending'
          )
        ORDER BY RANDOM()
        LIMIT v_apify_limit
    )
    INSERT INTO whatsapp_queue (contact_id, phone_number, source, priority, status)
    SELECT id, phone, 'apify', 2, 'pending'
    FROM apify_contacts;

    GET DIAGNOSTICS v_apify_added = ROW_COUNT;

    RETURN QUERY
    SELECT
        v_gp_added + v_apify_added,
        v_gp_added,
        v_apify_added;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------
-- 7. ESTADISTICAS DIARIAS DE CAMPAÑA (timezone MX)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_daily_campaign_stats()
RETURNS TABLE (
    channel TEXT,
    source TEXT,
    daily_limit INTEGER,
    sent_today INTEGER,
    remaining INTEGER
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.channel,
        cc.source,
        cc.daily_limit,
        COALESCE(cds.sent, 0)::INTEGER AS sent_today,
        GREATEST(cc.daily_limit - COALESCE(cds.sent, 0), 0)::INTEGER AS remaining
    FROM campaign_config cc
    LEFT JOIN campaign_daily_stats cds
        ON cc.channel = cds.channel
       AND cc.source = cds.source
       AND cds.stats_date = (NOW() AT TIME ZONE 'America/Mexico_City')::DATE
    WHERE cc.is_active = TRUE
    ORDER BY cc.channel, cc.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------
-- 8. REGISTRO DE ENVIO CON NORMALIZACION DE FUENTES
-- scan_invite -> google_places
-- crm_queue   -> csv
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION register_campaign_send(
    p_channel TEXT,
    p_source TEXT,
    p_contact_id UUID
)
RETURNS BOOLEAN
AS $$
DECLARE
    v_today_mx DATE;
    v_stats_source TEXT;
BEGIN
    v_today_mx := (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;
    v_stats_source := CASE
        WHEN p_source = 'scan_invite' THEN 'google_places'
        WHEN p_source = 'crm_queue' THEN 'csv'
        ELSE p_source
    END;

    INSERT INTO campaign_daily_stats (stats_date, channel, source, sent)
    VALUES (v_today_mx, p_channel, v_stats_source, 1)
    ON CONFLICT (stats_date, channel, source)
    DO UPDATE SET sent = campaign_daily_stats.sent + 1;

    IF p_channel = 'whatsapp' THEN
        UPDATE marketing_contacts
        SET whatsapp_status = 'sent',
            whatsapp_sent_at = NOW()
        WHERE id = p_contact_id;
    ELSE
        UPDATE marketing_contacts
        SET email_status = 'sent',
            last_email_sent = NOW()
        WHERE id = p_contact_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------
-- 9. CONTADORES WHATSAPP DESDE TABLA UNIFICADA (timezone MX)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION count_whatsapp_today_mexico()
RETURNS TABLE (count BIGINT)
AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM unified_whatsapp_outreach
    WHERE DATE(sent_at AT TIME ZONE 'America/Mexico_City') =
          (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION count_whatsapp_national_today_mexico()
RETURNS TABLE (count BIGINT)
AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM unified_whatsapp_outreach
    WHERE source = 'scan_invite'
      AND DATE(sent_at AT TIME ZONE 'America/Mexico_City') =
          (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION count_whatsapp_global_today_mexico()
RETURNS TABLE (count BIGINT)
AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM unified_whatsapp_outreach
    WHERE source = 'apify'
      AND DATE(sent_at AT TIME ZONE 'America/Mexico_City') =
          (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------
-- 10. SINCRONIZADORES DE LEADS
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_scan_leads_to_marketing()
RETURNS TABLE (
    synced INTEGER,
    skipped INTEGER
)
AS $$
DECLARE
    v_synced INTEGER := 0;
    v_skipped INTEGER := 0;
BEGIN
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
        WHERE slc.type = 'phone'
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

CREATE OR REPLACE FUNCTION sync_apify_leads_to_marketing()
RETURNS TABLE (
    synced INTEGER,
    skipped INTEGER,
    with_email INTEGER
)
AS $$
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
            CONCAT(
                'Apify Scraping | ',
                sh.search_query, ' @ ', sh.search_location,
                CASE WHEN sh.website IS NOT NULL THEN ' | Web: ' || sh.website ELSE '' END
            ) AS notes
        FROM scraping_history sh
        WHERE sh.phone IS NOT NULL
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

-- ----------------------------------------------------------
-- 11. VERIFICACION FINAL
-- ----------------------------------------------------------
SELECT 'campaign_config' AS check_name, COUNT(*)::TEXT AS result
FROM campaign_config
UNION ALL
SELECT 'campaign_daily_stats', COUNT(*)::TEXT
FROM campaign_daily_stats
UNION ALL
SELECT 'marketing_contacts_google_places', COUNT(*)::TEXT
FROM marketing_contacts WHERE source = 'google_places'
UNION ALL
SELECT 'marketing_contacts_apify', COUNT(*)::TEXT
FROM marketing_contacts WHERE source = 'apify';
