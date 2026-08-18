-- CRM 2.0 WhatsApp foundation (additive only).
-- This migration creates no sends, imports no contacts and stores no provider secrets.

CREATE SCHEMA IF NOT EXISTS crm;

REVOKE ALL ON SCHEMA crm FROM PUBLIC;
REVOKE ALL ON SCHEMA crm FROM anon;
GRANT USAGE ON SCHEMA crm TO authenticated, service_role;

CREATE OR REPLACE FUNCTION crm.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  allowed BOOLEAN := FALSE;
BEGIN
  IF check_user_id IS NULL OR to_regclass('public.admin_users') IS NULL THEN
    RETURN FALSE;
  END IF;

  EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE id = $1)'
    INTO allowed
    USING check_user_id;

  RETURN COALESCE(allowed, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION crm.is_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION crm.is_admin(UUID) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS crm.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source_id TEXT,
  external_account_id TEXT,
  legal_name TEXT,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  normalized_domain TEXT,
  website_url TEXT,
  industry TEXT,
  source_tier TEXT CHECK (source_tier IS NULL OR source_tier IN ('AAA', 'AA', 'A', 'B')),
  employee_count_estimate INTEGER CHECK (employee_count_estimate IS NULL OR employee_count_estimate >= 0),
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  region TEXT,
  city TEXT,
  city_raw TEXT,
  postal_code TEXT,
  neighborhood TEXT,
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'inactive', 'needs_review', 'merged', 'archived')),
  linked_business_id UUID,
  assigned_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_source_id, external_account_id)
);

CREATE TABLE IF NOT EXISTS crm.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source_id TEXT,
  external_contact_id TEXT,
  full_name TEXT,
  normalized_name TEXT,
  first_name TEXT,
  last_name TEXT,
  job_title TEXT,
  seniority_source TEXT,
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  language_code TEXT,
  timezone TEXT,
  contact_status TEXT NOT NULL DEFAULT 'active'
    CHECK (contact_status IN ('active', 'inactive', 'needs_review', 'merged', 'archived')),
  assigned_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_source_id, external_contact_id)
);

CREATE TABLE IF NOT EXISTS crm.account_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES crm.accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm.contacts(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'employee',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, contact_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS crm.contact_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES crm.contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES crm.accounts(id) ON DELETE CASCADE,
  point_type TEXT NOT NULL CHECK (point_type IN ('email', 'phone', 'whatsapp')),
  raw_value TEXT,
  normalized_value TEXT NOT NULL,
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  normalization_method TEXT,
  normalization_confidence TEXT CHECK (
    normalization_confidence IS NULL OR normalization_confidence IN ('high', 'medium', 'low', 'ambiguous')
  ),
  validation_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (validation_status IN ('unverified', 'valid', 'invalid', 'ambiguous')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((contact_id IS NOT NULL) <> (account_id IS NOT NULL)),
  UNIQUE (contact_id, account_id, point_type, normalized_value)
);

CREATE TABLE IF NOT EXISTS crm.channel_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES crm.contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'phone')),
  purpose TEXT NOT NULL CHECK (purpose IN ('marketing', 'transactional', 'service')),
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (
    status IN ('unknown', 'allowed', 'opted_in', 'opted_out', 'suppressed', 'bounced', 'invalid', 'complaint')
  ),
  legal_basis TEXT,
  jurisdiction TEXT,
  consent_source TEXT,
  consent_text_version TEXT,
  consented_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contact_id, channel, purpose)
);

CREATE TABLE IF NOT EXISTS crm.suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES crm.contacts(id) ON DELETE SET NULL,
  contact_point_id UUID REFERENCES crm.contact_points(id) ON DELETE SET NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'phone', 'whatsapp')),
  normalized_identifier TEXT NOT NULL,
  channel TEXT CHECK (channel IS NULL OR channel IN ('email', 'whatsapp', 'sms', 'phone')),
  reason TEXT NOT NULL CHECK (
    reason IN ('opt_out', 'hard_bounce', 'soft_bounce', 'complaint', 'invalid', 'manual_block', 'legal_hold')
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  source TEXT NOT NULL,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((status = 'active' AND released_at IS NULL) OR status = 'released')
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_suppressions_identity_active_uidx
  ON crm.suppressions (identifier_type, normalized_identifier, COALESCE(channel, '*'))
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS crm.whatsapp_business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'meta_cloud' CHECK (provider = 'meta_cloud'),
  provider_business_account_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'test', 'active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.whatsapp_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id UUID NOT NULL REFERENCES crm.whatsapp_business_accounts(id) ON DELETE RESTRICT,
  provider_phone_number_id TEXT NOT NULL UNIQUE,
  display_phone_number TEXT,
  normalized_phone TEXT,
  verified_name TEXT,
  quality_rating TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'test', 'active', 'restricted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id UUID NOT NULL REFERENCES crm.whatsapp_business_accounts(id) ON DELETE CASCADE,
  provider_template_id TEXT,
  template_name TEXT NOT NULL,
  language_code TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('marketing', 'utility', 'authentication')),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    approval_status IN ('pending', 'approved', 'rejected', 'paused', 'disabled', 'deleted')
  ),
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  quality_score TEXT,
  provider_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_account_id, template_name, language_code)
);

