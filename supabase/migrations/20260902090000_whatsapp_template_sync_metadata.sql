-- Additive metadata required to preserve Meta's exact template status and sync time.
-- Rollback: ALTER TABLE crm.whatsapp_templates DROP COLUMN last_synced_at, DROP COLUMN provider_status;

ALTER TABLE crm.whatsapp_templates
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS crm_whatsapp_templates_sync_idx
  ON crm.whatsapp_templates (last_synced_at DESC);

COMMENT ON COLUMN crm.whatsapp_templates.provider_status IS
  'Exact status returned by Meta; approval_status remains the normalized internal value.';
COMMENT ON COLUMN crm.whatsapp_templates.last_synced_at IS
  'Last successful observation of this template during an explicit Meta sync.';
