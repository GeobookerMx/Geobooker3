-- International Outreach Center, Phase 1.
-- Research, scoring, compliance and human review only. This migration creates
-- no provider calls, no mailbox tokens, no queue worker and no email sends.

BEGIN;

CREATE TABLE IF NOT EXISTS crm.intl_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_key TEXT NOT NULL UNIQUE DEFAULT 'default',
  feature_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  send_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  kill_switch BOOLEAN NOT NULL DEFAULT TRUE,
  daily_new_contact_cap INTEGER NOT NULL DEFAULT 5 CHECK (daily_new_contact_cap BETWEEN 1 AND 5),
  max_followups INTEGER NOT NULL DEFAULT 1 CHECK (max_followups BETWEEN 0 AND 1),
  followup_business_days INTEGER NOT NULL DEFAULT 6 CHECK (followup_business_days BETWEEN 5 AND 7),
  mailbox_provider_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  oauth_ready BOOLEAN NOT NULL DEFAULT FALSE,
  spf_pass BOOLEAN NOT NULL DEFAULT FALSE,
  dkim_pass BOOLEAN NOT NULL DEFAULT FALSE,
  dmarc_pass BOOLEAN NOT NULL DEFAULT FALSE,
  tls_pass BOOLEAN NOT NULL DEFAULT FALSE,
  sender_identity_ready BOOLEAN NOT NULL DEFAULT FALSE,
  postal_address_ready BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_notice_ready BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribe_ready BOOLEAN NOT NULL DEFAULT FALSE,
  claims_approved BOOLEAN NOT NULL DEFAULT FALSE,
  jurisdiction_policy_ready BOOLEAN NOT NULL DEFAULT FALSE,
  score_model_version TEXT NOT NULL DEFAULT 'intl_score_v1',
  score_weights JSONB NOT NULL DEFAULT '{"accountWeight":0.6,"contactWeight":0.4,"account":{"sizePresence":15,"industryFit":15,"locations":15,"expansionSignal":15,"adsFit":15,"locationIntelligenceFit":15,"marketEvidence":10},"contact":{"roleFunction":25,"decisionPower":25,"roleFreshness":10,"verifiedCorporateEmail":15,"marketLocation":10,"offerSignalFit":15}}'::jsonb,
  waterfall_config JSONB NOT NULL DEFAULT '[{"provider":"apollo","action":"people_search","enabled":false,"priority":1},{"provider":"apollo","action":"people_enrichment","enabled":false,"priority":2},{"provider":"hunter","action":"email_finder","enabled":false,"priority":3},{"provider":"hunter","action":"email_verifier","enabled":false,"priority":4},{"provider":"snov","action":"manual_or_trial","enabled":false,"priority":5}]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT send_enabled OR (feature_enabled AND NOT kill_switch))
);

CREATE TABLE IF NOT EXISTS crm.intl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  normalized_domain TEXT,
  website_url TEXT,
  industry TEXT,
  headquarters_country_code TEXT CHECK (headquarters_country_code IS NULL OR headquarters_country_code ~ '^[A-Z]{2}$'),
  legal_entity_type TEXT NOT NULL DEFAULT 'unknown' CHECK (legal_entity_type IN ('corporation', 'llc', 'partnership', 'sole_trader', 'government', 'nonprofit', 'unknown')),
  employee_range TEXT,
  location_count INTEGER CHECK (location_count IS NULL OR location_count >= 0),
  strategic_markets JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_fit JSONB NOT NULL DEFAULT '[]'::jsonb,
  discovery_source TEXT NOT NULL,
  discovery_evidence_url TEXT,
  account_score NUMERIC(5,2) CHECK (account_score IS NULL OR account_score BETWEEN 0 AND 100),
  account_tier TEXT CHECK (account_tier IS NULL OR account_tier IN ('AAA', 'AA', 'A', 'RESERVE')),
  score_explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage TEXT NOT NULL DEFAULT 'DISCOVERED' CHECK (stage IN ('DISCOVERED', 'ACCOUNT_QUALIFIED', 'RESERVE', 'BLOCKED', 'ARCHIVED')),
  exclusion_status TEXT NOT NULL DEFAULT 'clear' CHECK (exclusion_status IN ('clear', 'review', 'blocked')),
  assigned_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  qualified_crm_account_id UUID REFERENCES crm.accounts(id) ON DELETE SET NULL,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_intl_accounts_domain_uidx
  ON crm.intl_accounts (normalized_domain) WHERE normalized_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_intl_accounts_score_idx
  ON crm.intl_accounts (account_tier, account_score DESC, stage);