CREATE TABLE IF NOT EXISTS crm.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_phone_number_id UUID NOT NULL REFERENCES crm.whatsapp_phone_numbers(id) ON DELETE RESTRICT,
  contact_id UUID NOT NULL REFERENCES crm.contacts(id) ON DELETE RESTRICT,
  contact_point_id UUID NOT NULL REFERENCES crm.contact_points(id) ON DELETE RESTRICT,
  account_id UUID REFERENCES crm.accounts(id) ON DELETE SET NULL,
  provider_wa_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'snoozed', 'closed', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_window_expires_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (whatsapp_phone_number_id, contact_point_id)
);

CREATE TABLE IF NOT EXISTS crm.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES crm.conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL CHECK (
    message_type IN ('text', 'template', 'image', 'audio', 'video', 'document', 'location', 'interactive', 'reaction', 'unknown')
  ),
  provider_message_id TEXT UNIQUE,
  client_idempotency_key TEXT UNIQUE,
  reply_to_message_id UUID REFERENCES crm.messages(id) ON DELETE SET NULL,
  template_id UUID REFERENCES crm.whatsapp_templates(id) ON DELETE SET NULL,
  body_text TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    current_status IN ('pending', 'queued', 'accepted', 'sent', 'delivered', 'read', 'failed', 'unknown', 'received', 'deleted')
  ),
  provider_timestamp TIMESTAMPTZ,
  initiated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  crm_campaign_id UUID,
  failure_code TEXT,
  failure_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.message_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES crm.messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'sent', 'delivered', 'read', 'failed', 'deleted', 'received')),
  provider_timestamp TIMESTAMPTZ NOT NULL,
  provider_event_fingerprint TEXT NOT NULL UNIQUE,
  error_code TEXT,
  error_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, status, provider_timestamp)
);

