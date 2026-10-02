-- GEOSCORE Phase 5: Verifiable Certificates & Usage Tracking
--
-- Adds:
--   1. geoscore_certificates — persistent, verifiable certificate records
--   2. geoscore_usage_log — per-user / per-IP usage tracking for future gating
--   3. geoscore_issue_certificate() — creates a certificate after score calculation
--   4. geoscore_verify_certificate() — public verification by token
--   5. geoscore_my_certificates() — authenticated user's own certificates
--
-- Does NOT alter any Phase 2-4 tables or functions.

BEGIN;

-- 1. Certificate storage --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.geoscore_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token for public verification (human-readable, URL-safe)
  certificate_token TEXT NOT NULL UNIQUE,

  -- Content integrity hash (SHA-256 of canonical score payload)
  verification_hash TEXT NOT NULL,

  -- Link back to detailed analysis if one was saved
  analysis_id UUID REFERENCES public.location_analyses(id) ON DELETE SET NULL,

  -- Score snapshot (immutable once issued)
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  business_type_key TEXT NOT NULL,
  location_name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  radius_meters INTEGER NOT NULL CHECK (radius_meters BETWEEN 100 AND 5000),
  score NUMERIC(5,1) NOT NULL CHECK (score BETWEEN 0 AND 100),
  grade TEXT NOT NULL CHECK (grade IN ('A+','A','B','C','D')),
  recommendation TEXT NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Issuance metadata
  issued_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_to_name TEXT,
  issued_to_email TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '12 months'),

  -- State
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  revocation_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS geoscore_certificates_user_idx
  ON public.geoscore_certificates (issued_to_user_id, issued_at DESC)
  WHERE issued_to_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS geoscore_certificates_status_idx
  ON public.geoscore_certificates (status, expires_at);

-- 2. Usage tracking for future gating ------------------------------------------

