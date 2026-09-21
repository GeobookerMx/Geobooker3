-- Meta Business Agent Knowledge Files registry for Geobooker CRM.
-- Purpose: track reviewed, current, customer-facing documents uploaded server-side
-- to Meta Agent Knowledge. This table must remain backend-only.

CREATE SCHEMA IF NOT EXISTS crm;

CREATE TABLE IF NOT EXISTS crm.agent_knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'meta_business_agent',
  provider_file_id TEXT UNIQUE,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_from DATE,
  effective_to DATE,
  status TEXT NOT NULL DEFAULT 'pending_review',
  uploaded_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_file TEXT,
  mime_type TEXT,
  byte_size BIGINT,
  checksum_sha256 TEXT,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  audit_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_knowledge_files_document_type_chk CHECK (
    document_type IN (
      'institutional_one_pager',
      'ads_media_kit',
      'business_registration_guide',
      'features_benefits',
      'official_faq',
      'premium_confirmed',
      'support_escalation_policy',
      'geobooker_leads_official'
    )
  ),
  CONSTRAINT agent_knowledge_files_status_chk CHECK (
    status IN (
      'pending_review',
      'approved_for_upload',
      'uploaded',
      'current',
      'superseded',
      'rejected',
      'deleted',
      'upload_failed'
    )
  )
);

CREATE INDEX IF NOT EXISTS agent_knowledge_files_entity_idx
  ON crm.agent_knowledge_files (entity_id, is_current, status);

CREATE INDEX IF NOT EXISTS agent_knowledge_files_type_version_idx
  ON crm.agent_knowledge_files (document_type, version, is_current);

CREATE INDEX IF NOT EXISTS agent_knowledge_files_uploaded_idx
  ON crm.agent_knowledge_files (uploaded_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS agent_knowledge_files_one_current_per_type_idx
  ON crm.agent_knowledge_files (entity_id, document_type)
  WHERE is_current = TRUE;

ALTER TABLE crm.agent_knowledge_files ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE crm.agent_knowledge_files FROM anon;
REVOKE ALL ON TABLE crm.agent_knowledge_files FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.agent_knowledge_files TO service_role;

COMMENT ON TABLE crm.agent_knowledge_files IS
  'Backend-only registry for customer-facing files uploaded to Meta Business Agent Knowledge.';

COMMENT ON COLUMN crm.agent_knowledge_files.provider_file_id IS
  'Meta file/source identifier returned by Agent Knowledge - Files. Never stores access tokens.';

COMMENT ON COLUMN crm.agent_knowledge_files.is_current IS
  'Only one current document per document_type should be used operationally. Supersede old versions before relying on new public facts.';
