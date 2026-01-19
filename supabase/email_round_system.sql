-- Sistema de Rondas de Email con Templates Diferenciados
-- Intervalo: 30 días entre rondas
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. AGREGAR COLUMNA email_round a email_queue
-- ============================================
ALTER TABLE email_queue 
ADD COLUMN IF NOT EXISTS email_round INTEGER DEFAULT 1;

COMMENT ON COLUMN email_queue.email_round IS 'Ronda del email: 1=Invitación, 2=Seguimiento, 3+=Re-engagement';

-- ============================================
-- 2. AGREGAR COLUMNA template_type a email_templates
-- ============================================
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS template_type TEXT;

COMMENT ON COLUMN email_templates.template_type IS 'Tipo de template: invitation, followup, reengagement';

-- ============================================
-- 3. ACTUALIZAR FUNCIÓN generate_daily_email_queue
-- ============================================
-- PRIMERO: Eliminar función existente para cambiar tipo de retorno
DROP FUNCTION IF EXISTS generate_daily_email_queue(INTEGER, TEXT);

CREATE OR REPLACE FUNCTION generate_daily_email_queue(
    p_limit INTEGER DEFAULT 100,
    p_tier_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    contacts_added INTEGER,
    tier_distribution JSONB,
    round_distribution JSONB
) AS $$
DECLARE
    v_contacts_added INTEGER := 0;
    v_tier_counts JSONB;
    v_round_counts JSONB;
BEGIN
    -- Limpiar cola anterior (solo contactos pendientes viejos > 7 días)
    DELETE FROM email_queue 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '7 days';

    -- Insertar contactos a la cola con información de ronda
    WITH ranked_contacts AS (
        SELECT 
            mc.id,
            mc.tier,
            mc.email_sent_count,
            -- Determinar la ronda basada en emails previos
            CASE 
                WHEN mc.email_sent_count = 0 THEN 1  -- 1ra: Invitación inicial
                WHEN mc.email_sent_count = 1 THEN 2  -- 2da: Seguimiento
                ELSE 3                               -- 3ra+: Re-engagement
            END as email_round,
            ROW_NUMBER() OVER (
                PARTITION BY mc.tier 
                ORDER BY 
                    -- Prioridad: nuevos primero, luego seguimientos
                    mc.email_sent_count ASC,
                    CASE mc.tier
                        WHEN 'AAA' THEN 1
                        WHEN 'AA' THEN 2
                        WHEN 'A' THEN 3
                        WHEN 'B' THEN 4
                    END,
                    RANDOM()
            ) as tier_rank
        FROM marketing_contacts mc
        WHERE 
            mc.is_active = TRUE
            AND mc.email IS NOT NULL
            AND COALESCE(mc.email_status, 'pending') != 'bounced'
            AND COALESCE(mc.email_status, 'pending') != 'unsubscribed'
            AND (
                -- RONDA 1: Nunca enviado
                (mc.email_status IS NULL OR mc.email_status = 'pending' OR mc.email_sent_count = 0)
                OR
                -- RONDA 2+: Enviado hace más de 30 días (re-engagement)
                (mc.email_status = 'sent' AND mc.last_email_sent < NOW() - INTERVAL '30 days')
            )
            AND (p_tier_filter IS NULL OR mc.tier = p_tier_filter)
            -- No debe estar ya en cola pendiente
            AND mc.id NOT IN (
                SELECT contact_id 
                FROM email_queue 
                WHERE status = 'pending'
            )
    ),
    limited_contacts AS (
        SELECT 
            id,
            tier,
            email_round,
            CASE tier
                WHEN 'AAA' THEN 4
                WHEN 'AA' THEN 3
                WHEN 'A' THEN 2
                WHEN 'B' THEN 1
            END as priority
        FROM ranked_contacts
        ORDER BY 
            -- Primero los de ronda 1 (nuevos)
            email_round ASC,
            CASE tier
                WHEN 'AAA' THEN 1
                WHEN 'AA' THEN 2
                WHEN 'A' THEN 3
                WHEN 'B' THEN 4
            END,
            tier_rank
        LIMIT p_limit
    )
    INSERT INTO email_queue (contact_id, priority, status, email_round)
    SELECT 
        id,
        priority,
        'pending',
        email_round
    FROM limited_contacts;

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

    -- Obtener distribución por ronda  
    SELECT jsonb_object_agg(round_name, count) INTO v_round_counts
    FROM (
        SELECT 
            CASE eq.email_round
                WHEN 1 THEN 'invitacion_inicial'
                WHEN 2 THEN 'seguimiento'
                ELSE 're_engagement'
            END as round_name,
            COUNT(*) as count
        FROM email_queue eq
        WHERE eq.status = 'pending'
        GROUP BY eq.email_round
    ) round_summary;

    RETURN QUERY SELECT 
        v_contacts_added,
        COALESCE(v_tier_counts, '{}'::jsonb),
        COALESCE(v_round_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. FUNCIÓN AUXILIAR: Obtener Template por Ronda
-- ============================================
CREATE OR REPLACE FUNCTION get_email_template_by_round(p_round INTEGER)
RETURNS TEXT AS $$
BEGIN
    CASE p_round
        WHEN 1 THEN
            -- Ronda 1: Invitación inicial
            RETURN 'invitation';
        WHEN 2 THEN
            -- Ronda 2: Seguimiento
            RETURN 'followup';
        ELSE
            -- Ronda 3+: Re-engagement
            RETURN 'reengagement';
    END CASE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_email_template_by_round IS 'Retorna el tipo de template según la ronda: invitation, followup, reengagement';

-- ============================================
-- 4. VERIFICAR CAMBIOS
-- ============================================
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'email_queue' AND column_name = 'email_round';

-- Probar la función:
-- SELECT * FROM generate_daily_email_queue(10);
