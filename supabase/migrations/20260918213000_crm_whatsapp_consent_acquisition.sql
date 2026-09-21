-- Public WhatsApp consent acquisition with inbound double opt-in.
-- Public callers never access CRM tables directly; server-side functions use service_role.

CREATE TABLE IF NOT EXISTS crm.whatsapp_consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_phone TEXT NOT NULL CHECK (normalized_phone ~ '^\+[1-9][0-9]{7,14}$'),
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  company_name TEXT CHECK (company_name IS NULL OR char_length(company_name) BETWEEN 2 AND 160),
  language_code TEXT NOT NULL DEFAULT 'es_MX' CHECK (char_length(language_code) BETWEEN 2 AND 16),
  requested_service BOOLEAN NOT NULL DEFAULT TRUE,
  requested_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending_inbound' CHECK (
    status IN ('pending_inbound', 'confirmed', 'expired', 'cancelled', 'blocked_suppressed')
  ),
  confirmation_code_hash TEXT NOT NULL CHECK (confirmation_code_hash ~ '^[a-f0-9]{64}$'),
  consent_text_version TEXT NOT NULL,
  consent_text_sha256 TEXT NOT NULL CHECK (consent_text_sha256 ~ '^[a-f0-9]{64}$'),
  source_type TEXT NOT NULL DEFAULT 'public_form' CHECK (
    source_type IN ('public_form', 'qr_landing', 'advertising_landing', 'business_registration', 'manual_invite')
  ),
  source_path TEXT,
  campaign_code TEXT,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  confirmed_message_id UUID REFERENCES crm.messages(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm.contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK ((status = 'confirmed' AND confirmed_at IS NOT NULL) OR status <> 'confirmed')
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_whatsapp_consent_code_uidx
  ON crm.whatsapp_consent_requests (confirmation_code_hash);
CREATE INDEX IF NOT EXISTS crm_whatsapp_consent_phone_status_idx
  ON crm.whatsapp_consent_requests (normalized_phone, status, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_whatsapp_consent_expiry_idx
  ON crm.whatsapp_consent_requests (status, expires_at)
  WHERE status = 'pending_inbound';
CREATE UNIQUE INDEX IF NOT EXISTS crm_consent_evidence_reference_uidx
  ON crm.consent_evidence (channel_permission_id, evidence_reference)
  WHERE evidence_reference IS NOT NULL;

ALTER TABLE crm.whatsapp_consent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.whatsapp_consent_requests FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE crm.whatsapp_consent_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.whatsapp_consent_requests TO service_role;
REVOKE DELETE ON TABLE crm.whatsapp_consent_requests FROM service_role;

DROP TRIGGER IF EXISTS set_updated_at ON crm.whatsapp_consent_requests;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.whatsapp_consent_requests
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

COMMENT ON TABLE crm.whatsapp_consent_requests IS
  'Server-side pending WhatsApp consent requests. Consent becomes effective only after an inbound confirmation from the same normalized number.';
COMMENT ON COLUMN crm.whatsapp_consent_requests.confirmation_code_hash IS
  'SHA-256 only; the plaintext confirmation code is returned once to the public page and is never stored.';
