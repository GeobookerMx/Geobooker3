-- ================================================================
-- FUNCIÓN RPC: Contar emails enviados HOY (hora México)
-- Ejecutar en Supabase SQL Editor
-- ================================================================

CREATE OR REPLACE FUNCTION count_emails_today_mexico()
RETURNS TABLE (count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM campaign_history
    WHERE campaign_type = 'email'
    AND DATE(sent_at AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Test la función
SELECT * FROM count_emails_today_mexico();

-- ✅ Esto debería devolver el número correcto de emails enviados HOY en hora México
