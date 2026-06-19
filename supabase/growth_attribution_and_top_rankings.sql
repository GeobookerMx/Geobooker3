-- Geobooker Growth Layer
-- 1. Optional attribution columns for analytics tables
-- 2. Foundation for "Top negocios" rankings

-- ============================================
-- Analytics attribution hardening
-- ============================================

ALTER TABLE IF EXISTS page_analytics
  ADD COLUMN IF NOT EXISTS traffic_source TEXT,
  ADD COLUMN IF NOT EXISTS traffic_medium TEXT,
  ADD COLUMN IF NOT EXISTS traffic_campaign TEXT,
  ADD COLUMN IF NOT EXISTS channel_group TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS landing_path TEXT,
  ADD COLUMN IF NOT EXISTS attribution_snapshot JSONB;

ALTER TABLE IF EXISTS search_analytics
  ADD COLUMN IF NOT EXISTS traffic_source TEXT,
  ADD COLUMN IF NOT EXISTS traffic_medium TEXT,
  ADD COLUMN IF NOT EXISTS traffic_campaign TEXT,
  ADD COLUMN IF NOT EXISTS channel_group TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS attribution_snapshot JSONB;

ALTER TABLE IF EXISTS user_sessions
  ADD COLUMN IF NOT EXISTS traffic_source TEXT,
  ADD COLUMN IF NOT EXISTS traffic_medium TEXT,
  ADD COLUMN IF NOT EXISTS traffic_campaign TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS attribution_snapshot JSONB;

ALTER TABLE IF EXISTS businesses
  ADD COLUMN IF NOT EXISTS attribution_text TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_page_analytics_campaign ON page_analytics(traffic_campaign);
CREATE INDEX IF NOT EXISTS idx_page_analytics_channel ON page_analytics(channel_group);
CREATE INDEX IF NOT EXISTS idx_search_analytics_campaign ON search_analytics(traffic_campaign);
CREATE INDEX IF NOT EXISTS idx_user_sessions_campaign ON user_sessions(traffic_campaign);

-- ============================================
-- Top negocios: score snapshots
-- ============================================

CREATE TABLE IF NOT EXISTS public.business_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  country_code TEXT,
  city TEXT,
  category TEXT,
  subcategory TEXT,
  score_total NUMERIC(8,2) NOT NULL DEFAULT 0,
  score_rating NUMERIC(8,2) NOT NULL DEFAULT 0,
  score_reviews NUMERIC(8,2) NOT NULL DEFAULT 0,
  score_recency NUMERIC(8,2) NOT NULL DEFAULT 0,
  score_profile_complete NUMERIC(8,2) NOT NULL DEFAULT 0,
  score_verification NUMERIC(8,2) NOT NULL DEFAULT 0,
  score_photos NUMERIC(8,2) NOT NULL DEFAULT 0,
  score_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  score_engagement NUMERIC(8,2) NOT NULL DEFAULT 0,
  score_reports NUMERIC(8,2) NOT NULL DEFAULT 0,
  score_awards NUMERIC(8,2) NOT NULL DEFAULT 0,
  rank_city_category INTEGER,
  rank_city_subcategory INTEGER,
  rank_country_category INTEGER,
  review_count INTEGER DEFAULT 0,
  average_rating NUMERIC(4,2) DEFAULT 0,
  recent_reviews_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  whatsapp_clicks_count INTEGER DEFAULT 0,
  call_clicks_count INTEGER DEFAULT 0,
  directions_count INTEGER DEFAULT 0,
  profile_views_count INTEGER DEFAULT 0,
  reports_negative_count INTEGER DEFAULT 0,
  has_external_award BOOLEAN DEFAULT FALSE,
  top_badges TEXT[] DEFAULT '{}',
  score_version TEXT DEFAULT 'gbqs_v1',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, score_version)
);

CREATE INDEX IF NOT EXISTS idx_business_quality_scores_city_cat
  ON public.business_quality_scores(city, category, score_total DESC);

CREATE INDEX IF NOT EXISTS idx_business_quality_scores_country_cat
  ON public.business_quality_scores(country_code, category, score_total DESC);

CREATE OR REPLACE VIEW public.top_businesses_city_category_v1 AS
SELECT
  bqs.business_id,
  b.name,
  b.slug,
  b.category,
  b.subcategory,
  b.city,
  b.country,
  b.latitude,
  b.longitude,
  bqs.score_total,
  bqs.average_rating,
  bqs.review_count,
  bqs.rank_city_category,
  bqs.top_badges
FROM public.business_quality_scores bqs
JOIN public.businesses b ON b.id = bqs.business_id
WHERE b.status = 'approved'
  AND COALESCE(b.is_visible, true) = true;

COMMENT ON TABLE public.business_quality_scores IS
'Snapshot table for Geobooker Quality Score (Top negocios). Recalculate by cron or Edge Function.';

COMMENT ON VIEW public.top_businesses_city_category_v1 IS
'Base view to power Top 5 / Top 10 by city, category and subcategory.';
