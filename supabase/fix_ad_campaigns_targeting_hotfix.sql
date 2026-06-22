-- ==========================================================
-- HOTFIX: align ad_campaigns schema with targeting-enabled ads flow
-- Fixes errors like:
--   column "target_country" of relation "ad_campaigns" does not exist
-- Run this in Supabase SQL Editor.
-- ==========================================================

-- 1. Core columns required by the current frontend + webhook flow
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS target_country TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS target_region UUID;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS target_city UUID;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS audience_targeting JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'MX';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS cta_url TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS creative_url TEXT;

-- Legacy fields still referenced by older SQL variants in this repo
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS creative_title TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS creative_description TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS creative_cta TEXT;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS creative_image TEXT;

-- 2. Foreign keys for geographic targeting
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ad_campaigns_target_region_fkey'
    ) THEN
        ALTER TABLE ad_campaigns
            ADD CONSTRAINT ad_campaigns_target_region_fkey
            FOREIGN KEY (target_region) REFERENCES geographic_regions(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ad_campaigns_target_city_fkey'
    ) THEN
        ALTER TABLE ad_campaigns
            ADD CONSTRAINT ad_campaigns_target_city_fkey
            FOREIGN KEY (target_city) REFERENCES geographic_cities(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Status constraint used across ads/admin/payment flows
ALTER TABLE ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_status_check;
ALTER TABLE ad_campaigns ADD CONSTRAINT ad_campaigns_status_check
    CHECK (
        status IN (
            'active',
            'approved',
            'paused',
            'completed',
            'cancelled',
            'draft',
            'pending_payment',
            'pending_review',
            'rejected'
        )
    );

-- 4. Enterprise/global campaigns may not always have a fixed ad space
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ad_campaigns'
          AND column_name = 'ad_space_id'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE ad_campaigns ALTER COLUMN ad_space_id DROP NOT NULL;
    END IF;
END $$;

-- 5. Replace all previous create_draft_campaign variants with one canonical RPC
DROP FUNCTION IF EXISTS create_draft_campaign(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_draft_campaign(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS create_draft_campaign(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS create_draft_campaign(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID);

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
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_id UUID;
BEGIN
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
        start_date,
        end_date,
        headline,
        description,
        cta_text,
        cta_url,
        creative_url,
        billing_country,
        creative_title,
        creative_description,
        creative_cta,
        creative_image,
        user_id,
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
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        p_creative_title,
        p_creative_description,
        COALESCE(p_creative_cta, 'Ver más'),
        p_creative_url,
        p_creative_image,
        COALESCE(p_target_country, 'MX'),
        p_creative_title,
        p_creative_description,
        COALESCE(p_creative_cta, 'Ver más'),
        p_creative_image,
        COALESCE(p_user_id, auth.uid()),
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
        COALESCE(p_creative_cta, 'Ver más'),
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

-- 6. Quick verification query
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ad_campaigns'
  AND column_name IN (
      'target_country',
      'target_region',
      'target_city',
      'audience_targeting',
      'headline',
      'description',
      'cta_text',
      'cta_url',
      'creative_url',
      'user_id'
  )
ORDER BY column_name;
