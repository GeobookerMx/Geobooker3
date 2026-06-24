-- =============================================================================
-- GEOBOOKER CONNECT - BASE OPERATIVA DE LANZAMIENTO
-- Ejecutar en Supabase SQL Editor antes de habilitar checkout en produccion.
-- No rompe estructuras existentes; solo agrega capas nuevas y columnas opcionales.
-- =============================================================================

-- 1) Enriquecer intake enterprise para separar Connect de Ads / Enterprise clasico
ALTER TABLE public.enterprise_leads
ADD COLUMN IF NOT EXISTS service_line TEXT,
ADD COLUMN IF NOT EXISTS intake_source TEXT,
ADD COLUMN IF NOT EXISTS launch_offer_code TEXT,
ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_service_line
  ON public.enterprise_leads(service_line);

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_intake_source
  ON public.enterprise_leads(intake_source);

-- 2) Cuentas cliente para Geobooker Connect
CREATE TABLE IF NOT EXISTS public.connect_client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  primary_contact_name TEXT,
  primary_contact_email TEXT NOT NULL,
  primary_contact_phone TEXT,
  company_website TEXT,
  country TEXT DEFAULT 'Mexico',
  status TEXT NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead', 'active', 'paused', 'archived')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_client_accounts_email
  ON public.connect_client_accounts(primary_contact_email);

-- 3) Campanas gestionadas / reservas de piloto
CREATE TABLE IF NOT EXISTS public.connect_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID REFERENCES public.connect_client_accounts(id) ON DELETE SET NULL,
  enterprise_lead_id UUID REFERENCES public.enterprise_leads(id) ON DELETE SET NULL,
  package_code TEXT NOT NULL,
  package_name TEXT NOT NULL,
  campaign_objective TEXT,
  target_audience TEXT,
  target_city_scope TEXT,
  batch_size INTEGER NOT NULL DEFAULT 1000 CHECK (batch_size > 0),
  launch_price_mxn NUMERIC(10,2) NOT NULL DEFAULT 500.00,
  billing_email TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'expired')),
  fulfillment_status TEXT NOT NULL DEFAULT 'intake'
    CHECK (fulfillment_status IN ('intake', 'brief_review', 'audience_build', 'copy_ready', 'scheduled', 'running', 'reported', 'closed')),
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connect_campaigns_payment_status
  ON public.connect_campaigns(payment_status);

CREATE INDEX IF NOT EXISTS idx_connect_campaigns_fulfillment_status
  ON public.connect_campaigns(fulfillment_status);

CREATE INDEX IF NOT EXISTS idx_connect_campaigns_billing_email
  ON public.connect_campaigns(billing_email);

-- 4) Corridas / ejecuciones por lote
CREATE TABLE IF NOT EXISTS public.connect_campaign_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connect_campaign_id UUID NOT NULL REFERENCES public.connect_campaigns(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL DEFAULT 'email'
    CHECK (run_type IN ('email', 'whatsapp_assisted', 'whatsapp_api', 'mixed')),
  requested_contacts INTEGER NOT NULL DEFAULT 0,
  approved_contacts INTEGER NOT NULL DEFAULT 0,
  sent_contacts INTEGER NOT NULL DEFAULT 0,
  replied_contacts INTEGER NOT NULL DEFAULT 0,
  bounced_contacts INTEGER NOT NULL DEFAULT 0,
  opened_contacts INTEGER NOT NULL DEFAULT 0,
  clicked_contacts INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connect_campaign_runs_campaign
  ON public.connect_campaign_runs(connect_campaign_id);

-- 5) Lista de exclusion / suppressions por cumplimiento
CREATE TABLE IF NOT EXISTS public.connect_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global', 'client', 'campaign')),
  client_account_id UUID REFERENCES public.connect_client_accounts(id) ON DELETE CASCADE,
  connect_campaign_id UUID REFERENCES public.connect_campaigns(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  company_domain TEXT,
  reason TEXT NOT NULL DEFAULT 'opt_out',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT connect_suppressions_one_identifier CHECK (
    email IS NOT NULL OR phone IS NOT NULL OR company_domain IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_connect_suppressions_email
  ON public.connect_suppressions(email);

CREATE INDEX IF NOT EXISTS idx_connect_suppressions_phone
  ON public.connect_suppressions(phone);

CREATE INDEX IF NOT EXISTS idx_connect_suppressions_domain
  ON public.connect_suppressions(company_domain);

-- 6) Trigger updated_at generico
CREATE OR REPLACE FUNCTION public.update_connect_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_connect_client_accounts_updated_at ON public.connect_client_accounts;
CREATE TRIGGER trg_connect_client_accounts_updated_at
BEFORE UPDATE ON public.connect_client_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_connect_updated_at();

DROP TRIGGER IF EXISTS trg_connect_campaigns_updated_at ON public.connect_campaigns;
CREATE TRIGGER trg_connect_campaigns_updated_at
BEFORE UPDATE ON public.connect_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_connect_updated_at();

-- 7) RLS: admins gestionan todo. El publico solo puede insertar reservas iniciales de Connect.
ALTER TABLE public.connect_client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_campaign_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_suppressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access connect client accounts" ON public.connect_client_accounts;
CREATE POLICY "Admin access connect client accounts"
  ON public.connect_client_accounts
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Public insert connect campaigns" ON public.connect_campaigns;
CREATE POLICY "Public insert connect campaigns"
  ON public.connect_campaigns
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin access connect campaigns" ON public.connect_campaigns;
CREATE POLICY "Admin access connect campaigns"
  ON public.connect_campaigns
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admin access connect campaign runs" ON public.connect_campaign_runs;
CREATE POLICY "Admin access connect campaign runs"
  ON public.connect_campaign_runs
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admin access connect suppressions" ON public.connect_suppressions;
CREATE POLICY "Admin access connect suppressions"
  ON public.connect_suppressions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- 8) Comentarios utiles
COMMENT ON TABLE public.connect_campaigns IS
  'Reservas y campañas gestionadas de Geobooker Connect. Separadas de ad_campaigns para no mezclar Ads con outbound B2B.';

COMMENT ON COLUMN public.connect_campaigns.launch_price_mxn IS
  'Anticipo o fee de activacion del piloto. No implica entregabilidad o ejecucion automatica garantizada.';
