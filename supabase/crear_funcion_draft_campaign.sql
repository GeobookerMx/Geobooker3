-- Función RPC CORREGIDA para crear campañas en borrador
-- Ejecutar en Supabase SQL Editor
-- Esta versión coincide con la estructura real de la tabla ad_campaigns

-- Primero eliminar TODAS las versiones de la función
DROP FUNCTION IF EXISTS create_draft_campaign(uuid, text, text, text, text, jsonb, numeric, text, text, text, text, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS create_draft_campaign(uuid, text, text, text, text, jsonb, numeric, text, text, text, text, text);

-- Ver la estructura actual de la tabla ad_campaigns
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'ad_campaigns';

-- Crear la función que coincide con la estructura de la tabla
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
    v_creative_id uuid;
BEGIN
    -- Insertar la campaña en ad_campaigns
    -- Nota: start_date y end_date se establecen a 30 días por defecto
    INSERT INTO ad_campaigns (
        ad_space_id,
        advertiser_name,
        advertiser_email,
        geographic_scope,
        target_location,
        budget,
        status,
        start_date,
        end_date,
        created_at,
        updated_at
    ) VALUES (
        p_space_id,
        p_advertiser_name,
        p_advertiser_email,
        COALESCE(p_geographic_scope, 'country'),
        p_target_location,
        p_budget,
        'pending_review',  -- Estado inicial: pendiente de revisión
        CURRENT_DATE,      -- Fecha inicio: hoy
        CURRENT_DATE + INTERVAL '30 days',  -- Fecha fin: 30 días después
        NOW(),
        NOW()
    )
    RETURNING id INTO v_campaign_id;

    -- Insertar el creative asociado en ad_creatives
    INSERT INTO ad_creatives (
        campaign_id,
        title,
        description,
        image_url,
        cta_text,
        cta_url,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_campaign_id,
        p_creative_title,
        p_creative_description,
        p_creative_image,
        COALESCE(p_creative_cta, 'Ver más'),
        p_creative_url,
        true,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_creative_id;

    RETURN v_campaign_id;
END;
$$;

-- Dar permisos a usuarios autenticados y anónimos
GRANT EXECUTE ON FUNCTION create_draft_campaign TO authenticated;
GRANT EXECUTE ON FUNCTION create_draft_campaign TO anon;

-- También necesitamos permitir INSERT en las tablas para la función SECURITY DEFINER
-- Verificar que la función se creó correctamente
SELECT proname, pronargs FROM pg_proc WHERE proname = 'create_draft_campaign';

-- Actualizar el CHECK constraint del status para incluir 'pending_review' y 'draft'
ALTER TABLE ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_status_check;
ALTER TABLE ad_campaigns ADD CONSTRAINT ad_campaigns_status_check 
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'pending_review', 'draft', 'rejected'));
