-- ========================================
-- ACTUALIZAR FUNCIÓN create_draft_campaign
-- Para soportar segmentación por Región y Ciudad
-- ========================================

-- PASO 1: Eliminar función anterior
DROP FUNCTION IF EXISTS create_draft_campaign(
    UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT
);

-- PASO 2: Crear nueva función con parámetros adicionales
CREATE OR REPLACE FUNCTION create_draft_campaign(
    p_space_id UUID,
    p_advertiser_name TEXT,
    p_advertiser_email TEXT,
    p_geographic_scope TEXT,
    p_target_location TEXT,
    p_audience_targeting JSONB,
    p_budget NUMERIC,
    p_creative_title TEXT,
    p_creative_description TEXT,
    p_creative_url TEXT,
    p_creative_cta TEXT,
    p_creative_image TEXT,
    p_target_country TEXT DEFAULT NULL,      -- NUEVO (al final)
    p_target_region UUID DEFAULT NULL,       -- NUEVO (al final)
    p_target_city UUID DEFAULT NULL          -- NUEVO (al final)
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_campaign_id UUID;
BEGIN
    -- Insertar nueva campaña en estado draft
    INSERT INTO ad_campaigns (
        ad_space_id,
        advertiser_name,
        advertiser_email,
        status,
        geographic_scope,
        target_location,
        target_country,         -- NUEVO
        target_region,          -- NUEVO
        target_city,            -- NUEVO
        audience_targeting,
        budget,
        start_date,
        end_date,
        creative_title,
        creative_description,
        creative_url,
        creative_cta,
        creative_image
    )
    VALUES (
        p_space_id,
        p_advertiser_name,
        p_advertiser_email,
        'pending_payment',
        p_geographic_scope,
        p_target_location,
        p_target_country,       -- NUEVO
        p_target_region,        -- NUEVO
        p_target_city,          -- NUEVO
        p_audience_targeting,
        p_budget,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        p_creative_title,
        p_creative_description,
        p_creative_url,
        p_creative_cta,
        p_creative_image
    )
    RETURNING id INTO v_campaign_id;

    RETURN v_campaign_id;
END;
$$;

-- PASO 3: Verificar que la función se creó correctamente
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'create_draft_campaign';

-- Deberías ver: create_draft_campaign | 15
-- (15 parámetros en total)

-- ========================================
-- ✅ LISTO!
-- ========================================
-- La función ahora acepta:
-- - p_target_country (TEXT)
-- - p_target_region (UUID)
-- - p_target_city (UUID)
--
-- El wizard ya está preparado para enviar estos datos.
-- ========================================
