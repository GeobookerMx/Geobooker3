-- ================================================================
-- GEÓBOOKER: MASTER FIX - SINCRONIZACIÓN DE KPIs (TIMEZONE MÉXICO)
-- Corrige el desfase de 6 horas (UTC vs CDMX) en todos los módulos
-- ================================================================

-- 1. CORREGIR DEFAULT EN TABLA DE ESTADÍSTICAS DIARIAS
ALTER TABLE campaign_daily_stats 
ALTER COLUMN stats_date SET DEFAULT (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;

-- 2. RE-SURECCIÓN DE FUNCIONES RPC CON LÓGICA DE TIEMPO CORRECTA

-- RPC: Email counter Hoy
CREATE OR REPLACE FUNCTION count_emails_today_mexico()
RETURNS TABLE (count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM campaign_history
    WHERE campaign_type = 'email'
    AND DATE(sent_at AT TIME ZONE 'America/Mexico_City') = 
        (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;
END;
$$ LANGUAGE plpgsql;

-- RPC: WhatsApp Total Hoy
CREATE OR REPLACE FUNCTION count_whatsapp_today_mexico()
RETURNS TABLE (count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM unified_whatsapp_outreach
    WHERE DATE(sent_at AT TIME ZONE 'America/Mexico_City') = 
        (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;
END;
$$ LANGUAGE plpgsql;

-- RPC: WhatsApp Nacional Hoy (Scan & Invite)
CREATE OR REPLACE FUNCTION count_whatsapp_national_today_mexico()
RETURNS TABLE (count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM unified_whatsapp_outreach
    WHERE source = 'scan_invite'
    AND DATE(sent_at AT TIME ZONE 'America/Mexico_City') = 
        (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;
END;
$$ LANGUAGE plpgsql;

-- RPC: WhatsApp Global Hoy (Apify)
CREATE OR REPLACE FUNCTION count_whatsapp_global_today_mexico()
RETURNS TABLE (count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM unified_whatsapp_outreach
    WHERE source = 'apify'
    AND DATE(sent_at AT TIME ZONE 'America/Mexico_City') = 
        (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;
END;
$$ LANGUAGE plpgsql;

-- RPC: Estadísticas Combinadas de Campaña (Corrige desincronización de CRM v2)
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
        AND cds.stats_date = (NOW() AT TIME ZONE 'America/Mexico_City')::DATE
    WHERE cc.is_active = TRUE
    ORDER BY cc.channel, cc.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- RPC: Registrar envío de campaña (Corrige desfase de 6pm)
CREATE OR REPLACE FUNCTION register_campaign_send(
    p_channel TEXT,
    p_source TEXT,
    p_contact_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_today_mx DATE;
BEGIN
    v_today_mx := (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;

    -- Actualizar o insertar estadísticas del día usando fecha MX
    INSERT INTO campaign_daily_stats (stats_date, channel, source, sent)
    VALUES (v_today_mx, p_channel, p_source, 1)
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

-- 3. CORREGIR MÉTRICAS DE ANUNCIOS (GEÓBOOKER ADS)

-- RPC: Registrar impresión de anuncio
CREATE OR REPLACE FUNCTION record_ad_impression(
    p_campaign_id UUID,
    p_country TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_device TEXT DEFAULT 'unknown'
) RETURNS VOID AS $$
DECLARE
    v_today DATE;
BEGIN
    v_today := (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;

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

-- RPC: Registrar click de anuncio
CREATE OR REPLACE FUNCTION record_ad_click(p_campaign_id UUID) RETURNS VOID AS $$
DECLARE
    v_today DATE;
BEGIN
    v_today := (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;

    INSERT INTO ad_campaign_metrics (campaign_id, date, clicks)
    VALUES (p_campaign_id, v_today, 1)
    ON CONFLICT (campaign_id, date) DO UPDATE SET
        clicks = ad_campaign_metrics.clicks + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. VISTAS ACTUALIZADAS CON TIMEZONE MX

-- Vista: Métricas de Email Unificadas
DROP VIEW IF EXISTS email_metrics_summary CASCADE;
CREATE OR REPLACE VIEW email_metrics_summary AS
SELECT 
    DATE(timestamp AT TIME ZONE 'America/Mexico_City') as date,
    COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
    COUNT(*) FILTER (WHERE event_type = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE event_type = 'opened') as opened,
    COUNT(*) FILTER (WHERE event_type = 'clicked') as clicked,
    COUNT(*) FILTER (WHERE event_type = 'bounced') as bounced,
    COUNT(*) FILTER (WHERE event_type = 'complained') as complained,
    
    -- Tasas calculadas
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'delivered')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'sent'), 0) * 100, 
        2
    ) as delivery_rate,
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'opened')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'delivered'), 0) * 100, 
        2
    ) as open_rate,
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'clicked')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'opened'), 0) * 100, 
        2
    ) as click_rate,
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'bounced')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'sent'), 0) * 100, 
        2
    ) as bounce_rate
FROM email_analytics
WHERE timestamp >= (NOW() AT TIME ZONE 'America/Mexico_City' - INTERVAL '30 days')
GROUP BY DATE(timestamp AT TIME ZONE 'America/Mexico_City')
ORDER BY date DESC;

