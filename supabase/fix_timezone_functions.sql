-- ================================================================
-- FIX: Funciones RPC con timezone México CORRECTO
-- CURRENT_DATE usa UTC, necesitamos fecha en timezone México
-- ================================================================

-- FIX 1: Email counter
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

-- FIX 2: WhatsApp total hoy
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

-- FIX 3: WhatsApp Nacional hoy
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

-- FIX 4: WhatsApp Global hoy
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

-- TEST de verificación
SELECT 
    'Fecha UTC' as tipo,
    CURRENT_DATE as fecha
UNION ALL
SELECT 
    'Fecha México' as tipo,
    (NOW() AT TIME ZONE 'America/Mexico_City')::DATE as fecha;

-- Probar funciones
SELECT 'Emails hoy:' as metrica, * FROM count_emails_today_mexico()
UNION ALL
SELECT 'WhatsApp hoy:', * FROM count_whatsapp_today_mexico()
UNION ALL
SELECT 'WA Nacional hoy:', * FROM count_whatsapp_national_today_mexico()
UNION ALL
SELECT 'WA Global hoy:', * FROM count_whatsapp_global_today_mexico();

-- ✅ Ahora las funciones usan la fecha CORRECTA de México