CREATE TABLE IF NOT EXISTS crm.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'meta_whatsapp' CHECK (provider = 'meta_whatsapp'),
  payload_hash TEXT NOT NULL UNIQUE,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  event_type TEXT,
  provider_message_id TEXT,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (
    processing_status IN ('received', 'processing', 'processed', 'ignored', 'failed', 'dead_letter')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm.outbound_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES crm.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES crm.messages(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL CHECK (job_type IN ('service_reply', 'template', 'campaign')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'accepted', 'completed', 'retry', 'unknown', 'failed', 'cancelled', 'dead_letter')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_detail TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES crm.conversations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  reason TEXT,
  CHECK (unassigned_at IS NULL OR unassigned_at >= assigned_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_agent_assignments_active_uidx
  ON crm.agent_assignments (conversation_id)
  WHERE unassigned_at IS NULL;

CREATE TABLE IF NOT EXISTS crm.conversation_reads (
  conversation_id UUID NOT NULL REFERENCES crm.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES crm.messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS crm.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES crm.accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm.contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES crm.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES crm.messages(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (account_id IS NOT NULL OR contact_id IS NOT NULL OR conversation_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS crm.budget_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'meta_cloud' CHECK (provider = 'meta_cloud'),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  daily_limit NUMERIC(14, 4) CHECK (daily_limit IS NULL OR daily_limit >= 0),
  monthly_limit NUMERIC(14, 4) CHECK (monthly_limit IS NULL OR monthly_limit >= 0),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  kill_switch BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES crm.messages(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL DEFAULT 'meta_cloud' CHECK (provider = 'meta_cloud'),
  recipient_country_code TEXT CHECK (recipient_country_code IS NULL OR recipient_country_code ~ '^[A-Z]{2}$'),
  category TEXT CHECK (category IS NULL OR category IN ('marketing', 'utility', 'authentication', 'service')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  currency TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  estimated_unit_cost NUMERIC(14, 6) CHECK (estimated_unit_cost IS NULL OR estimated_unit_cost >= 0),
  confirmed_unit_cost NUMERIC(14, 6) CHECK (confirmed_unit_cost IS NULL OR confirmed_unit_cost >= 0),
  rate_card_version TEXT,
  charge_status TEXT NOT NULL DEFAULT 'estimated' CHECK (charge_status IN ('estimated', 'confirmed', 'waived', 'unknown')),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id)
);

CREATE TABLE IF NOT EXISTS crm.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'provider')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  previous_values JSONB,
  new_values JSONB,
  request_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_accounts_domain_idx ON crm.accounts (normalized_domain);
CREATE INDEX IF NOT EXISTS crm_accounts_name_country_idx ON crm.accounts (normalized_name, country_code);
CREATE INDEX IF NOT EXISTS crm_contacts_name_idx ON crm.contacts (normalized_name);
CREATE INDEX IF NOT EXISTS crm_contact_points_lookup_idx ON crm.contact_points (point_type, normalized_value);
CREATE INDEX IF NOT EXISTS crm_permissions_effective_idx ON crm.channel_permissions (channel, purpose, status);
CREATE INDEX IF NOT EXISTS crm_suppressions_lookup_idx ON crm.suppressions (identifier_type, normalized_identifier, status);
CREATE INDEX IF NOT EXISTS crm_conversations_inbox_idx ON crm.conversations (status, assigned_agent_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS crm_conversations_contact_idx ON crm.conversations (contact_id);
CREATE INDEX IF NOT EXISTS crm_messages_conversation_idx ON crm.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_messages_provider_id_idx ON crm.messages (provider_message_id);
CREATE INDEX IF NOT EXISTS crm_webhook_processing_idx ON crm.webhook_events (processing_status, next_attempt_at, received_at);
CREATE INDEX IF NOT EXISTS crm_outbound_jobs_processing_idx ON crm.outbound_jobs (status, next_attempt_at, scheduled_at);
CREATE INDEX IF NOT EXISTS crm_activities_timeline_idx ON crm.activities (contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS crm_usage_ledger_delivery_idx ON crm.usage_ledger (delivered_at, category);
CREATE INDEX IF NOT EXISTS crm_audit_entity_idx ON crm.audit_log (entity_type, entity_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION crm.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, crm
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'accounts', 'contacts', 'account_contacts', 'contact_points', 'channel_permissions',
    'suppressions', 'whatsapp_business_accounts', 'whatsapp_phone_numbers', 'whatsapp_templates',
    'conversations', 'messages', 'outbound_jobs', 'budget_policies', 'usage_ledger'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON crm.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON crm.%I FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at()',
      table_name
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'accounts', 'contacts', 'account_contacts', 'contact_points', 'channel_permissions',
    'suppressions', 'whatsapp_business_accounts', 'whatsapp_phone_numbers', 'whatsapp_templates',
    'conversations', 'messages', 'message_status_events', 'webhook_events', 'outbound_jobs',
    'agent_assignments', 'conversation_reads', 'activities', 'budget_policies', 'usage_ledger', 'audit_log'
  ]
  LOOP
    EXECUTE format('ALTER TABLE crm.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE crm.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS admin_read ON crm.%I', table_name);
    EXECUTE format(
      'CREATE POLICY admin_read ON crm.%I FOR SELECT TO authenticated USING (crm.is_admin(auth.uid()))',
      table_name
    );
  END LOOP;
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA crm FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA crm TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA crm TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA crm TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA crm REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm GRANT USAGE, SELECT ON SEQUENCES TO service_role;

COMMENT ON SCHEMA crm IS 'Canonical CRM 2.0 domain. Legacy public CRM tables remain unchanged.';
COMMENT ON TABLE crm.webhook_events IS 'Signed Meta webhook inbox; raw payload access is service-role only.';
COMMENT ON TABLE crm.outbound_jobs IS 'Server-created jobs only. Presence does not authorize sending.';
COMMENT ON TABLE crm.budget_policies IS 'Fail-closed by default: inactive with kill_switch enabled.';
COMMENT ON TABLE crm.usage_ledger IS 'Estimated or reconciled provider usage; never a hard-coded rate card.';
