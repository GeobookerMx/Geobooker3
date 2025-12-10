-- Script COMPLETO para arreglar todos los problemas de Supabase
-- Ejecutar TODO en Supabase SQL Editor en ORDEN

-- =====================================================
-- PARTE 1: ARREGLAR RLS de user_profiles (error 406)
-- =====================================================

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Public read for basic profile info" ON user_profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "profile_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "profile_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "profile_update_policy" ON user_profiles;

-- Crear políticas correctas
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow insert for authenticated users"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- =====================================================
-- PARTE 2: ARREGLAR STATUS CHECK de ad_campaigns
-- =====================================================

ALTER TABLE ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_status_check;
ALTER TABLE ad_campaigns ADD CONSTRAINT ad_campaigns_status_check 
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'pending_review', 'draft', 'rejected'));

-- =====================================================
-- PARTE 3: CREAR/ACTUALIZAR FUNCIÓN create_draft_campaign
-- =====================================================

-- Eliminar versiones anteriores
DROP FUNCTION IF EXISTS create_draft_campaign(uuid, text, text, text, text, jsonb, numeric, text, text, text, text, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS create_draft_campaign(uuid, text, text, text, text, jsonb, numeric, text, text, text, text, text);

-- Crear función actualizada
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
BEGIN
    -- Insertar campaña
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
        'pending_review',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_campaign_id;

    -- Insertar creative
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
    );

    RETURN v_campaign_id;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION create_draft_campaign TO authenticated;
GRANT EXECUTE ON FUNCTION create_draft_campaign TO anon;

-- =====================================================
-- PARTE 4: VERIFICAR BUCKET ad-creatives
-- =====================================================
-- Nota: Los buckets se crean desde el dashboard de Supabase Storage
-- Pero podemos asegurar las políticas de storage

-- Verificar que las políticas de storage existan (ejecutar en SQL Editor)
-- Si no existe el bucket, créalo desde Storage > New bucket > "ad-creatives" > Public

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar función
SELECT proname, pronargs FROM pg_proc WHERE proname = 'create_draft_campaign';

-- Verificar políticas de user_profiles
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_profiles';

-- Verificar constraint de status
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'ad_campaigns'::regclass AND contype = 'c';
