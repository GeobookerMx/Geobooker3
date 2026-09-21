-- Additive local governance for Meta WhatsApp templates.
-- Meta remains source of truth for provider identity/status/category/locale.
-- This migration does not call Meta, edit templates, enqueue jobs or send.

ALTER TABLE crm.whatsapp_templates
  ADD COLUMN IF NOT EXISTS header_text TEXT,
  ADD COLUMN IF NOT EXISTS body_text TEXT,
  ADD COLUMN IF NOT EXISTS footer_text TEXT,
  ADD COLUMN IF NOT EXISTS buttons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variable_count INTEGER NOT NULL DEFAULT 0 CHECK (variable_count >= 0),
  ADD COLUMN IF NOT EXISTS variable_examples JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_hash TEXT,
  ADD COLUMN IF NOT EXISTS enabled_for_campaigns BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS campaign_role TEXT,
  ADD COLUMN IF NOT EXISTS template_family TEXT,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (reconciliation_status IN (
      'unreviewed', 'pass', 'locale_mismatch', 'name_mismatch', 'duplicate',
      'legacy', 'missing_expected', 'status_not_approved', 'quality_pending',
      'ready_for_campaign'
    )),
  ADD COLUMN IF NOT EXISTS reconciliation_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS crm_whatsapp_templates_campaign_gate_idx
  ON crm.whatsapp_templates (
    business_account_id,
    enabled_for_campaigns,
    approval_status,
    language_code,
    template_family
  );

REVOKE ALL ON TABLE crm.whatsapp_templates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.whatsapp_templates TO service_role;
REVOKE DELETE ON TABLE crm.whatsapp_templates FROM service_role;

COMMENT ON COLUMN crm.whatsapp_templates.enabled_for_campaigns IS
  'Local human-controlled campaign allow flag. Meta approval alone never enables a template.';
COMMENT ON COLUMN crm.whatsapp_templates.raw_hash IS
  'SHA-256 of the last provider snapshot used to detect component/status drift.';
COMMENT ON COLUMN crm.whatsapp_templates.reconciliation_status IS
  'Local reconciliation result; it never modifies the provider template.';

