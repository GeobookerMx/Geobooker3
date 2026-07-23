-- ============================================================================
-- Geobooker Enterprise Leads RLS + Campaign Contracts Foundation
-- Fecha: 2026-07-22
-- Objetivo:
-- 1) Corregir RLS para que el formulario publico de Enterprise pueda insertar.
-- 2) Mantener los leads privados: no se habilita SELECT publico.
-- 3) Crear base para contratos personalizados por publicidad/campana.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Enterprise leads: insercion publica controlada, lectura solo admin.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.enterprise_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access enterprise leads" ON public.enterprise_leads;
DROP POLICY IF EXISTS "Public insert enterprise leads" ON public.enterprise_leads;
DROP POLICY IF EXISTS enterprise_leads_admin_select_v2 ON public.enterprise_leads;
DROP POLICY IF EXISTS enterprise_leads_admin_update_v2 ON public.enterprise_leads;
DROP POLICY IF EXISTS enterprise_leads_admin_delete_v2 ON public.enterprise_leads;
DROP POLICY IF EXISTS enterprise_leads_public_insert_v2 ON public.enterprise_leads;

CREATE POLICY enterprise_leads_public_insert_v2
  ON public.enterprise_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    company_name IS NOT NULL
    AND contact_email IS NOT NULL
    AND country IS NOT NULL
    AND COALESCE(status, 'new') IN (
      'new',
      'campaign_precheck',
      'contacted',
      'qualified',
      'proposal_sent',
      'closed_won',
      'closed_lost'
    )
  );

CREATE POLICY enterprise_leads_admin_select_v2
  ON public.enterprise_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

CREATE POLICY enterprise_leads_admin_update_v2
  ON public.enterprise_leads
  FOR UPDATE
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

CREATE POLICY enterprise_leads_admin_delete_v2
  ON public.enterprise_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

GRANT INSERT ON public.enterprise_leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.enterprise_leads TO authenticated;

COMMENT ON TABLE public.enterprise_leads IS
'Pre-registros Enterprise y solicitudes asistidas. Insercion publica controlada; lectura privada para administradores.';

-- ---------------------------------------------------------------------------
-- 2. Campos de contrato en campanas publicitarias.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.ad_campaigns
  ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'not_generated',
  ADD COLUMN IF NOT EXISTS contract_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 3. Tabla de contratos por campana.
--    Aqui se guardara el HTML/PDF final, idioma, version legal y firma.
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
DROP POLICY IF EXISTS ad_campaign_contracts_service_role_all_v1 ON public.ad_campaign_contracts;

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

COMMENT ON TABLE public.ad_campaign_contracts IS
'Contratos personalizados por campana publicitaria. Guarda HTML/PDF, idioma, version legal, alcance, fiscalidad y firma.';

COMMIT;

-- Verificacion rapida:
-- SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'enterprise_leads';
-- SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_campaigns' AND column_name LIKE 'contract%';
-- SELECT * FROM public.ad_campaign_contracts LIMIT 1;
