-- Add post-sale email tracking fields for Geobooker Ads CRM.
-- These columns allow the admin CRM to send a real Resend email and keep
-- an auditable marker on the ad campaign after completion.

ALTER TABLE IF EXISTS public.ad_campaigns
  ADD COLUMN IF NOT EXISTS post_sale_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS post_sale_email_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_sale_email_subject TEXT,
  ADD COLUMN IF NOT EXISTS post_sale_email_resend_id TEXT,
  ADD COLUMN IF NOT EXISTS post_sale_email_status TEXT NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS post_sale_email_last_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ad_campaigns_post_sale_email_status_check'
      AND conrelid = 'public.ad_campaigns'::regclass
  ) THEN
    ALTER TABLE public.ad_campaigns
      ADD CONSTRAINT ad_campaigns_post_sale_email_status_check
      CHECK (post_sale_email_status IN ('not_sent', 'sent', 'failed', 'skipped'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_post_sale_email_status
  ON public.ad_campaigns (post_sale_email_status, post_sale_email_date DESC);

COMMENT ON COLUMN public.ad_campaigns.post_sale_email_sent IS
  'True after an admin sends the post-sale results email to the advertiser.';
COMMENT ON COLUMN public.ad_campaigns.post_sale_email_date IS
  'Timestamp when the post-sale email was sent.';
COMMENT ON COLUMN public.ad_campaigns.post_sale_email_resend_id IS
  'Provider message id returned by Resend/Geobooker email function.';
