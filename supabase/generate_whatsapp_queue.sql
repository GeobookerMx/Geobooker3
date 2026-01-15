-- Función SQL para generar cola diaria de WhatsApp
-- Ejecutar: SELECT generate_daily_whatsapp_queue();

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
    -- Limpiar cola anterior (solo pendientes viejos)
    DELETE FROM whatsapp_queue 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '7 days';

    -- Insertar contactos a la cola priorizando por tier
    WITH ranked_contacts AS (
        SELECT 
            id,
            tier,
            phone,
            ROW_NUMBER() OVER (
                PARTITION BY tier 
                ORDER BY 
                    CASE tier
                        WHEN 'AAA' THEN 1
                        WHEN 'AA' THEN 2
                        WHEN 'A' THEN 3
                        WHEN 'B' THEN 4
                    END,
                    RANDOM()
            ) as tier_rank
        FROM marketing_contacts
        WHERE 
            is_active = TRUE
            AND phone IS NOT NULL
            AND LENGTH(phone) BETWEEN 10 AND 15
            AND (
                -- No enviado por WhatsApp aún
                whatsapp_status = 'pending'
                OR whatsapp_status IS NULL
                OR
                -- O enviado hace más de 60 días (re-engagement)
                (whatsapp_status = 'sent' AND last_whatsapp_sent < NOW() - INTERVAL '60 days')
            )
            AND (p_tier_filter IS NULL OR tier = p_tier_filter)
            -- No debe estar ya en cola
            AND id NOT IN (
                SELECT contact_id 
                FROM whatsapp_queue 
                WHERE status = 'pending'
            )
    ),
    limited_contacts AS (
        SELECT 
            id,
            tier,
            phone,
            CASE tier
                WHEN 'AAA' THEN 4
                WHEN 'AA' THEN 3
                WHEN 'A' THEN 2
                WHEN 'B' THEN 1
            END as priority
        FROM ranked_contacts
        ORDER BY 
            CASE tier
                WHEN 'AAA' THEN 1
                WHEN 'AA' THEN 2
                WHEN 'A' THEN 3
                WHEN 'B' THEN 4
            END,
            tier_rank
        LIMIT p_limit
    )
    INSERT INTO whatsapp_queue (contact_id, priority, status, phone_number)
    SELECT 
        id,
        priority,
        'pending',
        phone
    FROM limited_contacts
    RETURNING 1 INTO v_contacts_added;

    -- Obtener conteo
    GET DIAGNOSTICS v_contacts_added = ROW_COUNT;

    -- Obtener distribución por tier
    SELECT jsonb_object_agg(tier, count) INTO v_tier_counts
    FROM (
        SELECT 
            mc.tier,
            COUNT(*) as count
        FROM whatsapp_queue wq
        JOIN marketing_contacts mc ON wq.contact_id = mc.id
        WHERE wq.status = 'pending'
        GROUP BY mc.tier
    ) tier_summary;

    RETURN QUERY SELECT 
        v_contacts_added,
        COALESCE(v_tier_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Función para marcar contacto como enviado por WhatsApp
CREATE OR REPLACE FUNCTION mark_whatsapp_sent(
    p_contact_id UUID,
    p_queue_id UUID
)
RETURNS void AS $$
BEGIN
    -- Actualizar cola
    UPDATE whatsapp_queue
    SET 
        status = 'sent',
        sent_at = NOW()
    WHERE id = p_queue_id;

    -- Actualizar contacto
    UPDATE marketing_contacts
    SET 
        whatsapp_status = 'sent',
        last_whatsapp_sent = NOW()
    WHERE id = p_contact_id;

    -- Registrar en historial
    INSERT INTO campaign_history (
        contact_id,
        campaign_type,
        status,
        sent_at
    ) VALUES (
        p_contact_id,
        'whatsapp',
        'sent',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Ejemplo de uso:
-- SELECT * FROM generate_daily_whatsapp_queue(20);  -- 20 contactos
-- SELECT * FROM generate_daily_whatsapp_queue(10, 'AAA');  -- 10 contactos tier AAA
