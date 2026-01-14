-- ============================================
-- Sistema de Distribución Inteligente de Emails
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Vista de estadísticas por tipo de empresa
CREATE OR REPLACE VIEW crm_company_type_stats AS
SELECT 
    COALESCE(company_type, 'Sin Tipo') as company_type,
    COUNT(*) as total_contacts,
    COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') as with_email,
    COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as with_phone,
    COUNT(*) FILTER (WHERE email_sent = TRUE) as emails_sent,
    COUNT(*) FILTER (WHERE wa_sent = TRUE) as whatsapp_sent,
    COUNT(*) FILTER (WHERE tier = 'AAA') as tier_aaa,
    COUNT(*) FILTER (WHERE tier = 'AA') as tier_aa,
    COUNT(*) FILTER (WHERE tier = 'A') as tier_a,
    COUNT(*) FILTER (WHERE tier = 'B') as tier_b,
    ROUND(
        COUNT(*) FILTER (WHERE email_sent = TRUE)::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE email IS NOT NULL), 0) * 100, 1
    ) as email_coverage_pct
FROM crm_contacts
GROUP BY company_type
ORDER BY total_contacts DESC;

-- 2. Vista de estadísticas por tier
CREATE OR REPLACE VIEW crm_tier_stats AS
SELECT 
    tier,
    COUNT(*) as total_contacts,
    COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') as with_email,
    COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as with_phone,
    COUNT(*) FILTER (WHERE email_sent = TRUE) as emails_sent,
    COUNT(*) FILTER (WHERE wa_sent = TRUE) as whatsapp_sent,
    COUNT(*) FILTER (WHERE email_sent = FALSE OR email_sent IS NULL) as pending_email,
    COUNT(*) FILTER (WHERE wa_sent = FALSE OR wa_sent IS NULL) as pending_whatsapp
FROM crm_contacts
GROUP BY tier
ORDER BY 
    CASE tier 
        WHEN 'AAA' THEN 1 
        WHEN 'AA' THEN 2 
        WHEN 'A' THEN 3 
        ELSE 4 
    END;

-- 3. Función para generar cola de emails distribuida por tipo
CREATE OR REPLACE FUNCTION generate_email_queue(
    daily_limit INTEGER DEFAULT 200,
    min_per_type INTEGER DEFAULT 5,
    target_tier TEXT DEFAULT NULL
)
RETURNS TABLE (
    contact_id UUID,
    contact_name TEXT,
    contact_email TEXT,
    company_name TEXT,
    company_type_name TEXT,
    contact_tier TEXT,
    contact_position TEXT,
    scheduled_order INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    type_count INTEGER;
    per_type INTEGER;
BEGIN
    -- Contar tipos de empresa con contactos pendientes que tienen email
    SELECT COUNT(DISTINCT COALESCE(ct.company_type, 'Sin Tipo')) INTO type_count
    FROM crm_contacts ct
    WHERE ct.email IS NOT NULL 
      AND ct.email != ''
      AND (ct.email_sent IS NULL OR ct.email_sent = FALSE);
    
    -- Calcular cuántos por tipo (mínimo min_per_type)
    IF type_count > 0 THEN
        per_type := GREATEST(min_per_type, CEIL(daily_limit::NUMERIC / type_count));
    ELSE
        per_type := min_per_type;
    END IF;
    
    -- Retornar contactos distribuidos equitativamente
    RETURN QUERY
    WITH ranked AS (
        SELECT 
            c.id,
            c.name,
            c.email,
            c.company,
            COALESCE(c.company_type, 'Sin Tipo') as ctype,
            c.tier,
            c.position,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(c.company_type, 'Sin Tipo')
                ORDER BY 
                    -- Priorizar por tier: AAA > AA > A > B
                    CASE c.tier 
                        WHEN 'AAA' THEN 1 
                        WHEN 'AA' THEN 2 
                        WHEN 'A' THEN 3 
                        ELSE 4 
                    END,
                    -- Luego por fecha de creación (más antiguos primero)
                    c.created_at
            ) as rn
        FROM crm_contacts c
        WHERE c.email IS NOT NULL 
          AND c.email != ''
          AND (c.email_sent IS NULL OR c.email_sent = FALSE)
          AND (target_tier IS NULL OR c.tier = target_tier)
    )
    SELECT 
        r.id,
        r.name,
        r.email,
        r.company,
        r.ctype,
        r.tier,
        r.position,
        ROW_NUMBER() OVER (ORDER BY r.ctype, r.rn)::INTEGER as scheduled_order
    FROM ranked r
    WHERE r.rn <= per_type
    ORDER BY scheduled_order
    LIMIT daily_limit;
