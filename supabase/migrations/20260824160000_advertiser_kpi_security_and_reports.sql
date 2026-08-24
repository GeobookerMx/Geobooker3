-- Secure advertiser metrics and make public tracking internally consistent.
-- The application report endpoint also verifies campaign ownership server-side.

BEGIN;

ALTER TABLE public.ad_campaign_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own campaign metrics" ON public.ad_campaign_metrics;
DROP POLICY IF EXISTS advertiser_reads_own_campaign_metrics_v2 ON public.ad_campaign_metrics;

CREATE POLICY advertiser_reads_own_campaign_metrics_v2
ON public.ad_campaign_metrics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ad_campaigns campaign
    WHERE campaign.id = ad_campaign_metrics.campaign_id
      AND lower(COALESCE(campaign.advertiser_email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_users admin_user WHERE admin_user.id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.record_ad_impression(
  p_campaign_id UUID,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_device TEXT DEFAULT 'unknown'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_hour TEXT := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'HH24');
  v_country TEXT := LEFT(COALESCE(NULLIF(BTRIM(p_country), ''), 'unknown'), 80);
  v_city TEXT := LEFT(COALESCE(NULLIF(BTRIM(p_city), ''), 'unknown'), 120);
  v_device TEXT := CASE WHEN lower(p_device) IN ('mobile', 'desktop', 'tablet') THEN lower(p_device) ELSE 'unknown' END;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ad_campaigns campaign
    WHERE campaign.id = p_campaign_id
      AND campaign.status = 'active'
      AND (campaign.start_date IS NULL OR campaign.start_date <= v_today)
      AND (campaign.end_date IS NULL OR campaign.end_date >= v_today)
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.ad_campaign_metrics (
    campaign_id, date, impressions, unique_views,
    views_by_country, views_by_city, views_by_device, views_by_hour
  ) VALUES (
    p_campaign_id, v_today, 1, 0,
    jsonb_build_object(v_country, 1),
    jsonb_build_object(v_city, 1),
    jsonb_build_object(v_device, 1),
    jsonb_build_object(v_hour, 1)
  )
  ON CONFLICT (campaign_id, date) DO UPDATE SET
    impressions = public.ad_campaign_metrics.impressions + 1,
    views_by_country = COALESCE(public.ad_campaign_metrics.views_by_country, '{}'::jsonb)
      || jsonb_build_object(v_country, COALESCE((public.ad_campaign_metrics.views_by_country ->> v_country)::INT, 0) + 1),
    views_by_city = COALESCE(public.ad_campaign_metrics.views_by_city, '{}'::jsonb)
      || jsonb_build_object(v_city, COALESCE((public.ad_campaign_metrics.views_by_city ->> v_city)::INT, 0) + 1),
    views_by_device = COALESCE(public.ad_campaign_metrics.views_by_device, '{}'::jsonb)
      || jsonb_build_object(v_device, COALESCE((public.ad_campaign_metrics.views_by_device ->> v_device)::INT, 0) + 1),
    views_by_hour = COALESCE(public.ad_campaign_metrics.views_by_hour, '{}'::jsonb)
      || jsonb_build_object(v_hour, COALESCE((public.ad_campaign_metrics.views_by_hour ->> v_hour)::INT, 0) + 1),
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.record_ad_click(p_campaign_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ad_campaigns campaign
    WHERE campaign.id = p_campaign_id
      AND campaign.status = 'active'
      AND (campaign.start_date IS NULL OR campaign.start_date <= v_today)
      AND (campaign.end_date IS NULL OR campaign.end_date >= v_today)
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.ad_campaign_metrics (campaign_id, date, clicks)
  VALUES (p_campaign_id, v_today, 1)
  ON CONFLICT (campaign_id, date) DO UPDATE SET
    clicks = public.ad_campaign_metrics.clicks + 1,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_report(
  p_campaign_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign public.ad_campaigns%ROWTYPE;
  v_metrics RECORD;
BEGIN
  SELECT * INTO v_campaign FROM public.ad_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'campaign_not_found'); END IF;

  IF NOT (
    lower(COALESCE(v_campaign.advertiser_email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    OR EXISTS (SELECT 1 FROM public.admin_users admin_user WHERE admin_user.id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'campaign_access_denied' USING ERRCODE = '42501';
  END IF;

  p_start_date := COALESCE(p_start_date, v_campaign.start_date, CURRENT_DATE);
  p_end_date := COALESCE(p_end_date, v_campaign.end_date, CURRENT_DATE);

  SELECT
    COALESCE(SUM(impressions), 0) AS total_impressions,
    COALESCE(SUM(clicks), 0) AS total_clicks,
    CASE WHEN COALESCE(SUM(impressions), 0) > 0
      THEN ROUND((SUM(clicks)::NUMERIC / SUM(impressions)) * 100, 2) ELSE 0 END AS ctr_percent,
    COUNT(*) FILTER (WHERE impressions > 0 OR clicks > 0) AS active_days
  INTO v_metrics
  FROM public.ad_campaign_metrics
  WHERE campaign_id = p_campaign_id AND date BETWEEN p_start_date AND p_end_date;

  RETURN jsonb_build_object(
    'campaign', jsonb_build_object(
      'id', v_campaign.id,
      'advertiser', v_campaign.advertiser_name,
      'status', v_campaign.status,
      'start_date', v_campaign.start_date,
      'end_date', v_campaign.end_date,
      'budget', COALESCE(v_campaign.total_budget, v_campaign.budget),
      'currency', COALESCE(v_campaign.currency, 'MXN')
    ),
    'period', jsonb_build_object('from', p_start_date, 'to', p_end_date),
    'metrics', jsonb_build_object(
      'total_impressions', v_metrics.total_impressions,
      'total_clicks', v_metrics.total_clicks,
      'ctr_percent', v_metrics.ctr_percent,
      'active_days', v_metrics.active_days,
      'avg_daily_impressions', CASE WHEN v_metrics.active_days > 0 THEN ROUND(v_metrics.total_impressions::NUMERIC / v_metrics.active_days) ELSE 0 END
    ),
    'generated_at', NOW(),
    'timezone', 'UTC'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_daily_metrics(
  p_campaign_id UUID,
  p_days INT DEFAULT 30
) RETURNS TABLE (
  date DATE,
  impressions INT,
  clicks INT,
  ctr DECIMAL,
  views_by_country JSONB,
  views_by_city JSONB,
  views_by_device JSONB,
  views_by_hour JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ad_campaigns campaign
    WHERE campaign.id = p_campaign_id
      AND (
        lower(COALESCE(campaign.advertiser_email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        OR EXISTS (SELECT 1 FROM public.admin_users admin_user WHERE admin_user.id = auth.uid())
      )
  ) THEN
    RAISE EXCEPTION 'campaign_access_denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT metric.date, metric.impressions, metric.clicks, metric.ctr,
    metric.views_by_country, metric.views_by_city, metric.views_by_device, metric.views_by_hour
  FROM public.ad_campaign_metrics metric
  WHERE metric.campaign_id = p_campaign_id
    AND metric.date >= CURRENT_DATE - LEAST(GREATEST(COALESCE(p_days, 30), 1), 366)
  ORDER BY metric.date DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_campaign_report(UUID, DATE, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_campaign_daily_metrics(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_report(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_daily_metrics(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ad_impression(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ad_click(UUID) TO anon, authenticated;

COMMIT;
