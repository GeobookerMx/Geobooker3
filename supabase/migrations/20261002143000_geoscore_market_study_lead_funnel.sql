-- GeoScore market study lead funnel.
-- Captures voluntary lead details before PDF personalization or after repeated
-- study usage. This does not grant campaign eligibility unless consent is true.

BEGIN;

CREATE TABLE IF NOT EXISTS public.geoscore_market_study_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  business_name TEXT,
  country_code TEXT,
  location_name TEXT,
  business_type_key TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER,
  score NUMERIC(5,2),
  grade TEXT,
  study_count INTEGER NOT NULL DEFAULT 1 CHECK (study_count >= 1),
  action_intent TEXT NOT NULL DEFAULT 'market_study'
    CHECK (action_intent IN ('market_study', 'pdf_download', 'repeat_usage', 'share', 'login', 'register_business', 'download_app')),
  email_marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_contact_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_text TEXT,
  source TEXT NOT NULL DEFAULT 'geoscore_public',
  page_url TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS geoscore_market_study_leads_created_idx
  ON public.geoscore_market_study_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS geoscore_market_study_leads_email_idx
  ON public.geoscore_market_study_leads (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS geoscore_market_study_leads_intent_idx
  ON public.geoscore_market_study_leads (action_intent, created_at DESC);

ALTER TABLE public.geoscore_market_study_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geoscore_market_study_leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS geoscore_market_study_leads_public_insert_v1 ON public.geoscore_market_study_leads;
DROP POLICY IF EXISTS geoscore_market_study_leads_admin_select_v1 ON public.geoscore_market_study_leads;

CREATE POLICY geoscore_market_study_leads_public_insert_v1
  ON public.geoscore_market_study_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    COALESCE(length(full_name), 0) <= 160
    AND COALESCE(length(email), 0) <= 254
    AND COALESCE(length(phone), 0) <= 50
    AND COALESCE(length(business_name), 0) <= 180
    AND (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  );

CREATE POLICY geoscore_market_study_leads_admin_select_v1
  ON public.geoscore_market_study_leads
  FOR SELECT
  TO authenticated
  USING (crm.is_admin(auth.uid()));

GRANT INSERT ON public.geoscore_market_study_leads TO anon, authenticated;
GRANT SELECT ON public.geoscore_market_study_leads TO authenticated;
GRANT ALL ON public.geoscore_market_study_leads TO service_role;
REVOKE UPDATE, DELETE ON public.geoscore_market_study_leads FROM anon, authenticated;

COMMENT ON TABLE public.geoscore_market_study_leads IS
  'Voluntary GeoScore funnel leads. Marketing eligibility requires explicit consent flags.';

COMMIT;
