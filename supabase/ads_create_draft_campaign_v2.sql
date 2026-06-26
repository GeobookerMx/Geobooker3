-- ============================================================================
-- ADS CREATE DRAFT CAMPAIGN V2
-- Alinea la RPC con el wizard actual: fechas programadas, facturacion y fiscal.
-- Ejecutar despues de ads_crossborder_fiscal_hardening.sql
-- ============================================================================

DROP FUNCTION IF EXISTS create_draft_campaign(
    UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT
);

DROP FUNCTION IF EXISTS create_draft_campaign(
    UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, UUID, UUID, UUID
);

DROP FUNCTION IF EXISTS create_draft_campaign(
    UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, BOOLEAN, TEXT
);

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
    p_target_country TEXT DEFAULT NULL,
    p_target_region UUID DEFAULT NULL,
    p_target_city UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_billing_country TEXT DEFAULT 'MX',
    p_client_tax_id TEXT DEFAULT NULL,
    p_client_legal_name TEXT DEFAULT NULL,
    p_invoice_required BOOLEAN DEFAULT true,
    p_tax_status TEXT DEFAULT 'pending'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_id UUID;
    v_start_date DATE := COALESCE(p_start_date, CURRENT_DATE);
    v_end_date DATE := COALESCE(p_end_date, (v_start_date + 30));
BEGIN
    IF v_end_date < v_start_date THEN
        RAISE EXCEPTION 'end_date no puede ser anterior a start_date';
    END IF;

    INSERT INTO ad_campaigns (
        ad_space_id,
        advertiser_name,
        advertiser_email,
        status,
        geographic_scope,
        target_location,
        target_country,
        target_region,
        target_city,
        audience_targeting,
        budget,
        total_budget,
        start_date,
        end_date,
        headline,
        description,
        cta_text,
        cta_url,
        creative_url,
        billing_country,
        client_tax_id,
        client_legal_name,
        invoice_required,
        tax_status,
        currency,
        creative_title,
        creative_description,
        creative_cta,
        creative_image,
        user_id,
        payment_status,
        created_at,
        updated_at
    )
    VALUES (
        p_space_id,
        p_advertiser_name,
        p_advertiser_email,
        'pending_payment',
        COALESCE(p_geographic_scope, 'country'),
        p_target_location,
        p_target_country,
        p_target_region,
        p_target_city,
        COALESCE(p_audience_targeting, '{}'::jsonb),
        p_budget,
        p_budget,
        v_start_date,
        v_end_date,
        p_creative_title,
        p_creative_description,
        COALESCE(p_creative_cta, 'Ver mas'),
        p_creative_url,
        p_creative_image,
        COALESCE(NULLIF(p_billing_country, ''), 'MX'),
        p_client_tax_id,
        p_client_legal_name,
        COALESCE(p_invoice_required, true),
        COALESCE(NULLIF(p_tax_status, ''), 'pending'),
        CASE
            WHEN COALESCE(NULLIF(p_billing_country, ''), 'MX') = 'MX' THEN 'MXN'
            ELSE 'USD'
        END,
        p_creative_title,
        p_creative_description,
        COALESCE(p_creative_cta, 'Ver mas'),
        p_creative_image,
        COALESCE(p_user_id, auth.uid()),
        'pending',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_campaign_id;

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
    )
    VALUES (
        v_campaign_id,
        p_creative_title,
        p_creative_description,
        p_creative_image,
        COALESCE(p_creative_cta, 'Ver mas'),
        p_creative_url,
        TRUE,
        NOW(),
        NOW()
    );

    RETURN v_campaign_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_draft_campaign TO authenticated;
GRANT EXECUTE ON FUNCTION create_draft_campaign TO anon;