CREATE TABLE IF NOT EXISTS public.geoscore_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_hash TEXT,  -- hashed IP for anon users
  country_code TEXT NOT NULL,
  business_type_key TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  score_produced BOOLEAN NOT NULL DEFAULT false,
  certificate_issued BOOLEAN NOT NULL DEFAULT false,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS geoscore_usage_log_user_month_idx
  ON public.geoscore_usage_log (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS geoscore_usage_log_anon_month_idx
  ON public.geoscore_usage_log (anonymous_hash, occurred_at DESC)
  WHERE anonymous_hash IS NOT NULL;

-- 3. Token generator -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.geoscore_generate_certificate_token()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_year TEXT;
  v_random TEXT;
  v_token TEXT;
  v_exists BOOLEAN;
BEGIN
  v_year := extract(year FROM now())::text;
  
  -- Generate unique token: GS-YYYY-XXXXXX (6 alphanum chars)
  FOR i IN 1..10 LOOP
    v_random := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    v_token := 'GS-' || v_year || '-' || v_random;
    
    SELECT EXISTS(
      SELECT 1 FROM public.geoscore_certificates WHERE certificate_token = v_token
    ) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_token;
    END IF;
  END LOOP;
  
  -- Fallback with longer random
  v_random := upper(substr(md5(gen_random_uuid()::text || now()::text), 1, 8));
  RETURN 'GS-' || v_year || '-' || v_random;
END;
$$;

-- 4. Issue certificate ---------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.geoscore_issue_certificate(
  p_country_code TEXT,
  p_business_type_key TEXT,
  p_location_name TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters INTEGER,
  p_score NUMERIC,
  p_grade TEXT,
  p_recommendation TEXT,
  p_breakdown JSONB DEFAULT '{}'::jsonb,
  p_strengths JSONB DEFAULT '[]'::jsonb,
  p_risks JSONB DEFAULT '[]'::jsonb,
  p_metrics JSONB DEFAULT '{}'::jsonb,
  p_issued_to_name TEXT DEFAULT NULL,
  p_issued_to_email TEXT DEFAULT NULL,
  p_analysis_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_token TEXT;
  v_hash TEXT;
  v_canonical TEXT;
  v_user_id UUID;
  v_cert_id UUID;
  v_issued_at TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
  v_base_url TEXT := 'https://geobooker.com.mx';
BEGIN
  -- Input validation
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'valid_coordinates_required' USING ERRCODE = '22023';
  END IF;

  IF p_score IS NULL OR p_score < 0 OR p_score > 100 THEN
    RAISE EXCEPTION 'valid_score_required' USING ERRCODE = '22023';
  END IF;

  IF p_grade IS NULL OR p_grade NOT IN ('A+','A','B','C','D') THEN
    RAISE EXCEPTION 'valid_grade_required' USING ERRCODE = '22023';
  END IF;

  -- Detect authenticated user (optional — works for both anon and logged-in)
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Generate unique token
  v_token := public.geoscore_generate_certificate_token();

  -- Build canonical string for verification hash
  v_canonical := upper(p_country_code) || '|' || p_business_type_key || '|' ||
    round(p_lat::numeric, 6)::text || '|' || round(p_lng::numeric, 6)::text || '|' ||
    p_radius_meters::text || '|' || p_score::text || '|' || p_grade || '|' || v_token;

  -- SHA-256 hash
  v_hash := encode(digest(v_canonical, 'sha256'), 'hex');

  v_issued_at := now();
  v_expires_at := v_issued_at + INTERVAL '12 months';

  INSERT INTO public.geoscore_certificates (
    certificate_token, verification_hash, analysis_id,
    country_code, business_type_key, location_name,
    lat, lng, radius_meters,
    score, grade, recommendation,
    breakdown, strengths, risks, metrics,
    issued_to_user_id, issued_to_name, issued_to_email,
    issued_at, expires_at, status
  ) VALUES (
    v_token, v_hash, p_analysis_id,
    upper(p_country_code), p_business_type_key, p_location_name,
    p_lat, p_lng, p_radius_meters,
    p_score, p_grade, p_recommendation,
    p_breakdown, p_strengths, p_risks, p_metrics,
    v_user_id, p_issued_to_name, p_issued_to_email,
    v_issued_at, v_expires_at, 'active'
  )
  RETURNING id INTO v_cert_id;

  -- Log usage
  INSERT INTO public.geoscore_usage_log (
    user_id, country_code, business_type_key,
    lat, lng, score_produced, certificate_issued
  ) VALUES (
    v_user_id, upper(p_country_code), p_business_type_key,
    p_lat, p_lng, true, true
  );

  RETURN jsonb_build_object(
    'certificateId', v_cert_id,
    'certificateToken', v_token,
    'verificationHash', v_hash,
    'verificationUrl', v_base_url || '/certificate/' || v_token,
    'issuedAt', v_issued_at,
    'expiresAt', v_expires_at,
    'score', p_score,
    'grade', p_grade,
    'locationName', p_location_name
  );
END;
$$;

-- 5. Verify certificate (PUBLIC — callable by anyone) --------------------------

CREATE OR REPLACE FUNCTION public.geoscore_verify_certificate(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cert public.geoscore_certificates%ROWTYPE;
  v_status TEXT;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 5 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'invalid_token_format'
    );
  END IF;

  SELECT * INTO v_cert
  FROM public.geoscore_certificates
  WHERE certificate_token = upper(trim(p_token));

  IF v_cert.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'certificate_not_found'
    );
  END IF;

  -- Check status and expiry
  IF v_cert.status = 'revoked' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'certificate_revoked',
      'revokedReason', v_cert.revocation_reason
    );
  END IF;

  IF v_cert.expires_at < now() THEN
    v_status := 'expired';
  ELSE
    v_status := 'valid';
  END IF;

  RETURN jsonb_build_object(
    'valid', v_status = 'valid',
    'status', v_status,
    'certificateToken', v_cert.certificate_token,
    'verificationHash', v_cert.verification_hash,
    'countryCode', v_cert.country_code,
    'businessTypeKey', v_cert.business_type_key,
    'locationName', v_cert.location_name,
    'lat', v_cert.lat,
    'lng', v_cert.lng,
    'radiusMeters', v_cert.radius_meters,
    'score', v_cert.score,
    'grade', v_cert.grade,
    'recommendation', v_cert.recommendation,
    'breakdown', v_cert.breakdown,
    'strengths', v_cert.strengths,
    'risks', v_cert.risks,
    'metrics', v_cert.metrics,
    'issuedAt', v_cert.issued_at,
    'expiresAt', v_cert.expires_at,
    'issuedToName', v_cert.issued_to_name
  );
