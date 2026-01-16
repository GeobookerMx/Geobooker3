-- SQL REPARADOR: Restaura tablas de cola y funciones de generación
-- Ejecutar en Supabase SQL Editor para arreglar el envío de campañas

-- 1. Crear tabla email_queue si no existe
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES marketing_contacts(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    priority INTEGER DEFAULT 0,
    sent_at TIMESTAMP,
    message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_contact ON email_queue(contact_id);

-- 2. Crear tabla whatsapp_queue si no existe
CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES marketing_contacts(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    priority INTEGER DEFAULT 0,
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_queue(status);

-- 3. Restaurar Función: generate_daily_email_queue (VERSIÓN QUE INSERTA)
CREATE OR REPLACE FUNCTION generate_daily_email_queue(
    p_limit INTEGER DEFAULT 100,
    p_tier_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    contacts_added INTEGER,
    tier_distribution JSONB
) AS $$
DECLARE
    v_contacts_added INTEGER := 0;
    v_tier_counts JSONB;
BEGIN
    -- Limpiar registros viejos procesados
    DELETE FROM email_queue WHERE status = 'sent' AND created_at < NOW() - INTERVAL '7 days';

    -- Insertar contactos a la cola
    WITH selected_contacts AS (
        SELECT 
            id,
            tier,
            CASE tier
                WHEN 'AAA' THEN 1
                WHEN 'AA' THEN 2
                WHEN 'A' THEN 3
                WHEN 'B' THEN 4
                ELSE 5
            END as priority_val
        FROM marketing_contacts
        WHERE 
            is_active = TRUE
            AND email IS NOT NULL
            AND email_status = 'pending'
            AND (p_tier_filter IS NULL OR tier = p_tier_filter)
            -- Evitar duplicados en cola activa
            AND id NOT IN (SELECT contact_id FROM email_queue WHERE status = 'pending')
        ORDER BY priority_val ASC, created_at ASC
        LIMIT p_limit
    )
    INSERT INTO email_queue (contact_id, priority, status)
    SELECT id, priority_val, 'pending'
    FROM selected_contacts;

    -- Obtener conteo de los insertados
    GET DIAGNOSTICS v_contacts_added = ROW_COUNT;

    -- Obtener distribución
    SELECT jsonb_object_agg(tier, count) INTO v_tier_counts
    FROM (
        SELECT mc.tier, COUNT(*) as count
        FROM email_queue eq
        JOIN marketing_contacts mc ON eq.contact_id = mc.id
        WHERE eq.status = 'pending'
        GROUP BY mc.tier
    ) tier_summary;

    RETURN QUERY SELECT v_contacts_added, COALESCE(v_tier_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 4. Restaurar Función: generate_daily_whatsapp_queue
CREATE OR REPLACE FUNCTION generate_daily_whatsapp_queue(
    p_limit INTEGER DEFAULT 20,
    p_tier_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    contacts_added INTEGER,
    tier_distribution JSONB
) AS $$
DECLARE
    v_contacts_added INTEGER := 0;
    v_tier_counts JSONB;
BEGIN
    WITH selected_contacts AS (
        SELECT 
            id,
            tier,
            CASE tier
                WHEN 'AAA' THEN 1
                WHEN 'AA' THEN 2
                ELSE 3
            END as priority_val
        FROM marketing_contacts
        WHERE 
            is_active = TRUE
            AND phone IS NOT NULL
            AND (whatsapp_status = 'pending' OR whatsapp_status IS NULL)
            AND (p_tier_filter IS NULL OR tier = p_tier_filter)
            AND id NOT IN (SELECT contact_id FROM whatsapp_queue WHERE status = 'pending')
        ORDER BY priority_val ASC, created_at ASC
        LIMIT p_limit
    )
    INSERT INTO whatsapp_queue (contact_id, priority, status)
    SELECT id, priority_val, 'pending'
    FROM selected_contacts;

    GET DIAGNOSTICS v_contacts_added = ROW_COUNT;

    SELECT jsonb_object_agg(tier, count) INTO v_tier_counts
    FROM (
        SELECT mc.tier, COUNT(*) as count
        FROM whatsapp_queue wq
        JOIN marketing_contacts mc ON wq.contact_id = mc.id
        WHERE wq.status = 'pending'
        GROUP BY mc.tier
    ) tier_summary;

    RETURN QUERY SELECT v_contacts_added, COALESCE(v_tier_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ✅ SUCCESS! Sistema de Colas Restaurado.
