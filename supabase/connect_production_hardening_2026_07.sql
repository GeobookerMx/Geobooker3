-- ============================================================================
-- GEOBOOKER CONNECT - HARDENING DE PRODUCCION
-- Fecha: 2026-07-16
-- Objetivo:
-- 1. Endurecer el insert publico de connect_campaigns
-- 2. Crear / vincular cuentas cliente desde campañas Connect existentes
-- 3. Exponer una vista admin util para postventa y operación
-- ============================================================================

-- 1) Endurecer politica de insercion publica
DROP POLICY IF EXISTS "Public insert connect campaigns" ON public.connect_campaigns;

CREATE POLICY "Public insert connect campaigns"
  ON public.connect_campaigns
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    package_code IS NOT NULL
    AND package_name IS NOT NULL
    AND billing_email IS NOT NULL
    AND batch_size > 0
    AND launch_price_mxn >= 0
    AND payment_status IN ('pending', 'paid', 'failed', 'refunded', 'expired')
    AND fulfillment_status IN ('intake', 'brief_review', 'audience_build', 'copy_ready', 'scheduled', 'running', 'reported', 'closed')
  );

-- 2) Funcion para crear / actualizar cuenta cliente desde una campana Connect
CREATE OR REPLACE FUNCTION public.upsert_connect_client_account_from_campaign(p_connect_campaign_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign public.connect_campaigns%ROWTYPE;
  v_lead public.enterprise_leads%ROWTYPE;
  v_client_id uuid;
BEGIN
  SELECT * INTO v_campaign
  FROM public.connect_campaigns
  WHERE id = p_connect_campaign_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_campaign.enterprise_lead_id IS NOT NULL THEN
    SELECT * INTO v_lead
    FROM public.enterprise_leads
    WHERE id = v_campaign.enterprise_lead_id;
  END IF;

  INSERT INTO public.connect_client_accounts (
    company_name,
    primary_contact_name,
    primary_contact_email,
    primary_contact_phone,
    company_website,
    country,
    status,
    notes
  )
  VALUES (
    COALESCE(v_lead.company_name, 'Cliente Connect'),
    v_lead.contact_name,
    COALESCE(v_campaign.billing_email, v_lead.contact_email),
    v_lead.contact_phone,
    v_lead.company_website,
    COALESCE(v_lead.country, 'Mexico'),
    CASE
      WHEN v_campaign.payment_status = 'paid' THEN 'active'
      ELSE 'lead'
    END,
    CONCAT('Backfill Connect | paquete: ', COALESCE(v_campaign.package_name, 'N/D'))
  )
  ON CONFLICT (primary_contact_email)
  DO UPDATE SET
    company_name = EXCLUDED.company_name,
    primary_contact_name = COALESCE(EXCLUDED.primary_contact_name, public.connect_client_accounts.primary_contact_name),
    primary_contact_phone = COALESCE(EXCLUDED.primary_contact_phone, public.connect_client_accounts.primary_contact_phone),
    company_website = COALESCE(EXCLUDED.company_website, public.connect_client_accounts.company_website),
    country = COALESCE(EXCLUDED.country, public.connect_client_accounts.country),
    status = CASE
      WHEN EXCLUDED.status = 'active' THEN 'active'
      ELSE public.connect_client_accounts.status
    END,
    updated_at = NOW()
  RETURNING id INTO v_client_id;

  UPDATE public.connect_campaigns
  SET client_account_id = v_client_id,
      updated_at = NOW()
  WHERE id = p_connect_campaign_id;

  RETURN v_client_id;
END;
$$;

-- 3) Backfill de campañas ya existentes sin cuenta cliente vinculada
WITH candidates AS (
  SELECT id
  FROM public.connect_campaigns
  WHERE client_account_id IS NULL
    AND billing_email IS NOT NULL
)
SELECT public.upsert_connect_client_account_from_campaign(id)
FROM candidates;

-- 4) Vista admin operativa
CREATE OR REPLACE VIEW public.connect_campaigns_admin_v1 AS
SELECT
  cc.id,
  cc.package_code,
  cc.package_name,
  cc.billing_email,
  cc.payment_status,
  cc.fulfillment_status,
  cc.batch_size,
  cc.launch_price_mxn,
  cc.client_account_id,
  cca.company_name AS client_company_name,
  cca.primary_contact_name,
  cca.primary_contact_email,
  cca.primary_contact_phone,
  cca.country AS client_country,
  cca.status AS client_status,
  el.id AS enterprise_lead_id,
  el.company_name AS lead_company_name,
  el.contact_name AS lead_contact_name,
  el.contact_email AS lead_contact_email,
  el.contact_phone AS lead_contact_phone,
  el.target_cities,
  cc.created_at,
  cc.updated_at
FROM public.connect_campaigns cc
LEFT JOIN public.connect_client_accounts cca ON cca.id = cc.client_account_id
LEFT JOIN public.enterprise_leads el ON el.id = cc.enterprise_lead_id;

COMMENT ON VIEW public.connect_campaigns_admin_v1 IS
'Vista admin de Geobooker Connect con cuenta cliente, lead comercial y estado operativo unificados.';
