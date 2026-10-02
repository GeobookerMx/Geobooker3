-- Geobooker Ads: Stripe webhook audit and idempotency.
-- Keeps payment fulfillment, OXXO, contracts and CRM commercial events traceable.

BEGIN;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  livemode BOOLEAN NOT NULL DEFAULT false,
  api_version TEXT,
  object_id TEXT,
  processing_status TEXT NOT NULL DEFAULT 'processing'
    CHECK (processing_status IN ('processing', 'processed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_status_idx
  ON public.stripe_webhook_events (processing_status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_type_idx
  ON public.stripe_webhook_events (event_type, last_seen_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.stripe_webhook_events TO service_role;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Service-role-only Stripe webhook inbox for Ads/Premium/Connect idempotency and audit.';

COMMIT;
