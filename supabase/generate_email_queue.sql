-- Función SQL para generar cola diaria de emails automáticamente
-- Ejecutar: SELECT generate_daily_email_queue();

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
    -- Limpiar cola anterior (opcional, solo contactos pendientes viejos)
    DELETE FROM email_queue 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '7 days';

    -- Insertar contactos a la cola priorizando por tier
    WITH ranked_contacts AS (
        SELECT 
            id,
            tier,
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
            AND email IS NOT NULL
            AND email_status != 'bounced'
            AND (
                -- No enviado aún
                email_status = 'pending'
                OR email_status IS NULL
                OR
                -- O enviado hace más de 30 días (re-engagement)
                (email_status = 'sent' AND last_email_sent < NOW() - INTERVAL '30 days')
            )
            AND (p_tier_filter IS NULL OR tier = p_tier_filter)
            -- No debe estar ya en cola
            AND id NOT IN (
                SELECT contact_id 
                FROM email_queue 
                WHERE status = 'pending'
            )
    ),
    limited_contacts AS (
        SELECT 
            id,
            tier,
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
    INSERT INTO email_queue (contact_id, priority, status)
    SELECT 
        id,
        priority,
        'pending'
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
        FROM email_queue eq
        JOIN marketing_contacts mc ON eq.contact_id = mc.id
        WHERE eq.status = 'pending'
        GROUP BY mc.tier
    ) tier_summary;

    RETURN QUERY SELECT 
        v_contacts_added,
        COALESCE(v_tier_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Ejemplo de uso:
-- SELECT * FROM generate_daily_email_queue(100);  -- 100 contactos
-- SELECT * FROM generate_daily_email_queue(50, 'AAA');  -- 50 contactos tier AAA solo
