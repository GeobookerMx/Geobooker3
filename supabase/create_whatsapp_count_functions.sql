-- ================================================================
-- FUNCIONES RPC: Contar WhatsApp con timezone México
-- Fix para sincronización de contadores nacional y global
-- ================================================================

-- FUNCIÓN 1: WhatsApp Total HOY (todos los mensajes)
CREATE OR REPLACE FUNCTION count_whatsapp_today_mexico()
RETURNS TABLE (count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM unified_whatsapp_outreach
    WHERE DATE(sent_at AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- FUNCIÓN 2: WhatsApp Nacional HOY (source = 'scan_invite')
CREATE OR REPLACE FUNCTION count_whatsapp_national_today_mexico()
RETURNS TABLE (count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM unified_whatsapp_outreach
    WHERE source = 'scan_invite'
    AND DATE(sent_at AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- FUNCIÓN 3: WhatsApp Global HOY (source = 'apify')
CREATE OR REPLACE FUNCTION count_whatsapp_global_today_mexico()
RETURNS TABLE (count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM unified_whatsapp_outreach
    WHERE source = 'apify'
    AND DATE(sent_at AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- TEST de las funciones
SELECT * FROM count_whatsapp_today_mexico();
SELECT * FROM count_whatsapp_national_today_mexico();
SELECT * FROM count_whatsapp_global_today_mexico();

-- ✅ Ahora los contadores respetarán la hora de México
