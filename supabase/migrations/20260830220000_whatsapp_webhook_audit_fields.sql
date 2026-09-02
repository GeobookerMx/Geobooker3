-- Explicit Meta webhook identifiers and safe normalized audit metadata.
-- Additive only: no phone number, WABA credential or Meta token is stored here.

ALTER TABLE crm.messages
  ADD COLUMN IF NOT EXISTS provider_wa_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE crm.message_status_events
  ADD COLUMN IF NOT EXISTS provider_wa_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS crm_messages_provider_phone_wa_idx
  ON crm.messages (provider_phone_number_id, provider_wa_id, provider_timestamp DESC);

CREATE INDEX IF NOT EXISTS crm_status_events_provider_phone_wa_idx
  ON crm.message_status_events (provider_phone_number_id, provider_wa_id, provider_timestamp DESC);

COMMENT ON COLUMN crm.messages.provider_message_id IS
  'Meta WhatsApp message ID (wamid); UNIQUE enforces webhook idempotency.';
COMMENT ON COLUMN crm.messages.provider_wa_id IS
  'Meta WhatsApp user identifier (wa_id), stored server-side only.';
COMMENT ON COLUMN crm.messages.provider_phone_number_id IS
  'Meta phone_number_id that received or sent the message; not an access token.';
COMMENT ON COLUMN crm.messages.provider_metadata IS
  'Normalized provider metadata; the signed original webhook remains in crm.webhook_events.payload.';
