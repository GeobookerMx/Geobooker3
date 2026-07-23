-- ============================================================================
-- Geobooker Enterprise Ads - Private Contract Bucket + Contract Metadata
-- Fecha: 2026-07-22
-- Objetivo:
-- 1) Separar documentos legales de creativos publicitarios.
-- 2) Crear bucket privado `ad-contracts` para contratos revisables/firmables.
-- 3) Asegurar folio de contrato y trazabilidad en ad_campaigns/ad_campaign_contracts.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Bucket privado para contratos.
--    Importante: NO usar `ad-creatives` para contratos porque ese bucket puede
--    contener piezas publicas de campana. Los contratos deben vivir privados.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-contracts', 'ad-contracts', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

-- ---------------------------------------------------------------------------
-- 2. Metadatos de contrato en campanas.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.ad_campaigns
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'not_generated',
  ADD COLUMN IF NOT EXISTS contract_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_contract_number
  ON public.ad_campaigns(contract_number);

-- ---------------------------------------------------------------------------
-- 3. Tabla juridico-comercial de contratos por campana.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ad_campaign_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL DEFAULT 'enterprise_ads',
  language TEXT NOT NULL DEFAULT 'en',
  legal_version TEXT NOT NULL DEFAULT 'ads_terms_2026_v1',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent', 'signed', 'void')),
  advertiser_name TEXT,
  advertiser_email TEXT,
  billing_country TEXT,
  campaign_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  fiscal_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  terms_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  contract_html TEXT,
  pdf_url TEXT,
  storage_path TEXT,
  generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, contract_type, language, legal_version)
);

CREATE INDEX IF NOT EXISTS idx_ad_campaign_contracts_campaign
  ON public.ad_campaign_contracts(campaign_id);

CREATE INDEX IF NOT EXISTS idx_ad_campaign_contracts_status
  ON public.ad_campaign_contracts(status, created_at DESC);

ALTER TABLE public.ad_campaign_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ad_campaign_contracts_admin_all_v1 ON public.ad_campaign_contracts;

CREATE POLICY ad_campaign_contracts_admin_all_v1
  ON public.ad_campaign_contracts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaign_contracts TO authenticated;
GRANT ALL ON public.ad_campaign_contracts TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Politicas de Storage para administradores.
--    La funcion Netlify usa service_role para generar y firmar URLs temporales.
--    Estas politicas permiten tambien auditoria desde clientes autenticados admin.
-- ---------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ad_contracts_admin_select_v1 ON storage.objects;
DROP POLICY IF EXISTS ad_contracts_admin_insert_v1 ON storage.objects;
DROP POLICY IF EXISTS ad_contracts_admin_update_v1 ON storage.objects;
DROP POLICY IF EXISTS ad_contracts_admin_delete_v1 ON storage.objects;

CREATE POLICY ad_contracts_admin_select_v1
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ad-contracts'
    AND EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

CREATE POLICY ad_contracts_admin_insert_v1
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ad-contracts'
    AND EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

CREATE POLICY ad_contracts_admin_update_v1
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ad-contracts'
    AND EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'ad-contracts'
    AND EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

CREATE POLICY ad_contracts_admin_delete_v1
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ad-contracts'
    AND EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

COMMENT ON TABLE public.ad_campaign_contracts IS
'Contratos personalizados por campana publicitaria. Documento privado, idioma, version legal, alcance, fiscalidad, firma y trazabilidad.';

COMMIT;

-- Verificacion rapida despues de aplicar:
-- SELECT id, name, public FROM storage.buckets WHERE id = 'ad-contracts';
-- SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_campaigns' AND column_name LIKE 'contract%';
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'ad_contracts%';
