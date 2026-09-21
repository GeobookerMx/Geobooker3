-- Meta Business Agent Connector audit and idempotency foundation.
-- Backend-only. Does not enable production replies, WhatsApp sends, SQL access,
-- arbitrary CRM reads, payments, WABA changes or user administration.

CREATE SCHEMA IF NOT EXISTS crm;

CREATE TABLE IF NOT EXISTS crm.agent_connector_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'meta_business_agent',
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  request_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  external_user_id_hash TEXT,
  conversation_external_id TEXT,
  tenant_key TEXT NOT NULL DEFAULT 'geobooker',
  locale TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  is_mutation BOOLEAN NOT NULL DEFAULT FALSE,
  allowed BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason TEXT,
  idempotency_replayed BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  error_code TEXT,
  sanitized_input JSONB NOT NULL DEFAULT '{}'::JSONB,
  sanitized_result JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT agent_connector_requests_action_chk CHECK (
    action IN (
      'create_lead',
      'update_lead',
      'request_human_handoff',
      'register_advertising_interest',
      'register_business_interest',
      'register_strategic_partner_interest',
      'record_opt_out',
      'get_business_registration_status'
    )
  ),
  CONSTRAINT agent_connector_requests_status_chk CHECK (
    status IN (
      'received',
      'accepted',
      'completed',
      'blocked',
      'invalid',
      'failed',
      'replayed'
    )
  ),
  CONSTRAINT agent_connector_requests_tenant_chk CHECK (tenant_key = 'geobooker')
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_connector_requests_idempotency_uidx
  ON crm.agent_connector_requests (provider, entity_id, action, request_id);

CREATE INDEX IF NOT EXISTS agent_connector_requests_created_idx
  ON crm.agent_connector_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS agent_connector_requests_status_idx
  ON crm.agent_connector_requests (status, action, created_at DESC);

CREATE INDEX IF NOT EXISTS agent_connector_requests_external_hash_idx
  ON crm.agent_connector_requests (external_user_id_hash, created_at DESC)
  WHERE external_user_id_hash IS NOT NULL;

ALTER TABLE crm.agent_connector_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE crm.agent_connector_requests FROM anon;
REVOKE ALL ON TABLE crm.agent_connector_requests FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.agent_connector_requests TO service_role;

COMMENT ON TABLE crm.agent_connector_requests IS
  'Backend-only audit/idempotency log for Meta Business Agent connector calls. Stores sanitized data only.';

COMMENT ON COLUMN crm.agent_connector_requests.request_id IS
  'Provider/client idempotency key. Unique per provider/entity/action.';

COMMENT ON COLUMN crm.agent_connector_requests.external_user_id_hash IS
  'SHA-256 hash of external user identifier; does not store raw WhatsApp IDs for connector audit.';
