-- ============================================================================
-- GEOBOOKER ENTERPRISE ADS + INTENT TRACKING HARDENING
-- Fecha sugerida: 2026-08
-- Objetivo:
-- 1) Alinear ad_campaigns con el checkout Enterprise/Global Ads.
-- 2) Refrescar schema cache para resolver errores tipo missing column 'notes'.
-- 3) Permitir tracking de intencion en resultados DENUE/Google sin UUID interno.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Columnas usadas por el flujo Enterprise self-service + Stripe webhook
-- --------------------------------------------------------------------------
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS campaign_type text DEFAULT 'regional',
  ADD COLUMN IF NOT EXISTS ad_level text DEFAULT 'city',
  ADD COLUMN IF NOT EXISTS category_code text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS target_cities jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_countries jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS client_tax_id text,
  ADD COLUMN IF NOT EXISTS tax_status text DEFAULT 'export_0_iva',
  ADD COLUMN IF NOT EXISTS total_with_iva numeric(12,2),
  ADD COLUMN IF NOT EXISTS iva_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS creative_url text,
  ADD COLUMN IF NOT EXISTS multi_language_creatives jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent text,
  ADD COLUMN IF NOT EXISTS payment_method text;

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_enterprise_payment
  ON public.ad_campaigns (payment_status, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_enterprise_dates
  ON public.ad_campaigns (start_date, end_date)
  WHERE status IN ('pending_review', 'approved', 'active');

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_stripe_session
  ON public.ad_campaigns (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- 2. Tracking de intencion: resultados externos pueden no tener UUID interno
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_intent_logs'
      AND column_name = 'business_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.business_intent_logs ALTER COLUMN business_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.business_intent_logs
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_category text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'business_profile',
  ADD COLUMN IF NOT EXISTS platform text DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_business_intent_logs_source
  ON public.business_intent_logs (source, created_at DESC);

-- Mantener insercion anonima permitida, lectura solo por admin/politicas existentes.
ALTER TABLE public.business_intent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert intent logs" ON public.business_intent_logs;
CREATE POLICY "Anyone can insert intent logs"
ON public.business_intent_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

COMMIT;

-- Refresca PostgREST/Supabase schema cache. Importante tras agregar notes.
NOTIFY pgrst, 'reload schema';