END;
$$;

-- 4. Función para generar cola de WhatsApp por tier
CREATE OR REPLACE FUNCTION generate_whatsapp_queue(
    daily_limit INTEGER DEFAULT 50,
    target_tier TEXT DEFAULT NULL -- NULL = todos, o 'AAA', 'AA', 'A', 'B'
)
RETURNS TABLE (
    contact_id UUID,
    contact_name TEXT,
    contact_phone TEXT,
    company_name TEXT,
    company_type_name TEXT,
    contact_tier TEXT,
    contact_position TEXT,
    suggested_template TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.phone,
        c.company,
        COALESCE(c.company_type, 'Sin Tipo'),
        c.tier,
        c.position,
        -- Sugerir template según tier
        CASE c.tier
            WHEN 'AAA' THEN 'alianza_estrategica'
            WHEN 'AA' THEN 'propuesta_publicidad'
            WHEN 'A' THEN 'referencia_empresa'
            ELSE 'awareness_general'
        END as suggested_template
    FROM crm_contacts c
    WHERE c.phone IS NOT NULL 
      AND c.phone != ''
      AND (c.wa_sent IS NULL OR c.wa_sent = FALSE)
      AND (target_tier IS NULL OR c.tier = target_tier)
    ORDER BY 
        CASE c.tier 
            WHEN 'AAA' THEN 1 
            WHEN 'AA' THEN 2 
            WHEN 'A' THEN 3 
            ELSE 4 
        END,
        c.created_at
    LIMIT daily_limit;
END;
$$;

-- 5. Función para marcar emails como enviados (batch)
CREATE OR REPLACE FUNCTION mark_emails_sent(
    contact_ids UUID[],
    template_name TEXT DEFAULT 'default'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE crm_contacts
    SET 
        email_sent = TRUE,
        email_sent_at = NOW(),
        email_template = template_name,
        contact_count = COALESCE(contact_count, 0) + 1,
        last_contacted_at = NOW()
    WHERE id = ANY(contact_ids);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- 6. Función para marcar WhatsApp como enviados
CREATE OR REPLACE FUNCTION mark_whatsapp_sent(
    contact_ids UUID[],
    template_name TEXT DEFAULT 'default'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE crm_contacts
    SET 
        wa_sent = TRUE,
        wa_sent_at = NOW(),
        wa_template = template_name,
        contact_count = COALESCE(contact_count, 0) + 1,
        last_contacted_at = NOW()
    WHERE id = ANY(contact_ids);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- 7. Vista resumen del día
CREATE OR REPLACE VIEW crm_daily_summary AS
SELECT 
    'Hoy' as periodo,
    COUNT(*) FILTER (WHERE email_sent_at::DATE = CURRENT_DATE) as emails_hoy,
    COUNT(*) FILTER (WHERE wa_sent_at::DATE = CURRENT_DATE) as whatsapp_hoy,
    COUNT(*) FILTER (WHERE email_sent = FALSE OR email_sent IS NULL) as emails_pendientes,
    COUNT(*) FILTER (WHERE wa_sent = FALSE OR wa_sent IS NULL) as whatsapp_pendientes,
    COUNT(DISTINCT company_type) as tipos_empresa
FROM crm_contacts;

-- Comentarios
COMMENT ON FUNCTION generate_email_queue IS 'Genera cola de emails distribuida equitativamente por tipo de empresa';
COMMENT ON FUNCTION generate_whatsapp_queue IS 'Genera cola de WhatsApp priorizada por tier';
COMMENT ON VIEW crm_company_type_stats IS 'Estadísticas de contactos por tipo de empresa';
COMMENT ON VIEW crm_tier_stats IS 'Estadísticas de contactos por tier (AAA, AA, A, B)';

-- Test: Ver distribución actual
SELECT '=== ESTADÍSTICAS POR TIPO DE EMPRESA ===' as info;
SELECT * FROM crm_company_type_stats LIMIT 15;

SELECT '=== ESTADÍSTICAS POR TIER ===' as info;
SELECT * FROM crm_tier_stats;

SELECT '=== EJEMPLO: Cola de 100 emails (10 por tipo) ===' as info;
SELECT * FROM generate_email_queue(100, 10) LIMIT 20;

SELECT '=== EJEMPLO: Cola de 30 WhatsApp tier AAA/AA ===' as info;
SELECT * FROM generate_whatsapp_queue(30, 'AA') LIMIT 10;

SELECT 'Sistema de distribución inteligente creado exitosamente' as status;
