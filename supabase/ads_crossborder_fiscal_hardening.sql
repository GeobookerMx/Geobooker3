-- ============================================================================
-- ADS CROSS-BORDER FISCAL HARDENING
-- Preparar campañas publicitarias para segmentación internacional y facturación
-- separando territorio objetivo de territorio de facturación.
-- ============================================================================

ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'MX',
  ADD COLUMN IF NOT EXISTS client_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS client_legal_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MXN';

COMMENT ON COLUMN public.ad_campaigns.billing_country IS 'País de facturación del cliente; no debe confundirse con target_country.';
COMMENT ON COLUMN public.ad_campaigns.client_tax_id IS 'RFC, VAT ID o Tax ID del anunciante.';
COMMENT ON COLUMN public.ad_campaigns.client_legal_name IS 'Razón social o nombre fiscal del anunciante.';
COMMENT ON COLUMN public.ad_campaigns.invoice_required IS 'Indica si el cliente solicita documento fiscal o invoice.';
COMMENT ON COLUMN public.ad_campaigns.tax_status IS 'pending, domestic_mx, export_0_iva u otro estado validado por contabilidad.';
COMMENT ON COLUMN public.ad_campaigns.currency IS 'Moneda operativa registrada para la venta publicitaria.';

UPDATE public.ad_campaigns
SET billing_country = COALESCE(NULLIF(billing_country, ''), 'MX')
WHERE billing_country IS NULL OR billing_country = '';

UPDATE public.ad_campaigns
SET tax_status = CASE
  WHEN COALESCE(NULLIF(billing_country, ''), 'MX') = 'MX' THEN 'domestic_mx'
  ELSE 'export_0_iva'
END
WHERE tax_status IS NULL OR tax_status = '' OR tax_status = 'pending';

UPDATE public.ad_campaigns
SET currency = CASE
  WHEN COALESCE(NULLIF(billing_country, ''), 'MX') = 'MX' THEN 'MXN'
  ELSE 'USD'
END
WHERE currency IS NULL OR currency = '';

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_billing_country ON public.ad_campaigns (billing_country);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_tax_status ON public.ad_campaigns (tax_status);
