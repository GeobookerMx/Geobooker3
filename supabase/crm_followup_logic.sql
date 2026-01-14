-- =============================================
-- CRM Follow-up & Re-engagement Logic
-- =============================================

-- 1. Función para reiniciar el estado de contacto (Re-engagement)
-- Permite que contactos antiguos vuelvan a aparecer en la cola
DROP FUNCTION IF EXISTS reset_contact_status(TEXT, INTEGER, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION reset_contact_status(
    target_tier TEXT DEFAULT NULL,
    days_since_last_contact INTEGER DEFAULT 15,
    reset_email BOOLEAN DEFAULT TRUE,
    reset_whatsapp BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE crm_contacts
    SET 
        email_sent = CASE WHEN reset_email THEN FALSE ELSE email_sent END,
        wa_sent = CASE WHEN reset_whatsapp THEN FALSE ELSE wa_sent END,
        last_status_change = NOW(),
        follow_up_count = COALESCE(follow_up_count, 0) + 1
    WHERE 
        (target_tier IS NULL OR tier = target_tier)
        AND (
            (reset_email AND email_sent = TRUE AND email_sent_at < NOW() - (days_since_last_contact || ' days')::INTERVAL)
            OR 
            (reset_whatsapp AND wa_sent = TRUE AND wa_sent_at < NOW() - (days_since_last_contact || ' days')::INTERVAL)
        );

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- 2. Función para obtener contactos "calientes" (que no han sido contactados aún)
CREATE OR REPLACE VIEW crm_fresh_leads AS
SELECT * FROM crm_contacts
WHERE (email IS NOT NULL AND email != '' AND (email_sent IS NULL OR email_sent = FALSE))
   OR (phone IS NOT NULL AND phone != '' AND (wa_sent IS NULL OR wa_sent = FALSE))
ORDER BY tier, created_at DESC;

COMMENT ON FUNCTION reset_contact_status IS 'Reinicia el estado de email_sent/wa_sent para permitir re-contactar después de N días';
