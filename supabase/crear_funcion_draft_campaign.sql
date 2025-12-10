-- Función RPC para crear campañas en borrador
-- Ejecutar en Supabase SQL Editor

-- Primero eliminar la función si existe
DROP FUNCTION IF EXISTS create_draft_campaign(uuid, text, text, text, text, jsonb, numeric, text, text, text, text, text, text, uuid, uuid);

-- Crear la función actualizada
CREATE OR REPLACE FUNCTION create_draft_campaign(
    p_space_id uuid,
    p_advertiser_name text,
    p_advertiser_email text,
    p_geographic_scope text,
    p_target_location text,
    p_audience_targeting jsonb,
    p_budget numeric,
    p_creative_title text,
    p_creative_description text,
    p_creative_url text,
    p_creative_cta text,
    p_creative_image text,
    p_target_country text DEFAULT NULL,
    p_target_region uuid DEFAULT NULL,
    p_target_city uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_id uuid;
    v_user_id uuid;
BEGIN
    -- Obtener el usuario actual (puede ser null para usuarios no autenticados)
    v_user_id := auth.uid();

    -- Insertar la campaña
    INSERT INTO ad_campaigns (
        space_id,
        advertiser_id,
        advertiser_name,
        advertiser_email,
        geographic_scope,
        target_location,
        audience_targeting,
        budget,
        creative_title,
        creative_description,
        creative_url,
        creative_cta,
        creative_image,
        target_country,
        target_region,
        target_city,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_space_id,
        v_user_id,
        p_advertiser_name,
        p_advertiser_email,
        p_geographic_scope,
        p_target_location,
        p_audience_targeting,
        p_budget,
        p_creative_title,
        p_creative_description,
        p_creative_url,
        p_creative_cta,
        p_creative_image,
        p_target_country,
        p_target_region,
        p_target_city,
        'draft',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_campaign_id;

    RETURN v_campaign_id;
END;
$$;

-- Dar permisos a usuarios autenticados y anónimos
GRANT EXECUTE ON FUNCTION create_draft_campaign TO authenticated;
GRANT EXECUTE ON FUNCTION create_draft_campaign TO anon;

-- Verificar que la función se creó correctamente
SELECT proname, pronargs FROM pg_proc WHERE proname = 'create_draft_campaign';
