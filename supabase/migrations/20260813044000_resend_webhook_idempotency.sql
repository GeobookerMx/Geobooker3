-- Resend webhook replay protection. Additive only; no email is sent by this migration.

CREATE TABLE IF NOT EXISTS public.resend_webhook_events (
  svix_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'processing'
    CHECK (processing_status IN ('processing', 'completed', 'failed')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_error_code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resend_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.resend_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.resend_webhook_events TO service_role;

CREATE INDEX IF NOT EXISTS resend_webhook_events_status_idx
  ON public.resend_webhook_events (processing_status, received_at DESC);
