-- Sistema Unificado de WhatsApp para Admin
-- Tabla global que centraliza TODOS los envíos de WhatsApp
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- TABLA UNIFICADA DE WHATSAPP
-- ============================================

CREATE TABLE IF NOT EXISTS unified_whatsapp_outreach (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Información del contacto
    phone TEXT NOT NULL,
    normalized_phone TEXT NOT NULL,
    contact_name TEXT,
    company_name TEXT,
    
    -- Origen del contacto
    source TEXT NOT NULL CHECK (source IN ('scan_invite', 'apify', 'crm_queue', 'manual')),
    source_id UUID, -- ID del lead/contacto original
    
    -- Mensaje
    message_sent TEXT,
    message_language TEXT DEFAULT 'es' CHECK (message_language IN ('es', 'en')),
    
    -- Estado
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    
    -- Engagement
    response_text TEXT,
    converted BOOLEAN DEFAULT FALSE,
    conversion_value DECIMAL(10,2),
    
    -- Metadata
    sent_by_user_id UUID REFERENCES auth.users(id),
    country_code TEXT,
    timezone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_normalized_phone 
ON unified_whatsapp_outreach(normalized_phone);

-- Índice para queries de fecha (sin WHERE clause por inmutabilidad)
CREATE INDEX IF NOT EXISTS idx_whatsapp_sent_at 
ON unified_whatsapp_outreach(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_source 
ON unified_whatsapp_outreach(source);

CREATE INDEX IF NOT EXISTS idx_whatsapp_status 
ON unified_whatsapp_outreach(status);

-- Unique constraint: no enviar 2 veces al mismo número
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_unique_phone 
ON unified_whatsapp_outreach(normalized_phone);

-- ============================================
-- FUNCIONES DE UTILIDAD
-- ============================================

-- Función: Obtener count de envíos hoy
CREATE OR REPLACE FUNCTION get_whatsapp_sent_today()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM unified_whatsapp_outreach
        WHERE sent_at >= CURRENT_DATE
        AND status != 'failed'
    );
END;
$$ LANGUAGE plpgsql;

-- Función: Verificar si un teléfono ya fue contactado
CREATE OR REPLACE FUNCTION is_phone_already_contacted(p_phone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    normalized TEXT;
BEGIN
    -- Normalizar teléfono
    normalized := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');
    
    -- Agregar +52 si es México (10 dígitos)
    IF LENGTH(normalized) = 10 THEN
        normalized := '+52' || normalized;
    ELSIF NOT normalized LIKE '+%' THEN
        normalized := '+' || normalized;
    END IF;
    
    -- Buscar en tabla
    RETURN EXISTS (
        SELECT 1
        FROM unified_whatsapp_outreach
        WHERE normalized_phone = normalized
    );
END;
$$ LANGUAGE plpgsql;

-- Función: Registrar envío de WhatsApp
CREATE OR REPLACE FUNCTION register_whatsapp_sent(
    p_phone TEXT,
    p_contact_name TEXT,
    p_company_name TEXT,
    p_source TEXT,
    p_message TEXT,
    p_language TEXT DEFAULT 'es',
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    normalized TEXT;
    new_id UUID;
BEGIN
    -- Normalizar teléfono
    normalized := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');
    IF LENGTH(normalized) = 10 THEN
        normalized := '+52' || normalized;
    ELSIF NOT normalized LIKE '+%' THEN
        normalized := '+' || normalized;
    END IF;
    
    -- Insertar registro
    INSERT INTO unified_whatsapp_outreach (
        phone,
        normalized_phone,
        contact_name,
        company_name,
        source,
        message_sent,
        message_language,
        status,
        sent_at,
        sent_by_user_id
    ) VALUES (
        p_phone,
        normalized,
        p_contact_name,
        p_company_name,
        p_source,
        p_message,
        p_language,
        'sent',
        NOW(),
        COALESCE(p_user_id, auth.uid())
    )
    ON CONFLICT (normalized_phone) DO UPDATE SET
        updated_at = NOW()
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTAS PARA MÉTRICAS
-- ============================================

-- Vista: Métricas diarias de WhatsApp
CREATE OR REPLACE VIEW whatsapp_daily_metrics AS
SELECT 
    DATE(sent_at) as date,
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
WHERE sent_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(sent_at), source
ORDER BY date DESC;

-- Vista: Métricas por fuente
CREATE OR REPLACE VIEW whatsapp_source_metrics AS
SELECT 
    source,
    COUNT(*) as total_sent,
    COUNT(DISTINCT DATE(sent_at)) as days_active,
    COUNT(*) FILTER (WHERE status = 'replied') as total_replies,
    COUNT(*) FILTER (WHERE converted = TRUE) as total_conversions,
    ROUND(AVG(
        CASE WHEN replied_at IS NOT NULL AND sent_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (replied_at - sent_at)) / 3600 
        END
    ), 2) as avg_response_time_hours,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'replied')::numeric / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as response_rate
FROM unified_whatsapp_outreach
GROUP BY source
ORDER BY total_sent DESC;

-- Vista: Contactos hot (respondieron)
CREATE OR REPLACE VIEW whatsapp_hot_leads AS
SELECT 
    *
FROM unified_whatsapp_outreach
WHERE status IN ('replied', 'read')
AND converted = FALSE
ORDER BY 
    CASE status 
        WHEN 'replied' THEN 1
        WHEN 'read' THEN 2
    END,
    replied_at DESC NULLS LAST,
    read_at DESC NULLS LAST;

-- ============================================
-- CONFIGURACIÓN INICIAL
-- ============================================

-- Insertar configuración de WhatsApp en crm_settings si no existe
INSERT INTO crm_settings (setting_key, setting_value, description)
VALUES (
    'whatsapp_business',
    jsonb_build_object(
        'phone', '525526702368',
        'display_number', '+52 55 2670 2368',
        'daily_limit', 20,
        'default_message_es', 'Hola, soy Juan Pablo de Geobooker...',
        'default_message_en', 'Hi, I am Juan Pablo from Geobooker...'
    ),
    'WhatsApp Business configuration'
)
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- QUERY DE TESTING
-- ============================================

-- Ver envíos de hoy
SELECT 
    source,
    COUNT(*) as sent_today,
    20 - COUNT(*) as remaining_today
FROM unified_whatsapp_outreach
WHERE sent_at >= CURRENT_DATE
GROUP BY source;

-- Ver métricas generales
SELECT * FROM whatsapp_source_metrics;