END;
$$;

-- 6. My certificates (authenticated users) ------------------------------------

CREATE OR REPLACE FUNCTION public.geoscore_my_certificates()
RETURNS TABLE (
  certificate_token TEXT,
  location_name TEXT,
  country_code TEXT,
  business_type_key TEXT,
  score NUMERIC,
  grade TEXT,
  status TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.certificate_token, c.location_name, c.country_code,
    c.business_type_key, c.score, c.grade, c.status,
    c.issued_at, c.expires_at
  FROM public.geoscore_certificates c
  WHERE c.issued_to_user_id = auth.uid()
  ORDER BY c.issued_at DESC
  LIMIT 50;
END;
$$;

-- 7. RLS -----------------------------------------------------------------------

ALTER TABLE public.geoscore_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geoscore_certificates FORCE ROW LEVEL SECURITY;

-- Users can read their own certificates
DROP POLICY IF EXISTS own_certificates_read ON public.geoscore_certificates;
CREATE POLICY own_certificates_read ON public.geoscore_certificates
  FOR SELECT TO authenticated
  USING (issued_to_user_id = auth.uid());

-- Service role can do everything
GRANT ALL ON TABLE public.geoscore_certificates TO service_role;
GRANT SELECT ON TABLE public.geoscore_certificates TO authenticated;
REVOKE ALL ON TABLE public.geoscore_certificates FROM PUBLIC, anon;

ALTER TABLE public.geoscore_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geoscore_usage_log FORCE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.geoscore_usage_log TO service_role;
REVOKE ALL ON TABLE public.geoscore_usage_log FROM PUBLIC, anon, authenticated;

-- 8. Function permissions -------------------------------------------------------

-- Issue: backend-only. Public clients must request issuance through the
-- location-intelligence Edge Function, which recalculates the score server-side.
GRANT EXECUTE ON FUNCTION public.geoscore_issue_certificate(
  TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER,
  NUMERIC, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, TEXT, TEXT, UUID
) TO service_role;

-- Verify: PUBLIC (anyone can verify a certificate)
GRANT EXECUTE ON FUNCTION public.geoscore_verify_certificate(TEXT) TO PUBLIC, anon, authenticated, service_role;

-- My certificates: authenticated only
REVOKE ALL ON FUNCTION public.geoscore_my_certificates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.geoscore_my_certificates() TO authenticated, service_role;

-- Token generator: internal only
REVOKE ALL ON FUNCTION public.geoscore_generate_certificate_token() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geoscore_generate_certificate_token() TO service_role;

-- 9. updated_at trigger ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.geoscore_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.geoscore_certificates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.geoscore_certificates
  FOR EACH ROW EXECUTE FUNCTION public.geoscore_set_updated_at();

-- 10. Comments ------------------------------------------------------------------

COMMENT ON TABLE public.geoscore_certificates IS
  'Verifiable GeoScore certificates with unique tokens, SHA-256 integrity hashes, and 12-month validity.';
COMMENT ON FUNCTION public.geoscore_issue_certificate IS
  'Issues a new GeoScore certificate after successful score calculation. Generates unique token and verification hash.';
COMMENT ON FUNCTION public.geoscore_verify_certificate IS
  'Public verification of GeoScore certificates by token. Returns full certificate data if valid.';

NOTIFY pgrst, 'reload schema';

COMMIT;
