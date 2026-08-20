-- Keep CRM email analytics aligned with Resend webhook event types.
-- Resend emits delivery_delayed, failed and suppressed in addition to
-- sent/delivered/opened/clicked/bounced/complained.

ALTER TABLE IF EXISTS public.email_analytics
  DROP CONSTRAINT IF EXISTS email_analytics_event_type_check;

ALTER TABLE IF EXISTS public.email_analytics
  ADD CONSTRAINT email_analytics_event_type_check
  CHECK (
    event_type IN (
      'sent',
      'delivered',
      'delivery_delayed',
      'opened',
      'clicked',
      'bounced',
      'complained',
      'failed',
      'suppressed'
    )
  );

CREATE INDEX IF NOT EXISTS idx_email_analytics_delivery_health
  ON public.email_analytics (event_type, timestamp DESC);