CREATE TABLE IF NOT EXISTS crm.intl_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES crm.intl_accounts(id) ON DELETE CASCADE,
  referred_by_contact_id UUID REFERENCES crm.intl_contacts(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  job_title TEXT,
  seniority TEXT,
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  linkedin_url TEXT,
  corporate_email TEXT,
  normalized_email TEXT,
  email_kind TEXT NOT NULL DEFAULT 'unknown' CHECK (email_kind IN ('corporate_personal', 'corporate_role', 'personal', 'generic', 'unknown')),
  email_verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (email_verification_status IN ('unverified', 'valid', 'accept_all', 'risky', 'invalid', 'privacy_blocked')),
  email_verified_at TIMESTAMPTZ,
  role_last_verified_at TIMESTAMPTZ,
  account_score_snapshot NUMERIC(5,2) CHECK (account_score_snapshot IS NULL OR account_score_snapshot BETWEEN 0 AND 100),
  contact_score NUMERIC(5,2) CHECK (contact_score IS NULL OR contact_score BETWEEN 0 AND 100),
  final_outreach_score NUMERIC(5,2) CHECK (final_outreach_score IS NULL OR final_outreach_score BETWEEN 0 AND 100),
  outreach_tier TEXT CHECK (outreach_tier IS NULL OR outreach_tier IN ('AAA', 'AA', 'A', 'RESERVE')),
  score_explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
  compliance_status TEXT NOT NULL DEFAULT 'MANUAL_REVIEW' CHECK (compliance_status IN ('ALLOWED', 'CORPORATE_ONLY', 'CONSENT_REQUIRED', 'MANUAL_REVIEW', 'BLOCKED')),
  compliance_basis TEXT,
  stage TEXT NOT NULL DEFAULT 'CONTACT_IDENTIFIED' CHECK (stage IN (
    'CONTACT_IDENTIFIED', 'EMAIL_VERIFIED', 'COMPLIANCE_APPROVED', 'READY_FOR_REVIEW',
    'APPROVED', 'QUEUED', 'SENT', 'DELIVERED', 'ENGAGED', 'REPLIED',
    'POSITIVE_REPLY', 'QUALIFIED', 'MEETING', 'OPPORTUNITY', 'TRANSFERRED_TO_CRM',
    'RESERVE', 'SKIPPED', 'NOT_NOW', 'NOT_INTERESTED', 'UNSUBSCRIBED',
    'BOUNCED', 'COMPLAINT', 'BLOCKED', 'ARCHIVED'
  )),
  qualified_crm_contact_id UUID REFERENCES crm.contacts(id) ON DELETE SET NULL,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_intl_contacts_account_email_uidx
  ON crm.intl_contacts (account_id, normalized_email) WHERE normalized_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_intl_contacts_review_idx
  ON crm.intl_contacts (stage, outreach_tier, final_outreach_score DESC);

CREATE TABLE IF NOT EXISTS crm.intl_contact_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES crm.intl_accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm.intl_contacts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_record_id TEXT,
  source_url TEXT,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  evidence_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (account_id IS NOT NULL OR contact_id IS NOT NULL),
  UNIQUE (provider, provider_record_id)
);

CREATE TABLE IF NOT EXISTS crm.intl_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('apollo', 'hunter', 'snov', 'manual')),
  mode TEXT NOT NULL DEFAULT 'disabled' CHECK (mode IN ('disabled', 'manual', 'trial', 'api')),
  connection_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (connection_status IN ('not_configured', 'configured', 'healthy', 'degraded', 'blocked')),
  secret_reference TEXT,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  monthly_credit_cap NUMERIC(12,2) CHECK (monthly_credit_cap IS NULL OR monthly_credit_cap >= 0),
  last_known_remaining NUMERIC(12,2) CHECK (last_known_remaining IS NULL OR last_known_remaining >= 0),
  usage_reset_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (secret_reference IS NULL OR secret_reference !~* '(api[_-]?key|secret|token)[=:]')
);

