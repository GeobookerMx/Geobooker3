-- Geobooker CRM + Resend governance, Aug 2026.
-- Safe defaults:
-- - Queue preparation is allowed.
-- - Actual sending is paused until explicitly approved/enabled.
-- - Limits are conservative and can be raised from crm_settings after review.

BEGIN;

INSERT INTO public.crm_settings (setting_key, setting_value, description)
VALUES (
  'campaign_limits',
  '{
    "daily_email_limit": 100,
    "daily_whatsapp_limit": 50,
    "batch_size": 10,
    "email_batch_limit": 25,
    "emails_per_run": 25,
    "email_request_delay_ms": 250,
    "email_sending_enabled": false,
    "queue_preparation_requires_review": true,
    "resend_rate_limit_per_second": 5,
    "resend_batch_endpoint_max": 100
  }'::jsonb,
  'Campaign sending limits and throttling'
)
ON CONFLICT (setting_key) DO UPDATE
SET
  setting_value = COALESCE(public.crm_settings.setting_value, '{}'::jsonb)
    || jsonb_build_object(
      'daily_email_limit', COALESCE(public.crm_settings.setting_value->'daily_email_limit', '100'::jsonb),
      'daily_whatsapp_limit', COALESCE(public.crm_settings.setting_value->'daily_whatsapp_limit', '50'::jsonb),
      'batch_size', COALESCE(public.crm_settings.setting_value->'batch_size', '10'::jsonb),
      'email_batch_limit', COALESCE(public.crm_settings.setting_value->'email_batch_limit', '25'::jsonb),
      'emails_per_run', COALESCE(public.crm_settings.setting_value->'emails_per_run', '25'::jsonb),
      'email_request_delay_ms', COALESCE(public.crm_settings.setting_value->'email_request_delay_ms', '250'::jsonb),
      'email_sending_enabled', COALESCE(public.crm_settings.setting_value->'email_sending_enabled', 'false'::jsonb),
      'queue_preparation_requires_review', COALESCE(public.crm_settings.setting_value->'queue_preparation_requires_review', 'true'::jsonb),
      'resend_rate_limit_per_second', 5,
      'resend_batch_endpoint_max', 100
    ),
  description = 'Campaign sending limits and throttling',
  updated_at = NOW();

COMMIT;
