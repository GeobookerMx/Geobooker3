-- Geobooker Ads: international commercial audit, fiscal controls and KPI summary.
-- Scenario covered: foreign buyer (e.g. ES) buys visibility in another market
-- (e.g. CO) with controlled billing, service evidence, expense caps and localized
-- campaign performance reporting.

BEGIN;

ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS advertiser_name TEXT,
  ADD COLUMN IF NOT EXISTS advertiser_email TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_budget NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_with_iva NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'MX',
  ADD COLUMN IF NOT EXISTS target_country TEXT,
  ADD COLUMN IF NOT EXISTS target_location TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS client_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invoice_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'not_generated',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS buyer_country TEXT,
  ADD COLUMN IF NOT EXISTS buyer_language TEXT DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS service_delivery_country TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_review_status TEXT DEFAULT 'pending'
    CHECK (fiscal_review_status IN ('pending', 'domestic_mx', 'export_review_required', 'export_approved', 'blocked')),
  ADD COLUMN IF NOT EXISTS fiscal_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS quoted_amount_mxn NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS quoted_amount_usd NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS exchange_rate_mxn_usd NUMERIC(12,6),
  ADD COLUMN IF NOT EXISTS expense_cap_mxn NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fulfillment_language TEXT DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS kpi_report_language TEXT DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS kpi_report_status TEXT DEFAULT 'not_ready'
    CHECK (kpi_report_status IN ('not_ready', 'ready', 'sent')),
  ADD COLUMN IF NOT EXISTS kpi_report_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commercial_audit JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.ad_campaign_commercial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  audit_status TEXT NOT NULL CHECK (audit_status IN ('ready', 'blocked', 'review_required')),
  audit_language TEXT NOT NULL DEFAULT 'es',
  scenario TEXT NOT NULL DEFAULT 'standard',
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  controls JSONB NOT NULL DEFAULT '{}'::jsonb,
  fiscal_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  kpi_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_campaign_commercial_audit_log_campaign_idx
  ON public.ad_campaign_commercial_audit_log (campaign_id, created_at DESC);

ALTER TABLE public.ad_campaign_commercial_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaign_commercial_audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ad_campaign_commercial_audit_admin_all_v1
  ON public.ad_campaign_commercial_audit_log;
CREATE POLICY ad_campaign_commercial_audit_admin_all_v1
  ON public.ad_campaign_commercial_audit_log
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid()));

DROP POLICY IF EXISTS ad_campaign_commercial_audit_advertiser_read_v1
  ON public.ad_campaign_commercial_audit_log;
