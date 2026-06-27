-- ============================================================================
-- CRM COMMERCIAL EVENTS BRIDGE
-- Unifica compras de Ads / Connect dentro del CRM comercial y fiscal
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_commercial_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL,
    source_id UUID,
    stripe_session_id TEXT,
    stripe_payment_intent TEXT,
    customer_email TEXT,
    customer_name TEXT,
    company_name TEXT,
    service_line TEXT,
    package_name TEXT,
    currency TEXT DEFAULT 'MXN',
    amount NUMERIC(12,2) DEFAULT 0,
    billing_country TEXT,
    tax_status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    operational_status TEXT DEFAULT 'new',
    crm_status TEXT DEFAULT 'new',
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT crm_commercial_events_source_unique UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_commercial_events_payment_status
ON public.crm_commercial_events(payment_status);

CREATE INDEX IF NOT EXISTS idx_crm_commercial_events_crm_status
ON public.crm_commercial_events(crm_status);

CREATE INDEX IF NOT EXISTS idx_crm_commercial_events_billing_country
ON public.crm_commercial_events(billing_country);

CREATE INDEX IF NOT EXISTS idx_crm_commercial_events_created_at
ON public.crm_commercial_events(created_at DESC);

ALTER TABLE public.crm_commercial_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only access crm_commercial_events" ON public.crm_commercial_events;
CREATE POLICY "Admin only access crm_commercial_events"
ON public.crm_commercial_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
  )
);

DROP TRIGGER IF EXISTS update_crm_commercial_events_updated_at ON public.crm_commercial_events;
CREATE TRIGGER update_crm_commercial_events_updated_at
BEFORE UPDATE ON public.crm_commercial_events
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

INSERT INTO public.crm_commercial_events (
    source_type,
    source_id,
    stripe_payment_intent,
    customer_email,
    customer_name,
    company_name,
    service_line,
    package_name,
    currency,
    amount,
    billing_country,
    tax_status,
    payment_status,
    payment_method,
    operational_status,
    crm_status,
    notes,
    metadata
)
SELECT
    'ad_campaign' AS source_type,
    ac.id AS source_id,
    ac.stripe_payment_intent,
    ac.advertiser_email,
    ac.advertiser_name,
    ac.advertiser_name,
    'geobooker_ads' AS service_line,
    COALESCE(ac.ad_level, ac.campaign_type, 'ad_campaign') AS package_name,
    COALESCE(ac.currency, CASE WHEN COALESCE(ac.billing_country, 'MX') = 'MX' THEN 'MXN' ELSE 'USD' END) AS currency,
    COALESCE(ac.total_budget, ac.budget, 0) AS amount,
    COALESCE(ac.billing_country, 'MX') AS billing_country,
    COALESCE(ac.tax_status, CASE WHEN COALESCE(ac.billing_country, 'MX') = 'MX' THEN 'domestic_mx' ELSE 'export_0_iva' END) AS tax_status,
    COALESCE(ac.payment_status, CASE WHEN ac.status IN ('pending_review', 'active', 'approved', 'completed') THEN 'paid' ELSE 'pending' END) AS payment_status,
    COALESCE(ac.payment_method, 'card') AS payment_method,
    COALESCE(ac.status, 'draft') AS operational_status,
    'new' AS crm_status,
    CONCAT('Ads purchase | ', COALESCE(ac.target_location, 'Sin segmentacion')) AS notes,
    jsonb_build_object(
      'target_location', ac.target_location,
      'status', ac.status,
      'campaign_type', ac.campaign_type,
      'ad_level', ac.ad_level
    ) AS metadata
FROM public.ad_campaigns ac
WHERE COALESCE(ac.payment_status, 'pending') IN ('paid', 'completed')
   OR ac.status IN ('pending_review', 'active', 'approved', 'completed')
ON CONFLICT (source_type, source_id) DO UPDATE SET
    stripe_payment_intent = EXCLUDED.stripe_payment_intent,
    customer_email = EXCLUDED.customer_email,
    customer_name = EXCLUDED.customer_name,
    company_name = EXCLUDED.company_name,
    package_name = EXCLUDED.package_name,
    currency = EXCLUDED.currency,
    amount = EXCLUDED.amount,
    billing_country = EXCLUDED.billing_country,
    tax_status = EXCLUDED.tax_status,
    payment_status = EXCLUDED.payment_status,
    payment_method = EXCLUDED.payment_method,
    operational_status = EXCLUDED.operational_status,
    notes = EXCLUDED.notes,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

INSERT INTO public.crm_commercial_events (
    source_type,
    source_id,
    stripe_session_id,
    stripe_payment_intent,
    customer_email,
    customer_name,
    company_name,
    service_line,
    package_name,
    currency,
    amount,
    billing_country,
    tax_status,
    payment_status,
    payment_method,
    operational_status,
    crm_status,
    notes,
    metadata
)
SELECT
    'connect_campaign' AS source_type,
    cc.id AS source_id,
    cc.stripe_session_id,
    cc.stripe_payment_intent,
    cc.billing_email,
    el.contact_name,
    COALESCE(el.company_name, cc.package_name),
    'geobooker_connect' AS service_line,
    cc.package_name,
    'MXN' AS currency,
    COALESCE(cc.launch_price_mxn, 0) AS amount,
    'MX' AS billing_country,
    'domestic_mx' AS tax_status,
    COALESCE(cc.payment_status, 'pending') AS payment_status,
    'card' AS payment_method,
    COALESCE(cc.fulfillment_status, 'intake') AS operational_status,
    'new' AS crm_status,
    CONCAT('Connect reservation | Batch ', COALESCE(cc.batch_size, 0)) AS notes,
    jsonb_build_object(
      'batch_size', cc.batch_size,
      'fulfillment_status', cc.fulfillment_status,
      'enterprise_lead_id', cc.enterprise_lead_id
    ) AS metadata
FROM public.connect_campaigns cc
LEFT JOIN public.enterprise_leads el ON el.id = cc.enterprise_lead_id
WHERE COALESCE(cc.payment_status, 'pending') IN ('paid', 'refunded', 'failed', 'expired')
ON CONFLICT (source_type, source_id) DO UPDATE SET
    stripe_session_id = EXCLUDED.stripe_session_id,
    stripe_payment_intent = EXCLUDED.stripe_payment_intent,
    customer_email = EXCLUDED.customer_email,
    customer_name = EXCLUDED.customer_name,
    company_name = EXCLUDED.company_name,
    package_name = EXCLUDED.package_name,
    amount = EXCLUDED.amount,
    payment_status = EXCLUDED.payment_status,
    operational_status = EXCLUDED.operational_status,
    notes = EXCLUDED.notes,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

CREATE OR REPLACE VIEW public.crm_commercial_events_summary AS
SELECT
    source_type,
    payment_status,
    billing_country,
    tax_status,
    COUNT(*) AS total_operations,
    SUM(amount) AS total_amount
FROM public.crm_commercial_events
GROUP BY source_type, payment_status, billing_country, tax_status;