CREATE TABLE IF NOT EXISTS crm.intl_provider_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  account_id UUID REFERENCES crm.intl_accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm.intl_contacts(id) ON DELETE SET NULL,
  estimated_credits NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (estimated_credits >= 0),
  confirmed_credits NUMERIC(12,2) CHECK (confirmed_credits IS NULL OR confirmed_credits >= 0),
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'not_found', 'failed', 'blocked', 'dry_run')),
  provider_request_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS crm_intl_provider_usage_idx
  ON crm.intl_provider_usage (provider, occurred_at DESC);

CREATE TABLE IF NOT EXISTS crm.intl_enrichment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  account_id UUID REFERENCES crm.intl_accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm.intl_contacts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared', 'running', 'completed', 'not_found', 'failed', 'blocked')),
  credits_reserved NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credits_reserved >= 0),
  credits_consumed NUMERIC(12,2) CHECK (credits_consumed IS NULL OR credits_consumed >= 0),
  sanitized_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  next_step TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (account_id IS NOT NULL OR contact_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS crm.intl_campaign_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  target_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  offer_key TEXT NOT NULL,
  cta_url TEXT NOT NULL,
  default_utm_campaign TEXT NOT NULL,
  allowed_claims JSONB NOT NULL DEFAULT '[]'::jsonb,
  prohibited_claims JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.intl_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES crm.intl_campaign_families(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review_ready', 'approved', 'paused', 'completed', 'cancelled')),
  target_markets JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily_new_contact_cap INTEGER NOT NULL DEFAULT 5 CHECK (daily_new_contact_cap BETWEEN 1 AND 5),
  max_followups INTEGER NOT NULL DEFAULT 1 CHECK (max_followups BETWEEN 0 AND 1),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'approved' OR (approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS crm.intl_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES crm.intl_campaign_families(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  language_code TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  subject_template TEXT NOT NULL,
  text_template TEXT NOT NULL,
  html_template TEXT,
  allowed_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  checksum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review_ready', 'approved', 'retired')),
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_key, language_code, version),
  CHECK (status <> 'approved' OR (approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS crm.intl_outreach_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES crm.intl_accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm.intl_contacts(id) ON DELETE SET NULL,
  family_id UUID NOT NULL REFERENCES crm.intl_campaign_families(id) ON DELETE RESTRICT,
  company_summary TEXT NOT NULL,
  markets JSONB NOT NULL DEFAULT '[]'::jsonb,
  trigger_signal TEXT NOT NULL,
  product_offer TEXT NOT NULL,
  specific_benefit TEXT NOT NULL,
  recommended_cta TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  prohibited_claims JSONB NOT NULL DEFAULT '[]'::jsonb,
  jurisdiction_summary TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review_ready', 'approved', 'expired', 'rejected')),
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'approved' OR (approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS crm.intl_jurisdiction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_key TEXT NOT NULL UNIQUE,
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  region_key TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('ALLOWED', 'CORPORATE_ONLY', 'CONSENT_REQUIRED', 'MANUAL_REVIEW', 'BLOCKED')),
  entity_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  legal_basis_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  policy_version TEXT NOT NULL,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (country_code IS NOT NULL OR region_key IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS crm.intl_compliance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES crm.intl_contacts(id) ON DELETE CASCADE,
  jurisdiction_rule_id UUID REFERENCES crm.intl_jurisdiction_rules(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('ALLOWED', 'CORPORATE_ONLY', 'CONSENT_REQUIRED', 'MANUAL_REVIEW', 'BLOCKED')),
  legal_basis TEXT,
  legitimate_interest_reason TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS crm.intl_campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES crm.intl_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm.intl_contacts(id) ON DELETE RESTRICT,
  brief_id UUID NOT NULL REFERENCES crm.intl_outreach_briefs(id) ON DELETE RESTRICT,
  template_id UUID NOT NULL REFERENCES crm.intl_templates(id) ON DELETE RESTRICT,
  compliance_review_id UUID NOT NULL REFERENCES crm.intl_compliance_reviews(id) ON DELETE RESTRICT,
  review_decision TEXT NOT NULL DEFAULT 'pending' CHECK (review_decision IN ('pending', 'approved', 'edit', 'skip', 'suppress', 'research_again')),
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  followup_count INTEGER NOT NULL DEFAULT 0 CHECK (followup_count BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id),
  CHECK (review_decision <> 'approved' OR (reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS crm.intl_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_contact_id UUID NOT NULL REFERENCES crm.intl_campaign_contacts(id) ON DELETE RESTRICT,
  message_kind TEXT NOT NULL DEFAULT 'initial' CHECK (message_kind IN ('initial', 'followup')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'cancelled')),
  subject TEXT NOT NULL,
  text_body TEXT NOT NULL,
  html_body TEXT,
  from_address TEXT,
  reply_to_address TEXT,
  provider TEXT,
  provider_message_id TEXT,
  approval_id UUID,
  idempotency_key TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.intl_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES crm.intl_messages(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES crm.intl_contacts(id) ON DELETE RESTRICT,
  classification TEXT NOT NULL CHECK (classification IN ('POSITIVE', 'NEUTRAL', 'REFERRAL', 'NOT_NOW', 'NOT_INTERESTED', 'UNSUBSCRIBE', 'AUTO_REPLY', 'BOUNCE', 'COMPLAINT')),
  summary TEXT NOT NULL,
  provider_reply_id TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  classified_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.intl_company_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES crm.intl_accounts(id) ON DELETE SET NULL,
  normalized_domain TEXT,
  normalized_company_name TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('opt_out', 'complaint', 'competitor', 'current_customer', 'sensitive', 'legal_hold', 'manual_block')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  source TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (account_id IS NOT NULL OR normalized_domain IS NOT NULL OR normalized_company_name IS NOT NULL),
  CHECK ((status = 'active' AND released_at IS NULL) OR status = 'released')
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_intl_company_suppressions_domain_uidx
  ON crm.intl_company_suppressions (normalized_domain) WHERE status = 'active' AND normalized_domain IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm.intl_mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_address TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'unconfirmed' CHECK (provider IN ('unconfirmed', 'google_workspace', 'microsoft', 'zoho', 'other')),
  connection_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (connection_status IN ('not_configured', 'oauth_pending', 'connected', 'degraded', 'revoked', 'blocked')),
  token_secret_reference TEXT,
  granted_scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  from_verified BOOLEAN NOT NULL DEFAULT FALSE,
  reply_to_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_health_check_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (token_secret_reference IS NULL OR token_secret_reference !~* '(refresh[_-]?token|access[_-]?token)[=:]')
);

CREATE TABLE IF NOT EXISTS crm.intl_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key TEXT NOT NULL UNIQUE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('landing', 'pdf', 'deck', 'qr', 'video')),
  title TEXT NOT NULL,
  url TEXT,
  storage_path TEXT,
  language_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review_ready', 'approved', 'retired')),
  claims_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  checksum TEXT,
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (url IS NOT NULL OR storage_path IS NOT NULL),
  CHECK (status <> 'approved' OR (claims_reviewed AND approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS crm.intl_audit_log (
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

CREATE INDEX IF NOT EXISTS crm_intl_campaign_contacts_review_idx
  ON crm.intl_campaign_contacts (review_decision, scheduled_for);
CREATE INDEX IF NOT EXISTS crm_intl_messages_status_idx
  ON crm.intl_messages (status, created_at);
CREATE INDEX IF NOT EXISTS crm_intl_replies_classification_idx
  ON crm.intl_replies (classification, received_at DESC);
CREATE INDEX IF NOT EXISTS crm_intl_audit_entity_idx
  ON crm.intl_audit_log (entity_type, entity_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION crm.set_intl_contact_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, crm
AS $$
BEGIN
  IF NEW.account_score_snapshot IS NULL OR NEW.contact_score IS NULL THEN
    NEW.final_outreach_score := NULL;
    NEW.outreach_tier := NULL;
  ELSE
    NEW.final_outreach_score := round((NEW.account_score_snapshot * 0.60) + (NEW.contact_score * 0.40), 2);
    NEW.outreach_tier := CASE
      WHEN NEW.final_outreach_score >= 85 THEN 'AAA'
      WHEN NEW.final_outreach_score >= 75 THEN 'AA'
      WHEN NEW.final_outreach_score >= 65 THEN 'A'
      ELSE 'RESERVE'
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_intl_contact_score ON crm.intl_contacts;
CREATE TRIGGER set_intl_contact_score
  BEFORE INSERT OR UPDATE OF account_score_snapshot, contact_score
  ON crm.intl_contacts
  FOR EACH ROW EXECUTE FUNCTION crm.set_intl_contact_score();

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'intl_settings', 'intl_accounts', 'intl_contacts', 'intl_provider_connections',
    'intl_campaign_families', 'intl_campaigns', 'intl_templates',
    'intl_outreach_briefs', 'intl_jurisdiction_rules', 'intl_campaign_contacts',
    'intl_messages', 'intl_mailboxes', 'intl_assets'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON crm.%I', table_name);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON crm.%I FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at()', table_name);
  END LOOP;
END;
$$;

INSERT INTO crm.intl_settings (settings_key)
VALUES ('default')
ON CONFLICT (settings_key) DO NOTHING;

INSERT INTO crm.intl_provider_connections (provider, mode, connection_status, capabilities)
VALUES
  ('apollo', 'disabled', 'not_configured', '["people_search","people_enrichment","usage"]'::jsonb),
  ('hunter', 'disabled', 'not_configured', '["domain_search","email_finder","email_verifier","usage"]'::jsonb),
  ('snov', 'manual', 'not_configured', '["manual","optional_trial_api"]'::jsonb),
  ('manual', 'manual', 'configured', '["reviewed_import"]'::jsonb)
ON CONFLICT (provider) DO NOTHING;

INSERT INTO crm.intl_campaign_families (
  family_key, display_name, description, target_roles, offer_key, cta_url,
  default_utm_campaign, prohibited_claims
)
VALUES
  ('INTL_ADS', 'International Ads', 'Enterprise and cross-border advertising.', '["CMO","VP Marketing","Media Director"]', 'geobooker_ads', 'https://geobooker.com.mx/enterprise', 'intl_ads', '["guaranteed reach","guaranteed conversions"]'),
  ('LOCATION_INTELLIGENCE', 'Location Intelligence', 'GeoScore and territory analysis.', '["Real Estate","Expansion","Development"]', 'geoscore', 'https://geobooker.com.mx/geoscore', 'location_intelligence', '["complete global coverage","guaranteed site success"]'),
  ('STRATEGIC_PARTNERSHIPS', 'Strategic Partnerships', 'Reviewed integrations and partnerships.', '["Partnerships","Innovation"]', 'strategic_partnership', 'https://geobooker.com.mx/enterprise/contact', 'strategic_partnerships', '["exclusive partnership","confirmed integration"]'),
  ('AGENCY_PARTNERS', 'Agency Partners', 'Managed inventory for agencies and media groups.', '["Agency Director","Media Director"]', 'agency_inventory', 'https://geobooker.com.mx/enterprise', 'agency_partners', '["unlimited inventory","guaranteed performance"]')
ON CONFLICT (family_key) DO NOTHING;

INSERT INTO crm.intl_jurisdiction_rules (
  jurisdiction_key, country_code, region_key, decision, entity_requirements,
  legal_basis_options, source_urls, policy_version
)
VALUES
  ('US', 'US', NULL, 'MANUAL_REVIEW', '{"postalAddress":true,"commercialDisclosure":true,"optOut":true}', '["CAN-SPAM review"]', '["https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business"]', '2026-09-30'),
  ('GB', 'GB', NULL, 'CORPORATE_ONLY', '{"corporateEntityRequired":true,"soleTraderBlockedWithoutConsent":true,"optOut":true}', '["legitimate interest review","consent"]', '["https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/"]', '2026-09-30'),
  ('CA', 'CA', NULL, 'BLOCKED', '{"consentEvidenceRequired":true}', '["express consent","limited implied consent review"]', '["https://ised-isde.canada.ca/site/canada-anti-spam-legislation/en/getting-consent-send-email"]', '2026-09-30'),
  ('EU_EEA', NULL, 'EU_EEA', 'MANUAL_REVIEW', '{"countryReviewRequired":true,"rightToObjectNotice":true}', '["consent","legitimate interest assessment"]', '["https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en"]', '2026-09-30'),
  ('GLOBAL_DEFAULT', NULL, 'GLOBAL', 'MANUAL_REVIEW', '{"localLawReviewRequired":true}', '[]', '[]', '2026-09-30')
ON CONFLICT (jurisdiction_key) DO NOTHING;

INSERT INTO crm.intl_assets (asset_key, asset_type, title, url, language_code, status)
VALUES
  ('enterprise_landing', 'landing', 'Geobooker Enterprise', 'https://geobooker.com.mx/enterprise', 'en', 'review_ready'),
  ('download_hub', 'landing', 'Geobooker App Download Hub', 'https://geobooker.com.mx/download', 'en', 'review_ready')
ON CONFLICT (asset_key) DO NOTHING;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'intl_settings', 'intl_accounts', 'intl_contacts', 'intl_contact_sources',
    'intl_provider_connections', 'intl_provider_usage', 'intl_enrichment_attempts',
    'intl_campaign_families', 'intl_campaigns', 'intl_templates',
    'intl_outreach_briefs', 'intl_jurisdiction_rules', 'intl_compliance_reviews',
    'intl_campaign_contacts', 'intl_messages', 'intl_replies',
    'intl_company_suppressions', 'intl_mailboxes', 'intl_assets', 'intl_audit_log'
  ] LOOP
    EXECUTE format('ALTER TABLE crm.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE crm.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS admin_read ON crm.%I', table_name);
    EXECUTE format('CREATE POLICY admin_read ON crm.%I FOR SELECT TO authenticated USING (crm.is_admin(auth.uid()))', table_name);
    EXECUTE format('REVOKE ALL ON TABLE crm.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT ON TABLE crm.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE crm.%I TO service_role', table_name);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_intl_outreach_readiness()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  cfg crm.intl_settings%ROWTYPE;
  checks JSONB;
  blockers JSONB;
  provider_count BIGINT;
  approved_template_count BIGINT;
  approved_review_count BIGINT;
  active_suppression_count BIGINT;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO cfg FROM crm.intl_settings WHERE settings_key = 'default';
  SELECT count(*) INTO provider_count FROM crm.intl_provider_connections WHERE connection_status IN ('configured', 'healthy');
  SELECT count(*) INTO approved_template_count FROM crm.intl_templates WHERE status = 'approved';
  SELECT count(*) INTO approved_review_count FROM crm.intl_campaign_contacts WHERE review_decision = 'approved';
  SELECT count(*) INTO active_suppression_count FROM crm.suppressions WHERE identifier_type = 'email' AND status = 'active' AND (channel IS NULL OR channel = 'email');

  checks := jsonb_build_array(
    jsonb_build_object('key','schema','label','Esquema Phase 1','required',true,'pass',cfg.id IS NOT NULL),
    jsonb_build_object('key','feature','label','Feature habilitada','required',true,'pass',COALESCE(cfg.feature_enabled,false)),
    jsonb_build_object('key','mailbox','label','Proveedor de buzon confirmado','required',true,'pass',COALESCE(cfg.mailbox_provider_confirmed,false)),
    jsonb_build_object('key','oauth','label','OAuth minimo listo','required',true,'pass',COALESCE(cfg.oauth_ready,false)),
    jsonb_build_object('key','spf','label','SPF','required',true,'pass',COALESCE(cfg.spf_pass,false)),
    jsonb_build_object('key','dkim','label','DKIM','required',true,'pass',COALESCE(cfg.dkim_pass,false)),
    jsonb_build_object('key','dmarc','label','DMARC','required',true,'pass',COALESCE(cfg.dmarc_pass,false)),
    jsonb_build_object('key','tls','label','TLS','required',true,'pass',COALESCE(cfg.tls_pass,false)),
    jsonb_build_object('key','sender','label','From y Reply-To verificados','required',true,'pass',COALESCE(cfg.sender_identity_ready,false)),
    jsonb_build_object('key','postal','label','Domicilio postal valido','required',true,'pass',COALESCE(cfg.postal_address_ready,false)),
    jsonb_build_object('key','privacy','label','Privacidad','required',true,'pass',COALESCE(cfg.privacy_notice_ready,false)),
    jsonb_build_object('key','unsubscribe','label','Baja probada','required',true,'pass',COALESCE(cfg.unsubscribe_ready,false)),
    jsonb_build_object('key','claims','label','Claims aprobados','required',true,'pass',COALESCE(cfg.claims_approved,false)),
    jsonb_build_object('key','jurisdiction','label','Politicas de jurisdiccion','required',true,'pass',COALESCE(cfg.jurisdiction_policy_ready,false)),
    jsonb_build_object('key','provider','label','Proveedor de datos configurado','required',true,'pass',provider_count > 1),
    jsonb_build_object('key','template','label','Plantilla aprobada','required',true,'pass',approved_template_count > 0),
    jsonb_build_object('key','reviewed_audience','label','Audiencia revisada','required',true,'pass',approved_review_count > 0),
    jsonb_build_object('key','cap','label','Limite backend <= 5','required',true,'pass',cfg.daily_new_contact_cap BETWEEN 1 AND 5),
    jsonb_build_object('key','followup','label','Maximo un seguimiento','required',true,'pass',cfg.max_followups <= 1),
    jsonb_build_object('key','suppression','label','Supresion global disponible','required',true,'pass',to_regclass('crm.suppressions') IS NOT NULL)
  );

  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) INTO blockers
  FROM jsonb_array_elements(checks) item
  WHERE (item->>'required')::boolean AND NOT (item->>'pass')::boolean;

  RETURN jsonb_build_object(
    'status', CASE WHEN jsonb_array_length(blockers) = 0 THEN 'READY' ELSE 'NOT_READY' END,
    'sendEnabled', COALESCE(cfg.send_enabled, false),
    'killSwitch', COALESCE(cfg.kill_switch, true),
    'dailyNewContactCap', cfg.daily_new_contact_cap,
    'maxFollowups', cfg.max_followups,
    'checks', checks,
    'blockers', blockers,
    'counts', jsonb_build_object(
      'accounts', (SELECT count(*) FROM crm.intl_accounts),
      'contacts', (SELECT count(*) FROM crm.intl_contacts),
      'aaaAaContacts', (SELECT count(*) FROM crm.intl_contacts WHERE outreach_tier IN ('AAA','AA')),
      'readyForReview', (SELECT count(*) FROM crm.intl_contacts WHERE stage = 'READY_FOR_REVIEW'),
      'approvedContacts', approved_review_count,
      'messagesSent', (SELECT count(*) FROM crm.intl_messages WHERE status IN ('sent','delivered')),
      'qualified', (SELECT count(*) FROM crm.intl_contacts WHERE stage IN ('QUALIFIED','MEETING','OPPORTUNITY','TRANSFERRED_TO_CRM')),
      'activeGlobalEmailSuppressions', active_suppression_count
    ),
    'generatedAt', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_intl_provider_status()
RETURNS TABLE (
  provider TEXT,
  mode TEXT,
  connection_status TEXT,
  capabilities JSONB,
  monthly_credit_cap NUMERIC,
  last_known_remaining NUMERIC,
  usage_reset_at TIMESTAMPTZ,
  used_credits NUMERIC,
  last_health_check_at TIMESTAMPTZ,
  last_error_code TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT pc.provider, pc.mode, pc.connection_status, pc.capabilities,
    pc.monthly_credit_cap, pc.last_known_remaining, pc.usage_reset_at,
    COALESCE(sum(COALESCE(pu.confirmed_credits, pu.estimated_credits)), 0)::numeric AS used_credits,
    pc.last_health_check_at, pc.last_error_code
  FROM crm.intl_provider_connections pc
  LEFT JOIN crm.intl_provider_usage pu ON pu.provider = pc.provider
    AND pu.occurred_at >= date_trunc('month', now())
  GROUP BY pc.id
  ORDER BY CASE pc.provider WHEN 'apollo' THEN 1 WHEN 'hunter' THEN 2 WHEN 'snov' THEN 3 ELSE 4 END;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_intl_jurisdiction_status()
RETURNS TABLE (
  jurisdiction_key TEXT,
  country_code TEXT,
  region_key TEXT,
  decision TEXT,
  policy_version TEXT,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT r.jurisdiction_key, r.country_code, r.region_key, r.decision,
    r.policy_version, r.reviewed_at, r.expires_at, r.is_active
  FROM crm.intl_jurisdiction_rules r
  ORDER BY r.jurisdiction_key;
END;
$$;

REVOKE ALL ON FUNCTION crm.set_intl_contact_score() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.set_intl_contact_score() TO service_role;
REVOKE ALL ON FUNCTION public.crm_intl_outreach_readiness() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.crm_intl_provider_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.crm_intl_jurisdiction_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_intl_outreach_readiness() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_intl_provider_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_intl_jurisdiction_status() TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA crm TO service_role;

COMMENT ON TABLE crm.intl_settings IS 'Fail-closed International Outreach controls. No browser override and no secrets.';
COMMENT ON TABLE crm.intl_provider_connections IS 'Provider metadata and secret references only; never stores credentials.';
COMMENT ON TABLE crm.intl_messages IS 'Draft and future message ledger. Phase 1 provides no send operation.';
COMMENT ON FUNCTION public.crm_intl_outreach_readiness() IS 'Admin-only, PII-free readiness diagnostics. Sends nothing.';

COMMIT;
