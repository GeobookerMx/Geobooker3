-- ============================================================================
-- Geobooker Ads Purchase, Fiscal and Slot Delivery Hardening
-- Date: 2026-07-22
-- Purpose: keep Stripe payments, fiscal control, admin QA and ad delivery aligned.
-- ============================================================================

BEGIN;

ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS total_with_iva NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS iva_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_stripe_session_id
  ON public.ad_campaigns(stripe_session_id);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_delivery_window
  ON public.ad_campaigns(status, start_date, end_date);

DROP FUNCTION IF EXISTS public.get_targeted_ads(TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_targeted_ads(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.get_targeted_ads(
  p_space_name TEXT,
  p_user_country TEXT DEFAULT NULL,
  p_user_language TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL,
  p_user_city TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  campaign_id UUID,
  creative_id UUID,
  display_name TEXT,
  title TEXT,
  image_url TEXT,
  cta_url TEXT,
  cta_text TEXT,
  advertiser_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT
      c.*,
      cr.id AS creative_id,
      cr.title AS creative_title,
      cr.image_url AS creative_image_url,
      cr.cta_url AS creative_cta_url,
      cr.cta_text AS creative_cta_text,
      s.display_name AS space_display_name,
      (
        COALESCE(p_user_country, '') <> ''
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(c.target_countries, '[]'::jsonb)) AS tc(value)
          WHERE UPPER(tc.value) = UPPER(COALESCE(p_user_country, ''))
        )
      ) AS target_country_match,
      (
        COALESCE(p_user_city, '') <> ''
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(c.target_cities, '[]'::jsonb)) AS tcity(value)
          WHERE LOWER(tcity.value) LIKE '%' || LOWER(COALESCE(p_user_city, '')) || '%'
             OR LOWER(COALESCE(p_user_city, '')) LIKE '%' || LOWER(tcity.value) || '%'
        )
      ) AS target_city_match,
      (
        COALESCE(p_user_country, '') <> ''
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(COALESCE(c.audience_targeting, '{}'::jsonb)->'countries', '[]'::jsonb)) AS ac(value)
          WHERE UPPER(ac.value) = UPPER(COALESCE(p_user_country, ''))
        )
      ) AS audience_country_match,
      COALESCE(jsonb_array_length(COALESCE(c.target_countries, '[]'::jsonb)), 0) AS target_country_count,
      COALESCE(jsonb_array_length(COALESCE(c.target_cities, '[]'::jsonb)), 0) AS target_city_count,
      COALESCE(jsonb_array_length(COALESCE(COALESCE(c.audience_targeting, '{}'::jsonb)->'countries', '[]'::jsonb)), 0) AS audience_country_count
    FROM public.ad_campaigns c
    JOIN public.ad_spaces s ON c.ad_space_id = s.id
    LEFT JOIN public.ad_creatives cr ON cr.campaign_id = c.id AND COALESCE(cr.is_active, true) = true
    WHERE s.name = p_space_name
      AND s.is_active = true
      AND c.status = 'active'
      AND c.payment_status = 'paid'
      AND c.start_date <= CURRENT_DATE
      AND (c.end_date >= CURRENT_DATE OR c.end_date IS NULL)
      AND (
        NOT (COALESCE(c.audience_targeting, '{}'::jsonb) ? 'languages')
        OR (COALESCE(c.audience_targeting, '{}'::jsonb)->'languages') ? COALESCE(p_user_language, '')
      )
      AND (
        NOT (COALESCE(c.audience_targeting, '{}'::jsonb) ? 'devices')
        OR (COALESCE(c.audience_targeting, '{}'::jsonb)->'devices') ? COALESCE(p_device_type, '')
      )
  )
  SELECT
    e.id AS campaign_id,
    e.creative_id,
    e.space_display_name AS display_name,
    COALESCE(e.creative_title, e.headline, e.advertiser_name) AS title,
    COALESCE(e.creative_image_url, e.creative_url, e.image_url) AS image_url,
    COALESCE(e.creative_cta_url, e.cta_url) AS cta_url,
    COALESCE(e.creative_cta_text, e.cta_text, 'Learn More') AS cta_text,
    e.advertiser_name
  FROM eligible e
  WHERE
    COALESCE(e.is_demo, false) = true
    OR e.target_city_match
    OR e.target_country_match
    OR e.audience_country_match
    OR UPPER(COALESCE(e.target_country, '')) = UPPER(COALESCE(p_user_country, ''))
    OR (
      e.target_country_count = 0
      AND e.target_city_count = 0
      AND e.audience_country_count = 0
      AND COALESCE(e.target_country, '') = ''
    )
  ORDER BY
    CASE
      WHEN e.target_city_match THEN 1
      WHEN e.target_country_match OR e.audience_country_match OR UPPER(COALESCE(e.target_country, '')) = UPPER(COALESCE(p_user_country, '')) THEN 2
      WHEN COALESCE(e.ad_level, '') = 'region' THEN 3
      WHEN COALESCE(e.ad_level, '') = 'global' THEN 4
      ELSE 5
    END,
    COALESCE(e.is_demo, false) ASC,
    random()
  LIMIT COALESCE(p_limit, 10);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_targeted_ads(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_targeted_ads(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;

COMMIT;
