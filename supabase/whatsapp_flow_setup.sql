-- ==========================================================
-- WHATSAPP FLOW - SQL CONSOLIDADO
-- Ejecutar todo este archivo en Supabase SQL Editor
-- ==========================================================

-- 1. TABLA: whatsapp_queue
CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL,
    phone_number TEXT,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    FOREIGN KEY (contact_id) REFERENCES marketing_contacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_queue(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_contact ON whatsapp_queue(contact_id);

-- 2. COLUMNAS EN marketing_contacts (si no existen)
ALTER TABLE marketing_contacts 
ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'pending';

ALTER TABLE marketing_contacts 
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

-- 3. TABLA: campaign_history (para stats)
CREATE TABLE IF NOT EXISTS campaign_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID,
    campaign_type TEXT NOT NULL, -- 'email' o 'whatsapp'
    template_name TEXT,
    status TEXT DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    response_at TIMESTAMPTZ,
    converted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_campaign_history_type ON campaign_history(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaign_history_sent ON campaign_history(sent_at);

-- 4. FUNCIÓN: generate_daily_whatsapp_queue
DROP FUNCTION IF EXISTS generate_daily_whatsapp_queue(INTEGER, TEXT);

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
    -- Limpiar cola vieja (más de 24 horas pending)
    DELETE FROM whatsapp_queue 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '24 hours';

    -- Insertar contactos nuevos
    WITH ranked_contacts AS (
        SELECT 
            mc.id,
            mc.phone,
            mc.tier,
            CASE mc.tier
                WHEN 'AAA' THEN 4
                WHEN 'AA' THEN 3
                WHEN 'A' THEN 2
                ELSE 1
            END as priority
        FROM marketing_contacts mc
        WHERE 
            mc.phone IS NOT NULL
            AND mc.phone != ''
            AND (mc.whatsapp_status IS NULL OR mc.whatsapp_status = 'pending')
            AND (p_tier_filter IS NULL OR mc.tier = p_tier_filter)
            -- No debe estar ya en cola
            AND mc.id NOT IN (
                SELECT contact_id FROM whatsapp_queue 
                WHERE status = 'pending'
            )
        ORDER BY 
            priority DESC,
            RANDOM()
        LIMIT p_limit
    )
    INSERT INTO whatsapp_queue (contact_id, phone_number, priority, status)
    SELECT id, phone, priority, 'pending'
    FROM ranked_contacts;

    GET DIAGNOSTICS v_contacts_added = ROW_COUNT;

    -- Distribución por tier
    SELECT jsonb_object_agg(tier, count) INTO v_tier_counts
    FROM (
        SELECT mc.tier, COUNT(*) as count
        FROM whatsapp_queue wq
        JOIN marketing_contacts mc ON wq.contact_id = mc.id
        WHERE wq.status = 'pending'
        GROUP BY mc.tier
    ) tier_summary;

    RETURN QUERY SELECT 
        v_contacts_added,
        COALESCE(v_tier_counts, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN: mark_whatsapp_sent
DROP FUNCTION IF EXISTS mark_whatsapp_sent(UUID, UUID);

CREATE OR REPLACE FUNCTION mark_whatsapp_sent(
    p_contact_id UUID,
    p_queue_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Marcar cola como enviado
    UPDATE whatsapp_queue 
    SET status = 'sent', sent_at = NOW()
    WHERE id = p_queue_id;

    -- Actualizar contacto
    UPDATE marketing_contacts 
    SET whatsapp_status = 'sent', whatsapp_sent_at = NOW()
    WHERE id = p_contact_id;

    -- Registrar en historial
    INSERT INTO campaign_history (contact_id, campaign_type, status)
    VALUES (p_contact_id, 'whatsapp', 'sent');

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS POLICIES
ALTER TABLE whatsapp_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_history ENABLE ROW LEVEL SECURITY;

-- Políticas para admins
DROP POLICY IF EXISTS "Admin access whatsapp_queue" ON whatsapp_queue;
CREATE POLICY "Admin access whatsapp_queue" ON whatsapp_queue
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admin access campaign_history" ON campaign_history;
CREATE POLICY "Admin access campaign_history" ON campaign_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

-- 7. VERIFICACIÓN FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ WhatsApp Flow configurado correctamente';
    RAISE NOTICE '📊 Contactos con teléfono: %', 
        (SELECT COUNT(*) FROM marketing_contacts WHERE phone IS NOT NULL AND phone != '');
END $$;

-- ==========================================================
-- FIN DEL SCRIPT
-- Ahora puedes usar "Generar Cola" en el CRM
-- ==========================================================