CREATE POLICY ad_campaign_commercial_audit_advertiser_read_v1
  ON public.ad_campaign_commercial_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ad_campaigns c
      WHERE c.id = ad_campaign_commercial_audit_log.campaign_id
        AND lower(coalesce(c.advertiser_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

GRANT SELECT ON public.ad_campaign_commercial_audit_log TO authenticated;
GRANT ALL ON public.ad_campaign_commercial_audit_log TO service_role;
REVOKE ALL ON public.ad_campaign_commercial_audit_log FROM anon;

CREATE OR REPLACE FUNCTION public.ads_campaign_kpi_summary(
  p_campaign_id UUID,
  p_language TEXT DEFAULT 'es'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign public.ad_campaigns%ROWTYPE;
  v_language TEXT := CASE WHEN lower(coalesce(p_language, 'es')) LIKE 'en%' THEN 'en' ELSE 'es' END;
  v_impressions INTEGER := 0;
  v_clicks INTEGER := 0;
  v_ctr NUMERIC := 0;
  v_active_days INTEGER := 0;
  v_recommendations JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_campaign FROM public.ad_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'campaign_not_found');
  END IF;

  IF NOT (
    lower(coalesce(v_campaign.advertiser_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'campaign_access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT
    coalesce(sum(impressions), 0)::integer,
    coalesce(sum(clicks), 0)::integer,
    count(*) FILTER (WHERE impressions > 0 OR clicks > 0)::integer
  INTO v_impressions, v_clicks, v_active_days
  FROM public.ad_campaign_metrics
  WHERE campaign_id = p_campaign_id;

  v_ctr := CASE WHEN v_impressions > 0 THEN round((v_clicks::numeric / v_impressions::numeric) * 100, 2) ELSE 0 END;

  IF v_language = 'en' THEN
    v_recommendations := CASE
      WHEN v_impressions = 0 THEN jsonb_build_array('The campaign has no recorded delivery yet. Confirm approval, dates and placement eligibility.')
      WHEN v_ctr < 0.5 THEN jsonb_build_array('Refresh the creative and make the call to action more specific.', 'Review country, city and language targeting before adding budget.')
      WHEN v_ctr < 1.5 THEN jsonb_build_array('The campaign has early traction. Test a second creative variation.', 'Keep the current market and compare performance by city.')
      ELSE jsonb_build_array('Performance is above the initial benchmark. Consider extending the campaign or increasing frequency carefully.')
    END;
  ELSE
    v_recommendations := CASE
      WHEN v_impressions = 0 THEN jsonb_build_array('La campana aun no tiene entrega registrada. Confirma aprobacion, fechas y elegibilidad del espacio.')
      WHEN v_ctr < 0.5 THEN jsonb_build_array('Renovar el creativo y hacer mas especifico el llamado a la accion.', 'Revisar pais, ciudad e idioma antes de aumentar presupuesto.')
      WHEN v_ctr < 1.5 THEN jsonb_build_array('La campana muestra traccion inicial. Probar una segunda variante creativa.', 'Mantener el mercado actual y comparar rendimiento por ciudad.')
      ELSE jsonb_build_array('El rendimiento supera el punto de referencia inicial. Considerar extender la campana o aumentar frecuencia con cuidado.')
    END;
  END IF;

  RETURN jsonb_build_object(
    'language', v_language,
    'campaignId', v_campaign.id,
    'advertiserName', v_campaign.advertiser_name,
    'status', v_campaign.status,
    'paymentStatus', v_campaign.payment_status,
    'period', jsonb_build_object('from', v_campaign.start_date, 'to', v_campaign.end_date),
    'market', jsonb_build_object(
      'billingCountry', coalesce(v_campaign.billing_country, v_campaign.buyer_country),
      'targetCountry', coalesce(v_campaign.target_country, v_campaign.service_delivery_country),
      'targetLocation', v_campaign.target_location
    ),
    'investment', jsonb_build_object(
      'currency', coalesce(v_campaign.currency, 'MXN'),
      'total', coalesce(v_campaign.total_with_iva, v_campaign.total_budget, v_campaign.budget, 0),
      'quotedMxn', v_campaign.quoted_amount_mxn,
      'quotedUsd', v_campaign.quoted_amount_usd
    ),
    'metrics', jsonb_build_object(
      'impressions', v_impressions,
      'clicks', v_clicks,
      'ctrPercent', v_ctr,
      'activeDays', v_active_days
    ),
    'summary', CASE
      WHEN v_language = 'en' THEN
        format('Campaign delivered %s impressions and %s clicks with a CTR of %s%%.', v_impressions, v_clicks, v_ctr)
      ELSE
        format('La campana entrego %s impresiones y %s clics con CTR de %s%%.', v_impressions, v_clicks, v_ctr)
    END,
    'recommendations', v_recommendations,
    'generatedAt', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ads_campaign_commercial_audit(
  p_campaign_id UUID,
  p_language TEXT DEFAULT 'es',
  p_persist BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign public.ad_campaigns%ROWTYPE;
  v_language TEXT := CASE WHEN lower(coalesce(p_language, 'es')) LIKE 'en%' THEN 'en' ELSE 'es' END;
  v_billing_country TEXT;
  v_target_country TEXT;
  v_currency TEXT;
  v_total NUMERIC;
  v_quoted_mxn NUMERIC;
  v_is_crossborder BOOLEAN;
  v_is_high_value BOOLEAN;
  v_blockers JSONB := '[]'::jsonb;
  v_warnings JSONB := '[]'::jsonb;
  v_status TEXT;
  v_fiscal_classification TEXT;
  v_kpi JSONB;
  v_result JSONB;
BEGIN
  SELECT * INTO v_campaign FROM public.ad_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'campaign_not_found');
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid())
    OR lower(coalesce(v_campaign.advertiser_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) THEN
    RAISE EXCEPTION 'campaign_access_denied' USING ERRCODE = '42501';
  END IF;

  v_billing_country := upper(coalesce(nullif(v_campaign.billing_country, ''), nullif(v_campaign.buyer_country, ''), 'MX'));
  v_target_country := upper(coalesce(nullif(v_campaign.target_country, ''), nullif(v_campaign.service_delivery_country, ''), ''));
  v_currency := upper(coalesce(nullif(v_campaign.currency, ''), CASE WHEN v_billing_country = 'MX' THEN 'MXN' ELSE 'USD' END));
  v_total := coalesce(v_campaign.total_with_iva, v_campaign.total_budget, v_campaign.budget, 0);
  v_quoted_mxn := coalesce(
    v_campaign.quoted_amount_mxn,
    CASE
      WHEN v_currency = 'MXN' THEN v_total
      WHEN v_currency = 'USD' AND v_campaign.exchange_rate_mxn_usd IS NOT NULL THEN v_total * v_campaign.exchange_rate_mxn_usd
      ELSE NULL
    END
  );
  v_is_crossborder := v_billing_country <> 'MX' OR (v_target_country <> '' AND v_target_country <> v_billing_country);
  v_is_high_value := coalesce(v_quoted_mxn, CASE WHEN v_currency = 'MXN' THEN v_total ELSE 0 END) >= 18000;

  IF v_campaign.start_date IS NULL OR v_campaign.end_date IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array('campaign_dates_required');
  ELSIF v_campaign.end_date < v_campaign.start_date THEN
    v_blockers := v_blockers || jsonb_build_array('invalid_campaign_dates');
  END IF;

  IF v_billing_country <> 'MX' AND v_currency NOT IN ('USD', 'EUR') THEN
    v_warnings := v_warnings || jsonb_build_array('foreign_buyer_currency_should_be_usd_or_eur');
  END IF;

  IF v_billing_country <> 'MX' AND v_campaign.payment_method = 'oxxo' THEN
    v_blockers := v_blockers || jsonb_build_array('oxxo_only_for_mx_billing');
  END IF;

  IF v_billing_country = 'MX' AND v_campaign.tax_status <> 'domestic_mx' THEN
    v_blockers := v_blockers || jsonb_build_array('mx_billing_requires_domestic_tax_status');
  END IF;

  IF v_billing_country <> 'MX' THEN
    IF coalesce(v_campaign.client_tax_id, '') = '' THEN
      v_warnings := v_warnings || jsonb_build_array('foreign_tax_id_or_vat_id_recommended');
    END IF;
    IF v_target_country = 'MX' THEN
      v_warnings := v_warnings || jsonb_build_array('foreign_buyer_targeting_mx_requires_tax_review');
    END IF;
  END IF;

  IF v_is_high_value THEN
    IF coalesce(v_campaign.contract_status, 'not_generated') NOT IN ('generated', 'sent', 'signed') THEN
      v_blockers := v_blockers || jsonb_build_array('high_value_contract_required');
    END IF;
    IF v_campaign.expense_cap_mxn IS NULL THEN
      v_warnings := v_warnings || jsonb_build_array('expense_cap_mxn_recommended');
    END IF;
  END IF;

  v_fiscal_classification := CASE
    WHEN v_billing_country = 'MX' THEN 'domestic_mx_iva_16'
    WHEN v_target_country = 'MX' THEN 'foreign_buyer_mx_delivery_tax_review'
    ELSE 'foreign_buyer_foreign_delivery_export_review'
  END;

  v_kpi := public.ads_campaign_kpi_summary(p_campaign_id, v_language);
  v_status := CASE
    WHEN jsonb_array_length(v_blockers) > 0 THEN 'blocked'
    WHEN jsonb_array_length(v_warnings) > 0 THEN 'review_required'
    ELSE 'ready'
  END;

  v_result := jsonb_build_object(
    'status', v_status,
    'scenario', CASE
      WHEN v_billing_country = 'ES' AND v_target_country = 'CO' THEN 'spain_buyer_colombia_campaign'
      WHEN v_is_crossborder THEN 'crossborder_ads'
      ELSE 'domestic_ads'
    END,
    'language', v_language,
    'campaignId', v_campaign.id,
    'blockers', v_blockers,
    'warnings', v_warnings,
    'controls', jsonb_build_object(
      'billingCountry', v_billing_country,
      'targetCountry', nullif(v_target_country, ''),
      'currency', v_currency,
      'total', v_total,
      'quotedMxn', v_quoted_mxn,
      'highValueThresholdMxn', 18000,
      'isHighValue', v_is_high_value,
      'oxxoAllowed', v_billing_country = 'MX' AND v_currency = 'MXN',
      'kpiReportLanguage', coalesce(v_campaign.kpi_report_language, v_language)
    ),
    'fiscal', jsonb_build_object(
      'classification', v_fiscal_classification,
      'reviewStatus', coalesce(v_campaign.fiscal_review_status, 'pending'),
      'taxStatus', v_campaign.tax_status,
      'invoiceRequired', coalesce(v_campaign.invoice_required, true),
      'note', CASE
        WHEN v_billing_country = 'MX' THEN 'Operacion nacional MX: IVA 16% salvo criterio fiscal distinto.'
        ELSE 'Operacion internacional: requiere expediente fiscal, contrato y evidencia de aprovechamiento/entrega antes de tratar como exportacion.'
      END
    ),
    'kpi', v_kpi,
    'checkedAt', now()
  );

  IF p_persist THEN
    INSERT INTO public.ad_campaign_commercial_audit_log (
      campaign_id, audit_status, audit_language, scenario, blockers, warnings,
      controls, fiscal_snapshot, kpi_snapshot
    ) VALUES (
      p_campaign_id,
      v_status,
      v_language,
      v_result ->> 'scenario',
      v_blockers,
      v_warnings,
      v_result -> 'controls',
      v_result -> 'fiscal',
      v_kpi
    );

    UPDATE public.ad_campaigns
    SET
      commercial_audit = v_result,
      fiscal_review_status = CASE
        WHEN v_status = 'blocked' THEN 'blocked'
        WHEN v_billing_country = 'MX' THEN 'domestic_mx'
        ELSE 'export_review_required'
      END,
      kpi_report_status = CASE
        WHEN coalesce((v_kpi #>> '{metrics,impressions}')::integer, 0) > 0 THEN 'ready'
        ELSE coalesce(kpi_report_status, 'not_ready')
      END,
      updated_at = now()
    WHERE id = p_campaign_id;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.ads_campaign_kpi_summary(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ads_campaign_commercial_audit(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ads_campaign_kpi_summary(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ads_campaign_commercial_audit(UUID, TEXT, BOOLEAN) TO authenticated, service_role;

COMMENT ON FUNCTION public.ads_campaign_commercial_audit(UUID, TEXT, BOOLEAN) IS
  'Audits cross-border Ads campaigns for fiscal controls, spend controls, delivery readiness and localized KPI summary.';
COMMENT ON FUNCTION public.ads_campaign_kpi_summary(UUID, TEXT) IS
  'Returns a localized advertiser-facing KPI summary with recommendations.';

COMMIT;