-- Vista: Métricas Diarias de WhatsApp (Corrección de DATE)
DROP VIEW IF EXISTS whatsapp_daily_metrics CASCADE;
CREATE OR REPLACE VIEW whatsapp_daily_metrics AS
SELECT 
    DATE(sent_at AT TIME ZONE 'America/Mexico_City') as date,
    source,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE status = 'read') as read,
    COUNT(*) FILTER (WHERE status = 'replied') as replied,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE converted = TRUE) as conversions,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'replied')::numeric / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as response_rate,
    ROUND(
        COUNT(*) FILTER (WHERE converted = TRUE)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as conversion_rate
FROM unified_whatsapp_outreach
WHERE sent_at >= (NOW() AT TIME ZONE 'America/Mexico_City' - INTERVAL '30 days')
GROUP BY DATE(sent_at AT TIME ZONE 'America/Mexico_City'), source
ORDER BY date DESC;

-- 5. CORREGIR VISTAS DE INTENCIÓN DE NEGOCIO Y ANALYTICS

-- Vista: Intención diaria por negocio
DROP VIEW IF EXISTS kpi_business_intent_daily CASCADE;
CREATE OR REPLACE VIEW kpi_business_intent_daily AS
SELECT
    business_id,
    business_name,
    DATE_TRUNC('day', created_at AT TIME ZONE 'America/Mexico_City') AS day,
    COUNT(*) FILTER (WHERE event_name = 'open_directions') AS directions,
    COUNT(*) FILTER (WHERE event_name = 'tap_call') AS calls,
    COUNT(*) FILTER (WHERE event_name = 'tap_whatsapp') AS whatsapp,
    COUNT(*) FILTER (WHERE event_name = 'share_business') AS shares,
    COUNT(*) FILTER (WHERE event_name = 'save_favorite') AS favorites,
    COUNT(*) AS total_intents,
    COUNT(DISTINCT device_id) AS unique_users
FROM business_intent_logs
GROUP BY business_id, business_name, day;

-- Vista: Resumen de intención global
DROP VIEW IF EXISTS kpi_intent_summary CASCADE;
CREATE OR REPLACE VIEW kpi_intent_summary AS
SELECT
    DATE_TRUNC('day', created_at AT TIME ZONE 'America/Mexico_City') AS day,
    event_name,
    COUNT(*) AS total,
    COUNT(DISTINCT device_id) AS unique_users,
    COUNT(DISTINCT business_id) AS businesses_impacted
FROM business_intent_logs
WHERE created_at >= (NOW() AT TIME ZONE 'America/Mexico_City' - INTERVAL '30 days')
GROUP BY day, event_name
ORDER BY day DESC, total DESC;

-- Vista: KPI de campañas (Sincronizada con ad_campaign_metrics)
DROP VIEW IF EXISTS kpi_campaign_daily CASCADE;
CREATE OR REPLACE VIEW kpi_campaign_daily AS
SELECT
    campaign_id,
    date,
    impressions,
    clicks,
    CASE 
        WHEN impressions > 0 THEN ROUND((clicks::DECIMAL / impressions) * 100, 2)
        ELSE 0
    END AS ctr_percent
FROM ad_campaign_metrics
WHERE date >= (NOW() AT TIME ZONE 'America/Mexico_City')::DATE - INTERVAL '90 days'
ORDER BY date DESC;

-- 6. FUNCIONES DE TENDENCIAS (GEOGRÁFICAS Y ACTIVIDAD)

-- RPC: Tendencia global de Ads (Gráfica de AdsManagement)
CREATE OR REPLACE FUNCTION get_global_ad_activity_trend(p_days INTEGER DEFAULT 7)
RETURNS TABLE (date DATE, impressions BIGINT, clicks BIGINT)
LANGUAGE SQL SECURITY DEFINER AS $$
    WITH date_series AS (
        SELECT generate_series(
            (NOW() AT TIME ZONE 'America/Mexico_City')::DATE - (p_days - 1) * INTERVAL '1 day', 
            (NOW() AT TIME ZONE 'America/Mexico_City')::DATE, 
            '1 day'::INTERVAL
        )::DATE as d
    )
    SELECT ds.d as date, COALESCE(SUM(m.impressions), 0)::BIGINT as impressions, COALESCE(SUM(m.clicks), 0)::BIGINT as clicks
    FROM date_series ds 
    LEFT JOIN ad_campaign_metrics m ON ds.d = m.date 
    GROUP BY ds.d 
    ORDER BY ds.d;
$$;

-- RPC: Analytics de Países (Sincronizado)
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
    v_start_date TIMESTAMPTZ;
BEGIN
    v_start_date := NOW() AT TIME ZONE 'America/Mexico_City' - (p_days || ' days')::INTERVAL;

    SELECT COUNT(*) INTO total_views
    FROM page_analytics
    WHERE created_at >= v_start_date;
    
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
        WHERE created_at >= v_start_date
        GROUP BY country
    ) sa ON pa.country = sa.c
    WHERE pa.created_at >= v_start_date
    GROUP BY pa.country, pa.country_code, sa.searches
    ORDER BY page_views DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TEST DE VERIFICACIÓN FINAL
SELECT 
    'UTC/Supabase' as zona, NOW()::TIMESTAMP as hora, CURRENT_DATE as fecha
UNION ALL
SELECT 
    'Ciudad de México', NOW() AT TIME ZONE 'America/Mexico_City', (NOW() AT TIME ZONE 'America/Mexico_City')::DATE;

-- ✅ Sincronización Total Completada: CRM, Ads, Intent, Analytics y Geo.




