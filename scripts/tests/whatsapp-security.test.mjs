import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import {
  computeRetry,
  evaluateOutboundPolicy,
  isCustomerServiceWindowOpen,
  normalizeProviderPhone,
  shouldAdvanceMessageStatus
} from '../../supabase/functions/_shared/whatsapp-security.js';
import {
  getIngestionSourceDefinition,
  listIngestionSources,
  normalizeLegacySourceRecord
} from '../../supabase/functions/_shared/crm-ingestion-adapters.js';
import {
  detectWhatsAppConsentConfirmation,
  detectWhatsAppOptOut,
  normalizeConsentCommand,
  parseOptOutKeywords
} from '../../supabase/functions/_shared/whatsapp-consent.js';
import {
  assessImportedContactability,
  normalizePhone,
  validateContactRow
} from '../../supabase/functions/_shared/crm-import-rules.js';

const require = createRequire(import.meta.url);
const { normalizePhone: normalizeLegacyCloudPhone } = require('../../netlify/functions/_whatsapp-cloud.js');

const activeBudget = { is_active: true, kill_switch: false };

test('Meta Mexico legacy WA IDs normalize to current E.164', () => {
  assert.equal(normalizeProviderPhone('5215512345678'), '+525512345678');
  assert.equal(normalizeProviderPhone('+52 55 1234 5678'), '+525512345678');
  assert.equal(normalizeProviderPhone('15551234567'), '+15551234567');
});

test('CRM imports canonicalize the observed Mexico legacy alias and reject non-E.164 input', () => {
  assert.equal(normalizePhone('+52 1 55 1234 5678'), '+525512345678');
  assert.equal(normalizePhone('+44 20 7946 0018'), '+442079460018');
  assert.equal(normalizePhone('020 7946 0018'), null);
  assert.equal(normalizePhone('+00000000'), null);
});

test('legacy Cloud helper validates international E.164 and fails closed on ambiguous local input', () => {
  assert.equal(normalizeLegacyCloudPhone('+5215512345678'), '525512345678');
  assert.equal(normalizeLegacyCloudPhone('+442079460018'), '442079460018');
  assert.equal(normalizeLegacyCloudPhone('+390212345678'), '390212345678');
  assert.equal(normalizeLegacyCloudPhone('02079460018'), '');
});

test('Campaign Wizard V2 is fail-closed, evidence-aware and no-send', async () => {
  const migrationSource = await readFile(
    new URL('../../supabase/migrations/20260920130000_crm_whatsapp_campaign_wizard_v2.sql', import.meta.url),
    'utf8'
  );
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(migrationSource, /crm_create_whatsapp_campaign_draft_v2/);
  assert.match(migrationSource, /crm_prepare_whatsapp_campaign_review_v2/);
  assert.match(migrationSource, /crm_whatsapp_campaign_report_v2/);
  assert.match(migrationSource, /enabled_for_campaigns/);
  assert.match(migrationSource, /ready_for_campaign/);
  assert.match(migrationSource, /consent_evidence/);
  assert.match(migrationSource, /suppression_active/);
  assert.match(migrationSource, /market_not_enabled/);
  assert.match(migrationSource, /active_rate_card_missing/);
  assert.match(migrationSource, /language_mismatch/);
  assert.match(migrationSource, /sending_enabled', false/);
  assert.match(migrationSource, /REVOKE ALL ON FUNCTION public\.crm_create_whatsapp_campaign_draft_v2[\s\S]*authenticated/);
  assert.doesNotMatch(migrationSource, /INSERT INTO crm\.outbound_jobs/);
  assert.doesNotMatch(migrationSource, /graph\.facebook|\/messages|net\.http|http_post/);
  assert.match(adminSource, /action === 'campaign_wizard_options'/);
  assert.match(adminSource, /action === 'campaign_create_draft_v2'/);
  assert.match(adminSource, /action === 'campaign_prepare_review_v2'/);
  assert.match(adminSource, /campaign_wizard_requires_sending_disabled/);
  assert.match(centerSource, /Campaign Wizard V2/);
  assert.match(centerSource, /Marketing con opt-in comprobable/);
  assert.match(centerSource, /No queue · No send/);
  assert.match(centerSource, /Crear dry run seguro/);
});

test('WhatsApp opt-out commands are exact, normalized and configurable', () => {
  assert.equal(detectWhatsAppOptOut('  BAJA!!! '), 'BAJA');
  assert.equal(detectWhatsAppOptOut('Stop'), 'STOP');
  assert.equal(detectWhatsAppOptOut('no deseo'), 'NO DESEO');
  assert.equal(detectWhatsAppOptOut('Darme de baja por favor'), null);
  assert.equal(detectWhatsAppOptOut('PAUSA', parseOptOutKeywords('PAUSA, FIN')), 'PAUSA');
  assert.equal(normalizeConsentCommand('cancélár'), 'CANCELAR');
});

test('WhatsApp consent confirmation requires the exact Geobooker command', () => {
  assert.equal(detectWhatsAppConsentConfirmation('CONFIRMAR GEOBOOKER ABCD234567'), 'ABCD234567');
  assert.equal(detectWhatsAppConsentConfirmation('confirm geobooker abcd234567'), 'ABCD234567');
  assert.equal(detectWhatsAppConsentConfirmation('CONFIRMAR OTRO ABCD234567'), null);
  assert.equal(detectWhatsAppConsentConfirmation('CONFIRMAR GEOBOOKER SHORT'), null);
});

test('public WhatsApp double opt-in is server-side, evidenced and suppression-safe', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260918213000_crm_whatsapp_consent_acquisition.sql', import.meta.url),
    'utf8'
  );
  const endpoint = await readFile(
    new URL('../../netlify/functions/whatsapp-consent-request.js', import.meta.url),
    'utf8'
  );
  const webhook = await readFile(
    new URL('../../supabase/functions/whatsapp-webhook/index.ts', import.meta.url),
    'utf8'
  );
  const page = await readFile(
    new URL('../../src/pages/WhatsAppConsentPage.jsx', import.meta.url),
    'utf8'
  );
  const center = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  const router = await readFile(new URL('../../src/router.jsx', import.meta.url), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.whatsapp_consent_requests/);
  assert.match(migration, /confirmation_code_hash/);
  assert.match(migration, /REVOKE ALL ON TABLE crm\.whatsapp_consent_requests FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE ON TABLE crm\.whatsapp_consent_requests TO service_role/);
  assert.match(migration, /REVOKE DELETE ON TABLE crm\.whatsapp_consent_requests FROM service_role/);
  assert.match(endpoint, /enforceRateLimit/);
  assert.match(endpoint, /confirmation_code_hash: codeHash/);
  assert.match(endpoint, /double_opt_in_required: true/);
  assert.match(endpoint, /requestedMarketing === true/);
  assert.match(endpoint, /confirmation_method: 'whatsapp_qr_or_deep_link'/);
  assert.match(endpoint, /same_number_confirmation_required: true/);
  assert.doesNotMatch(endpoint, /graph\.facebook\.com|WHATSAPP_ACCESS_TOKEN|META_APP_SECRET/);
  assert.match(webhook, /request\.normalized_phone !== event\.normalizedFrom/);
  assert.match(webhook, /blocked_suppressed/);
  assert.match(webhook, /from\('consent_evidence'\)/);
  assert.match(webhook, /phone_match_verified: true/);
  assert.match(webhook, /existingConsentActivity/);
  assert.match(webhook, /activityError\.code !== '23505'/);
  assert.match(webhook, /else if \(!consentConfirmed\)/);
  assert.match(page, /requestedMarketing/);
  assert.match(page, /Enviar este formulario no activa el consentimiento/);
  assert.match(center, /function ConsentAcquisitionView/);
  assert.match(center, /callAdmin\('consent_requests'\)/);
  assert.match(router, /path="\/whatsapp-consent"/);
});

test('webhook records opt-out and send plus worker recheck global WhatsApp blocks', async () => {
  const webhookSource = await readFile(
    new URL('../../supabase/functions/whatsapp-webhook/index.ts', import.meta.url),
    'utf8'
  );
  const sendSource = await readFile(
    new URL('../../supabase/functions/whatsapp-send/index.ts', import.meta.url),
    'utf8'
  );
  const workerSource = await readFile(
    new URL('../../supabase/functions/whatsapp-worker/index.ts', import.meta.url),
    'utf8'
  );

  assert.match(webhookSource, /detectWhatsAppOptOut/);
  assert.match(webhookSource, /customer_inbound_opt_out/);
  assert.match(webhookSource, /whatsapp_inbound_keyword/);
  assert.match(webhookSource, /opt_out_recorded/);
  assert.match(webhookSource, /existingServicePermission/);
  assert.doesNotMatch(webhookSource, /if \(existingMessage\) return true/);
  for (const source of [sendSource, workerSource]) {
    assert.match(source, /blockedByPermission/);
    assert.match(source, /'opted_out', 'suppressed', 'invalid', 'complaint'/);
    assert.match(source, /suppressed: \(suppressions \|\| \[\]\)\.length > 0 \|\| blockedByPermission/);
  }
});

test('import contactability keeps public data research-only and requires auditable opt-in evidence', () => {
  const publicLead = validateContactRow({
    contact_name: 'Public business contact',
    whatsapp: '+525500000001',
    country_code: 'MX',
    source_type: 'apify',
    whatsapp_opt_in: 'yes'
  });
  assert.equal(publicLead.normalized.contactability_status, 'research_only');
  assert.deepEqual(publicLead.normalized.contactability_reasons, ['public_or_scraped_source_is_not_consent']);

  const incompleteEvidence = validateContactRow({
    contact_name: 'Owned lead',
    whatsapp: '+525500000002',
    country_code: 'MX',
    source_type: 'geobooker_form',
    whatsapp_opt_in: 'yes'
  });
  assert.equal(incompleteEvidence.normalized.contactability_status, 'evidence_incomplete');
  assert.match(incompleteEvidence.normalized.contactability_reasons.join(','), /consent_source_required/);

  const completeEvidence = validateContactRow({
    contact_name: 'Consented lead',
    whatsapp: '+525500000003',
    country_code: 'MX',
    source_type: 'geobooker_form',
    whatsapp_opt_in: 'yes',
    consent_source: 'ads_landing',
    consent_text_version: 'wa-marketing-v1',
    consented_at: '2026-09-17T12:00:00Z'
  });
  assert.equal(completeEvidence.normalized.contactability_status, 'evidence_review_required');
  assert.deepEqual(completeEvidence.normalized.contactability_reasons, []);
  assert.equal(assessImportedContactability({}, { consent_status: 'opted_out' }).status, 'blocked');
});

test('commercial safety gates fail closed on rate cards, budgets and frequency before provider delivery', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260917010000_crm_whatsapp_commercial_safety_gates.sql', import.meta.url),
    'utf8'
  );
  const sendSource = await readFile(
    new URL('../../supabase/functions/whatsapp-send/index.ts', import.meta.url),
    'utf8'
  );
  const workerSource = await readFile(
    new URL('../../supabase/functions/whatsapp-worker/index.ts', import.meta.url),
    'utf8'
  );
  const importSource = await readFile(
    new URL('../../supabase/functions/crm-import-dry-run/index.ts', import.meta.url),
    'utf8'
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.whatsapp_rate_cards/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.messaging_frequency_policies/);
  assert.match(migration, /crm_whatsapp_outbound_guard/);
  assert.match(migration, /daily_budget_exceeded/);
  assert.match(migration, /monthly_budget_exceeded/);
  assert.match(migration, /frequency_cap_24h_reached/);
  assert.match(migration, /active_rate_card_required/);
  assert.match(migration, /false, true\)/);
  assert.match(migration, /REVOKE ALL ON TABLE crm\.whatsapp_rate_cards FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.crm_whatsapp_outbound_guard[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(migration, /INSERT INTO crm\.(?:messages|outbound_jobs)/i);
  assert.doesNotMatch(migration, /graph\.facebook\.com/i);
  for (const source of [sendSource, workerSource]) {
    assert.match(source, /crm_whatsapp_outbound_guard/);
    assert.match(source, /commercial_guard_blocked/);
  }
  assert.match(workerSource, /from\('usage_ledger'\)\.upsert/);
  assert.match(importSource, /contactabilityCounts/);
});

test('pilot budget gate is inactive by default, service-role-only and enforced before Meta delivery', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260917022000_crm_whatsapp_pilot_budget_gate.sql', import.meta.url),
    'utf8'
  );
  const validation = await readFile(
    new URL('../../supabase/validation/crm_whatsapp_pilot_budget_gate_readonly.sql', import.meta.url),
    'utf8'
  );
  const policySource = await readFile(
    new URL('../../supabase/functions/_shared/whatsapp-security.js', import.meta.url),
    'utf8'
  );
  const sendSource = await readFile(
    new URL('../../supabase/functions/whatsapp-send/index.ts', import.meta.url),
    'utf8'
  );
  const workerSource = await readFile(
    new URL('../../supabase/functions/whatsapp-worker/index.ts', import.meta.url),
    'utf8'
  );

  assert.match(migration, /geobooker_whatsapp_pilot_mx_v1/);
  assert.match(migration, /1000\.0000, 20, 50, 80, 100/);
  assert.match(migration, /is_active = false/);
  assert.match(migration, /kill_switch = true/);
  assert.match(migration, /minimum_interval_minutes = 10080/);
  assert.match(migration, /max_messages_24h = 1/);
  assert.match(migration, /max_messages_7d = 1/);
  assert.match(migration, /max_messages_30d = 4/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.crm_whatsapp_global_daily_gate/);
  assert.match(migration, /global_daily_message_limit_reached/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.crm_whatsapp_global_daily_gate[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.crm_whatsapp_global_daily_gate[\s\S]*TO service_role/);
  assert.doesNotMatch(migration, /INSERT INTO crm\.(?:messages|outbound_jobs)/i);
  assert.doesNotMatch(migration, /graph\.facebook\.com/i);
  assert.match(validation, /gate_exists/);
  assert.match(validation, /anon_execute/);
  assert.match(validation, /authenticated_execute/);
  assert.match(policySource, /template\.enabled_for_campaigns !== true/);
  for (const source of [sendSource, workerSource]) {
    assert.match(source, /crm_whatsapp_global_daily_gate/);
    assert.match(source, /global_daily_gate_(?:unavailable|blocked)/);
  }
});

test('inbound service pilot stages only free customer-initiated replies and keeps campaigns closed', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260917023000_crm_whatsapp_inbound_service_pilot.sql', import.meta.url),
    'utf8'
  );
  const runbook = await readFile(
    new URL('../../docs/WHATSAPP_CONTROLLED_PILOT_RUNBOOK_2026-09-17.md', import.meta.url),
    'utf8'
  );
  assert.match(migration, /'MX', 'service'/);
  assert.match(migration, /'MXN', 0\.000000/);
  assert.match(migration, /purpose IN \('marketing', 'transactional'\)/);
  assert.match(migration, /purpose = 'service'/);
  assert.match(migration, /enabled_for_campaigns = false/);
  assert.doesNotMatch(migration, /INSERT INTO crm\.(?:messages|outbound_jobs|campaign_members)/i);
  assert.doesNotMatch(migration, /graph\.facebook\.com/i);
  assert.match(runbook, /WHATSAPP_SEND_ENABLED=false/);
  assert.match(runbook, /send a new inbound message/i);
  assert.match(runbook, /reply `BAJA`/);
  assert.match(runbook, /Restore `WHATSAPP_SEND_ENABLED=false`/);
});

test('Mexico marketing pilot gates stay bounded and never enable delivery by migration', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260920141000_crm_enable_mx_marketing_pilot_gates.sql', import.meta.url),
    'utf8'
  );
  const wizard = await readFile(
    new URL('../../supabase/migrations/20260920130000_crm_whatsapp_campaign_wizard_v2.sql', import.meta.url),
    'utf8'
  );
  const preflight = await readFile(
    new URL('../../supabase/migrations/20260908010000_crm_whatsapp_campaign_dispatch_preflight.sql', import.meta.url),
    'utf8'
  );

  assert.match(migration, /country_code[\s\S]*'MX'/);
  assert.match(migration, /market_status[\s\S]*'pilot'/);
  assert.match(migration, /daily_recipient_cap[\s\S]*20/);
  assert.match(migration, /requires_evidenced_opt_in[\s\S]*true/);
  assert.match(migration, /minimum_interval_minutes\s*=\s*10080/);
  assert.match(migration, /max_messages_24h\s*=\s*1/);
  assert.match(migration, /max_messages_7d\s*=\s*1/);
  assert.match(migration, /max_messages_30d\s*=\s*LEAST\(max_messages_30d,\s*4\)/);
  assert.match(migration, /sending_enabled_by_migration[\s\S]*false/);
  assert.doesNotMatch(migration, /Deno\.env|WHATSAPP_SEND_ENABLED\s*=\s*true/i);
  assert.doesNotMatch(migration, /INSERT INTO crm\.(?:messages|outbound_jobs|campaign_members)/i);
  assert.doesNotMatch(migration, /graph\.facebook\.com/i);
  assert.match(wizard, /campaign_wizard_must_remain_no_send/);
  assert.match(preflight, /never creates outbound jobs or sends messages/i);
});

test('campaign dispatch is atomic, reserved, idempotent and closed by default', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260921100000_crm_whatsapp_atomic_campaign_dispatch.sql', import.meta.url),
    'utf8'
  );
  const worker = await readFile(
    new URL('../../supabase/functions/whatsapp-worker/index.ts', import.meta.url),
    'utf8'
  );
  const validation = await readFile(
    new URL('../../supabase/validation/crm_whatsapp_atomic_campaign_dispatch_readonly.sql', import.meta.url),
    'utf8'
  );
  const runbook = await readFile(
    new URL('../../docs/WHATSAPP_ATOMIC_DISPATCH_RUNBOOK_2026-09-21.md', import.meta.url),
    'utf8'
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.whatsapp_campaign_dispatch_controls/);
  assert.match(migration, /queue_enabled BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(migration, /single_use BOOLEAN NOT NULL DEFAULT TRUE/);
  assert.match(migration, /max_members_per_dispatch BETWEEN 1 AND 20/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /fresh_ready_no_send_preflight_required/);
  assert.match(migration, /campaign_template_not_ready/);
  assert.match(migration, /campaign_market_not_ready/);
  assert.match(migration, /campaign_member_consent_or_suppression_failed/);
  assert.match(migration, /campaign_member_frequency_cap_reached/);
  assert.match(migration, /campaign_budget_capacity_exceeded/);
  assert.match(migration, /reservation_status[^]*'reserved'/);
  assert.match(migration, /INSERT INTO crm\.outbound_jobs/);
  assert.match(migration, /job_type[^]*'campaign'/);
  assert.match(migration, /wa-campaign:[^]*p_preflight_run_id/);
  assert.match(migration, /campaign_dispatch_queue_kill_switch_enabled/);
  assert.match(migration, /UPDATE crm\.whatsapp_campaign_dispatch_controls[^]*queue_enabled = false/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.crm_dispatch_whatsapp_campaign_atomic[^]*PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.crm_dispatch_whatsapp_campaign_atomic[^]*TO service_role/);
  assert.doesNotMatch(migration, /graph\.facebook\.com|WHATSAPP_ACCESS_TOKEN|WHATSAPP_SEND_ENABLED\s*=\s*true/i);

  assert.match(worker, /job\.job_type === 'campaign'/);
  assert.match(worker, /crm_whatsapp_campaign_job_gate/);
  assert.match(worker, /reservation_status:\s*'committed'/);
  assert.match(worker, /committed_at:\s*now/);
  assert.match(worker, /template_reconciliation_changed/);
  assert.match(worker, /campaign_reservation_gate_blocked/);
  assert.match(worker, /WHATSAPP_SEND_ENABLED'\)\s*!==\s*'true'/);
  assert.match(validation, /queue_enabled/);
  assert.match(validation, /anon_dispatch/);
  assert.match(validation, /authenticated_dispatch/);
  assert.match(runbook, /WHATSAPP_SEND_ENABLED=false/);
  assert.match(runbook, /Rollback operacional/);
});

test('campaign reservation release is definitive-only and preserves ambiguous submissions', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260921100000_crm_whatsapp_atomic_campaign_dispatch.sql', import.meta.url),
    'utf8'
  );
  const worker = await readFile(
    new URL('../../supabase/functions/whatsapp-worker/index.ts', import.meta.url),
    'utf8'
  );

  assert.match(migration, /CREATE OR REPLACE FUNCTION crm\.release_whatsapp_campaign_reservation/);
  assert.match(migration, /p_final_status NOT IN \('failed', 'cancelled', 'dead_letter'\)/);
  assert.match(migration, /reservation\.reservation_status <> 'reserved'/);
  assert.match(migration, /committed_reservation_cannot_be_released/);
  assert.match(migration, /provider_acceptance_or_ambiguity_present/);
  assert.match(migration, /message_record\.current_status IN \('accepted', 'sent', 'delivered', 'read', 'unknown'\)/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION crm\.release_expired_whatsapp_campaign_reservations/);
  assert.match(migration, /oj\.status IN \('pending', 'retry'\)/);
  assert.match(migration, /m\.provider_message_id IS NULL/);
  assert.match(migration, /whatsapp\.campaign_reservation_released/);
  assert.match(migration, /reservation_status = 'released'/);
  assert.match(migration, /estimated_unit_cost = 0/);

  assert.match(worker, /release_whatsapp_campaign_reservation/);
  assert.match(worker, /\['failed', 'cancelled', 'dead_letter'\]\.includes\(status\)/);
  assert.match(worker, /job\.job_type === 'campaign' && providerResponse\.status >= 500/);
  assert.match(worker, /Ambiguous provider server response; campaign reservation retained/);
  assert.match(worker, /status:\s*'unknown', retry:\s*false/);
  assert.match(worker, /missing_provider_message_id'[\s\S]*status:\s*'unknown'/);
  assert.match(worker, /current_status: status === 'retry' \? 'queued' : status === 'unknown' \? 'unknown' : 'failed'/);
  assert.doesNotMatch(worker, /reservation_status:\s*'released'[\s\S]{0,200}status === 'unknown'/);

  const campaignLedgerUpsert = worker.match(/crm\.from\('usage_ledger'\)\.upsert\(\{[\s\S]*?\}, \{ onConflict: 'message_id' \}\)/)?.[0] || '';
  assert.match(campaignLedgerUpsert, /reservation_status:\s*'committed'/);
  assert.doesNotMatch(campaignLedgerUpsert, /campaign_member_id:\s*null|outbound_job_id:\s*null|preflight_run_id:\s*null|reserved_amount:\s*null/);
});

test('outbound policy fails closed when sending is disabled', () => {
  assert.deepEqual(evaluateOutboundPolicy({
    budgetPolicy: null, permissionStatus: 'opted_in', suppressed: false,
    serviceWindowOpen: true, messageType: 'text'
  }), { allowed: false, reason: 'sending_disabled' });
});

test('approved templates still require explicit CRM campaign enablement', () => {
  const base = {
    budgetPolicy: activeBudget,
    permissionStatus: 'opted_in',
    suppressed: false,
    serviceWindowOpen: false,
    messageType: 'template'
  };
  assert.deepEqual(evaluateOutboundPolicy({
    ...base,
    template: { approval_status: 'approved', category: 'marketing', enabled_for_campaigns: false }
  }), { allowed: false, reason: 'template_not_enabled_for_campaigns' });
  assert.deepEqual(evaluateOutboundPolicy({
    ...base,
    template: { approval_status: 'approved', category: 'marketing', enabled_for_campaigns: true }
  }), { allowed: true, purpose: 'marketing' });
});

test('Meta Business Agent knowledge pack is public-only and contains no credential material', async () => {
  const files = [
    '../../docs/agent-knowledge/README.md',
    '../../docs/agent-knowledge/geobooker-one-pager-2026-09-v1.md',
    '../../docs/agent-knowledge/geobooker-business-registration-guide-2026-09-v1.md',
    '../../docs/agent-knowledge/geobooker-faq-2026-09-v1.md',
    '../../docs/agent-knowledge/geobooker-ads-media-kit-2026-09-v1.md',
    '../../docs/agent-knowledge/geobooker-support-escalation-policy-2026-09-v1.md',
    '../../docs/agent-knowledge/geobooker-leads-overview-2026-09-v1.md',
    '../../docs/WHATSAPP_TEMPLATE_SUBMISSION_PACK_2026-09.md'
  ];

  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
    assert.doesNotMatch(source, /(EAAG|EAAJ|EAAC)[A-Za-z0-9_-]{40,}/);
    assert.doesNotMatch(source, /service_role\s*[:=]\s*['"][^'"]+/i);
    assert.doesNotMatch(source, /postgres:\/\/|postgresql:\/\//i);
    assert.doesNotMatch(source, /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i);
    assert.doesNotMatch(source, /\b\d{6}\b.*\b(pin|two-step|2fa|verification)\b/i);
    assert.match(source, /Geobooker|WhatsApp|Meta|CRM|agente|publico|comercial/i);
  }
});

test('Campaign readiness is aggregate-only and blocks unsafe audiences', async () => {
  const readinessMigration = await readFile(
    new URL('../../supabase/migrations/20260907022000_crm_campaign_readiness.sql', import.meta.url),
    'utf8'
  );
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(readinessMigration, /CREATE TABLE IF NOT EXISTS crm\.campaigns/i);
  assert.match(readinessMigration, /CREATE TABLE IF NOT EXISTS crm\.campaign_members/i);
  assert.match(readinessMigration, /crm_campaign_readiness_overview/i);
  assert.match(readinessMigration, /auth\.role\(\), ''\) <> 'service_role'/);
  assert.match(readinessMigration, /status IN \('opted_out', 'suppressed', 'invalid', 'complaint'\)/);
  assert.match(readinessMigration, /REVOKE ALL ON TABLE crm\.%I FROM PUBLIC, anon, authenticated/i);
  assert.match(readinessMigration, /GRANT EXECUTE ON FUNCTION public\.crm_campaign_readiness_overview\(\)[\s\S]*TO authenticated, service_role/i);
  assert.match(adminSource, /campaign_readiness/);
  assert.match(centerSource, /CampaignReadinessView/);
  assert.match(centerSource, /No env/);
});

test('WhatsApp campaign preview is read-only and bounded', async () => {
  const previewMigration = await readFile(
    new URL('../../supabase/migrations/20260907023000_crm_whatsapp_campaign_preview.sql', import.meta.url),
    'utf8'
  );
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(previewMigration, /crm_whatsapp_campaign_preview/i);
  assert.match(previewMigration, /safe_limit := LEAST\(GREATEST\(COALESCE\(p_limit, 50\), 1\), 200\)/);
  assert.match(previewMigration, /It performs no writes and sends nothing/i);
  assert.doesNotMatch(previewMigration, /\bINSERT INTO\b/i);
  assert.doesNotMatch(previewMigration, /\bUPDATE\b/i);
  assert.match(adminSource, /campaign_preview/);
  assert.match(centerSource, /Preview de audiencia WhatsApp/);
  assert.match(centerSource, /no crea campaña ni cola/);
});

test('WhatsApp campaign drafts require admin review and never enqueue delivery', async () => {
  const draftsMigration = await readFile(
    new URL('../../supabase/migrations/20260907024000_crm_whatsapp_campaign_drafts.sql', import.meta.url),
    'utf8'
  );
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(draftsMigration, /crm_create_whatsapp_campaign_draft/i);
  assert.match(draftsMigration, /crm_prepare_whatsapp_campaign_review/i);
  assert.match(draftsMigration, /auth\.role\(\), ''\) <> 'service_role'/);
  assert.match(draftsMigration, /sending_enabled', false/);
  assert.match(draftsMigration, /queued_job_id = NULL/);
  assert.doesNotMatch(draftsMigration, /INSERT INTO crm\.outbound_jobs/i);
  assert.doesNotMatch(draftsMigration, /graph\.facebook\.com/i);
  assert.match(draftsMigration, /REVOKE ALL ON FUNCTION public\.crm_create_whatsapp_campaign_draft[\s\S]*FROM PUBLIC, anon/i);
  assert.match(draftsMigration, /REVOKE ALL ON FUNCTION public\.crm_prepare_whatsapp_campaign_review[\s\S]*FROM PUBLIC, anon/i);
  assert.match(adminSource, /campaign_create_draft/);
  assert.match(adminSource, /campaign_prepare_review/);
  assert.match(adminSource, /campaign_list/);
  assert.match(centerSource, /Campaign Wizard V2/);
  assert.match(centerSource, /No queue · No send/);
  assert.doesNotMatch(centerSource, /Aprobar campa/);
});

test('WhatsApp campaign approval gate does not schedule or send campaigns', async () => {
  const approvalMigration = await readFile(
    new URL('../../supabase/migrations/20260907025000_crm_whatsapp_campaign_approval_gate.sql', import.meta.url),
    'utf8'
  );
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(approvalMigration, /crm_whatsapp_campaign_approval_check/i);
  assert.match(approvalMigration, /crm_approve_whatsapp_campaign/i);
  assert.match(approvalMigration, /campaign_must_be_review_ready/);
  assert.match(approvalMigration, /active_budget_policy_required/);
  assert.match(approvalMigration, /budget_kill_switch_enabled/);
  assert.match(approvalMigration, /production_phone_number_not_active/);
  assert.match(approvalMigration, /p_confirm_no_send BOOLEAN DEFAULT false/);
  assert.match(approvalMigration, /campaign_approved_no_send/);
  assert.match(approvalMigration, /sending_enabled', false/);
  assert.doesNotMatch(approvalMigration, /INSERT INTO crm\.outbound_jobs/i);
  assert.doesNotMatch(approvalMigration, /status = 'scheduled'/i);
  assert.doesNotMatch(approvalMigration, /graph\.facebook\.com/i);
  assert.match(adminSource, /campaign_approval_check/);
  assert.match(adminSource, /campaign_approve_no_send/);
  assert.match(adminSource, /p_confirm_no_send:\s*true/);
  assert.match(centerSource, /Approval gate/);
  assert.match(centerSource, /Approve no-send/);
});

test('WhatsApp dispatch preflight plans batches without queueing or sending', async () => {
  const preflightMigration = await readFile(
    new URL('../../supabase/migrations/20260908010000_crm_whatsapp_campaign_dispatch_preflight.sql', import.meta.url),
    'utf8'
  );
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(preflightMigration, /CREATE TABLE IF NOT EXISTS crm\.campaign_dispatch_runs/i);
  assert.match(preflightMigration, /crm_whatsapp_campaign_dispatch_preflight/i);
  assert.match(preflightMigration, /campaign_must_be_approved/);
  assert.match(preflightMigration, /planned_batches/);
  assert.match(preflightMigration, /sending_enabled BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(preflightMigration, /GRANT SELECT, INSERT, UPDATE ON TABLE crm\.campaign_dispatch_runs TO service_role/i);
  assert.match(preflightMigration, /REVOKE DELETE ON TABLE crm\.campaign_dispatch_runs FROM service_role/i);
  assert.doesNotMatch(preflightMigration, /INSERT INTO crm\.outbound_jobs/i);
  assert.doesNotMatch(preflightMigration, /INSERT INTO crm\.messages/i);
  assert.doesNotMatch(preflightMigration, /status = 'scheduled'/i);
  assert.doesNotMatch(preflightMigration, /graph\.facebook\.com/i);
  assert.match(adminSource, /campaign_dispatch_preflight/);
  assert.match(centerSource, /Dispatch preflight/);
  assert.match(centerSource, /No queue/);
});

test('international WhatsApp campaigns require approved markets and evidenced opt-in', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260908011000_crm_whatsapp_international_consent_gate.sql', import.meta.url),
    'utf8'
  );
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.market_policies/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.consent_evidence/i);
  assert.match(migration, /whatsapp_marketing_enabled BOOLEAN NOT NULL DEFAULT FALSE/i);
  assert.match(migration, /crm_whatsapp_campaign_market_check/i);
  assert.match(migration, /evidenced_marketing_opt_in_required/i);
  assert.match(migration, /enforce_whatsapp_marketing_campaign_gate/i);
  assert.match(migration, /REVOKE ALL ON TABLE crm\.market_policies FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /REVOKE ALL ON TABLE crm\.consent_evidence FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /REVOKE UPDATE, DELETE ON TABLE crm\.consent_evidence FROM service_role/i);
  assert.doesNotMatch(migration, /INSERT INTO crm\.outbound_jobs/i);
  assert.doesNotMatch(migration, /INSERT INTO crm\.messages/i);
  assert.doesNotMatch(migration, /graph\.facebook\.com/i);
  assert.match(adminSource, /crm_whatsapp_international_readiness/);
  assert.match(adminSource, /crm_whatsapp_campaign_market_check/);
  assert.match(centerSource, /Mercados internacionales candidatos/);
  assert.match(centerSource, /Opt-in con evidencia/);
});

test('workspace foundation preserves internal B2B and keeps tenant tables backend-only', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260908012000_crm_workspace_foundation.sql', import.meta.url),
    'utf8'
  );
  const validation = await readFile(
    new URL('../../supabase/validation/crm_workspace_reconciliation_readonly.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.workspaces/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.workspace_users/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.workspace_access_audit/i);
  assert.match(migration, /geobooker_internal/);
  assert.match(migration, /client_portal_enabled[^\n]*false/);
  assert.match(migration, /UPDATE crm\.%I SET workspace_id = \$1 WHERE workspace_id IS NULL/i);
  assert.match(migration, /REVOKE ALL ON TABLE crm\.workspaces FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /REVOKE ALL ON TABLE crm\.workspace_users FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /REVOKE UPDATE, DELETE ON TABLE crm\.workspace_access_audit FROM service_role/i);
  assert.match(migration, /crm_workspace_foundation_status/);
  assert.doesNotMatch(migration, /INSERT INTO crm\.outbound_jobs/i);
  assert.doesNotMatch(migration, /INSERT INTO crm\.messages/i);
  assert.doesNotMatch(migration, /graph\.facebook\.com/i);
  assert.doesNotMatch(validation, /^\s*(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|GRANT|REVOKE)\b/im);
  assert.match(validation, /unscoped_rows = 0/);
});

test('CRM 360 intake is idempotent, workspace-scoped and inert until adapters are enabled', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260908013000_crm_ingestion_360_foundation.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.source_events/i);
  assert.match(migration, /UNIQUE \(workspace_id, source_system, idempotency_key\)/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.source_entity_links/i);
  assert.match(migration, /resolution_status IN \('linked', 'needs_review', 'ignored', 'superseded'\)/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.ingestion_reconciliation_snapshots/i);
  assert.match(migration, /REVOKE ALL ON TABLE crm\.source_events FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /REVOKE DELETE ON TABLE crm\.source_events FROM service_role/i);
  assert.match(migration, /raw_payload IS NULL OR purge_raw_payload_after IS NOT NULL/i);
  assert.doesNotMatch(migration, /INSERT INTO crm\.(accounts|contacts|messages|activities|outbound_jobs)/i);
  assert.doesNotMatch(migration, /DELETE FROM public\./i);
  assert.doesNotMatch(migration, /graph\.facebook\.com/i);
});

test('workspace reconciliation permits SQL Editor admins without opening PostgREST roles', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260908014000_crm_sql_editor_reconciliation_access.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /session_user IN \('postgres', 'supabase_admin'\)/i);
  assert.match(migration, /PostgREST requests use session_user=authenticator/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION crm\.has_workspace_access\(UUID, TEXT\[\]\) FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.crm_workspace_foundation_status\(\) FROM PUBLIC, anon/i);
  assert.doesNotMatch(migration, /GRANT EXECUTE[^;]+TO anon/i);
});

test('CRM 360 source adapters are admin-only, bounded, private and never dispatch', async () => {
  const adapter = await readFile(
    new URL('../../supabase/functions/crm-reconcile-dry-run/index.ts', import.meta.url),
    'utf8'
  );
  const shared = await readFile(
    new URL('../../supabase/functions/_shared/crm-ingestion-adapters.js', import.meta.url),
    'utf8'
  );
  const config = await readFile(new URL('../../supabase/config.toml', import.meta.url), 'utf8');
  assert.match(config, /\[functions\.crm-reconcile-dry-run\]\s+verify_jwt = true/i);
  assert.match(adapter, /CRM360_RECONCILIATION_ENABLED/);
  assert.match(adapter, /MAX_BATCH_SIZE = 500/);
  assert.match(adapter, /admin_users/);
  assert.match(adapter, /run_mode: 'dry_run'/);
  assert.match(adapter, /entitiesPromoted: 0/);
  assert.match(adapter, /messagesQueued: 0/);
  assert.match(adapter, /messagesSent: 0/);
  assert.match(shared, /raw_payload: null/);
  assert.doesNotMatch(adapter, /graph\.facebook\.com|resend\.com|whatsapp-send|process-email-queue/i);
  assert.doesNotMatch(shared, /raw_payload:\s*record/i);
});

test('CRM 360 source normalization omits direct contact details and message content', () => {
  assert.deepEqual(listIngestionSources(), ['apify', 'scan_local', 'csv', 'email_queue', 'email_history']);
  assert.equal(getIngestionSourceDefinition('csv').relation, 'marketing_contacts');
  const prepared = normalizeLegacySourceRecord('csv', {
    id: 'c6980bd9-cd91-4be0-8f6a-c8873984724f',
    company_name: 'Empresa de prueba',
    email: 'persona@example.com',
    phone: '+525500000000',
    notes: 'contenido que no debe copiarse',
    body_text: 'mensaje que no debe copiarse',
    source: 'csv',
    created_at: '2026-09-08T12:00:00.000Z'
  });
  assert.equal(prepared.normalized.company_name, 'Empresa de prueba');
  assert.equal(prepared.normalized.has_email, true);
  assert.equal(prepared.normalized.has_phone, true);
  assert.equal(prepared.occurredAt, '2026-09-08T12:00:00.000Z');
  assert.equal('email' in prepared.normalized, false);
  assert.equal('phone' in prepared.normalized, false);
  assert.equal('notes' in prepared.normalized, false);
  assert.equal('body_text' in prepared.normalized, false);
});

test('global campaign planning is workspace-scoped, configurable and no-send', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260908015000_crm_global_campaign_planning.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.product_catalog/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.campaign_targets/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.campaign_localizations/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.campaign_commercial_terms/i);
  assert.match(migration, /scope_level IN \('global', 'region', 'country', 'state', 'city', 'postal', 'radius'\)/i);
  assert.match(migration, /pricing_model IN \('fixed', 'retainer', 'per_contact', 'per_qualified_lead', 'per_held_meeting', 'revenue_share', 'hybrid'\)/i);
  assert.match(migration, /crm\.has_workspace_access\(p_workspace_id/i);
  assert.match(migration, /REVOKE ALL ON TABLE crm\.%I FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /REVOKE DELETE ON TABLE crm\.%I FROM service_role/i);
  assert.doesNotMatch(migration, /INSERT INTO crm\.campaigns|INSERT INTO crm\.outbound_jobs|graph\.facebook\.com/i);
});

test('suppression always blocks outbound messages', () => {
  assert.deepEqual(evaluateOutboundPolicy({
    budgetPolicy: activeBudget, permissionStatus: 'opted_in', suppressed: true,
    serviceWindowOpen: true, messageType: 'text'
  }), { allowed: false, reason: 'recipient_suppressed' });
});

test('service text is allowed only inside the customer-service window', () => {
  assert.equal(isCustomerServiceWindowOpen(new Date(Date.now() + 60_000).toISOString()), true);
  assert.equal(isCustomerServiceWindowOpen(new Date(Date.now() - 60_000).toISOString()), false);
  assert.deepEqual(evaluateOutboundPolicy({
    budgetPolicy: activeBudget, permissionStatus: 'unknown', suppressed: false,
    serviceWindowOpen: true, messageType: 'text'
  }), { allowed: true, purpose: 'service' });
});

test('outside the service window an approved template and permission are required', () => {
  const template = { approval_status: 'approved', category: 'marketing', enabled_for_campaigns: true };
  assert.deepEqual(evaluateOutboundPolicy({
    budgetPolicy: activeBudget, permissionStatus: 'unknown', suppressed: false,
    serviceWindowOpen: false, template, messageType: 'template'
  }), { allowed: false, reason: 'marketing_permission_required', purpose: 'marketing' });
  assert.deepEqual(evaluateOutboundPolicy({
    budgetPolicy: activeBudget, permissionStatus: 'opted_in', suppressed: false,
    serviceWindowOpen: false, template, messageType: 'template'
  }), { allowed: true, purpose: 'marketing' });
});

test('message status does not regress and retry policy is bounded', () => {
  assert.equal(shouldAdvanceMessageStatus('read', 'delivered'), false);
  assert.equal(shouldAdvanceMessageStatus('sent', 'read'), true);
  assert.deepEqual(computeRetry({ attemptCount: 1, statusCode: 429 }), { retry: true, state: 'retry', delaySeconds: 30 });
  assert.deepEqual(computeRetry({ attemptCount: 5, statusCode: 500 }), { retry: false, state: 'failed', delaySeconds: null });
  assert.deepEqual(computeRetry({ attemptCount: 1, statusCode: 400 }), { retry: false, state: 'failed', delaySeconds: null });
});

test('WhatsApp outbound is queued before provider delivery', async () => {
  const sendSource = await readFile(
    new URL('../../supabase/functions/whatsapp-send/index.ts', import.meta.url),
    'utf8'
  );
  assert.match(sendSource, /current_status:\s*'queued'/);
  assert.match(sendSource, /status:\s*'pending'/);
  assert.match(sendSource, /queued:\s*true/);
  assert.match(sendSource, /WHATSAPP_SEND_REQUESTS_PER_MINUTE/);
  assert.match(sendSource, /whatsapp\.message_queued/);
  assert.match(sendSource, /idempotency_request_in_progress/);
  assert.doesNotMatch(sendSource, /graph\.facebook\.com/);
});

test('WhatsApp worker owns provider delivery and respects kill switch', async () => {
  const workerSource = await readFile(
    new URL('../../supabase/functions/whatsapp-worker/index.ts', import.meta.url),
    'utf8'
  );
  const claimMigration = await readFile(
    new URL('../../supabase/migrations/20260907021000_whatsapp_outbound_job_claiming.sql', import.meta.url),
    'utf8'
  );
  assert.match(workerSource, /WHATSAPP_SEND_ENABLED'\)\s*!==\s*'true'/);
  assert.match(workerSource, /claim_whatsapp_outbound_jobs/);
  assert.match(workerSource, /graph\.facebook\.com/);
  assert.match(workerSource, /buildStatusFingerprint/);
  assert.match(workerSource, /whatsapp\.outbound_job_dead_lettered/);
  assert.match(workerSource, /whatsapp\.message_submitted/);
  assert.match(workerSource, /ensureOutboundActivity/);
  assert.match(workerSource, /activity_type:\s*'whatsapp_outbound'/);
  assert.match(workerSource, /insertError\.code\s*!==\s*'23505'/);
  assert.match(claimMigration, /FOR UPDATE SKIP LOCKED/i);
  assert.match(claimMigration, /REVOKE ALL ON FUNCTION crm\.claim_whatsapp_outbound_jobs\(INTEGER\)[\s\S]*FROM PUBLIC, anon, authenticated/i);
  assert.match(claimMigration, /GRANT EXECUTE ON FUNCTION crm\.claim_whatsapp_outbound_jobs\(INTEGER\)[\s\S]*TO service_role/i);
});

test('WhatsApp Center health exposes outbound queue metrics', async () => {
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(adminSource, /outboundQueue/);
  assert.match(adminSource, /crm\.from\('outbound_jobs'\)\.select\('status'\)/);
  assert.match(adminSource, /oldestDueAt/);
  assert.match(adminSource, /commercialSafety/);
  assert.match(adminSource, /apps: subscribedApps\.map/);
  assert.match(adminSource, /isMetaBusinessAgent/);
  assert.match(adminSource, /geobooker_whatsapp_pilot_mx_v1/);
  assert.match(adminSource, /daily_message_limit/);
  assert.match(adminSource, /enabled_for_campaigns/);
  assert.match(adminSource, /business_verification_status/);
  assert.match(adminSource, /account_review_status/);
  assert.match(adminSource, /primary_funding_id/);
  assert.match(adminSource, /fundingConfigured/);
  assert.match(adminSource, /whatsapp_health_message_metrics/);
  assert.match(adminSource, /sampleMessagesToday/);
  assert.match(centerSource, /Cola outbound/);
  assert.match(centerSource, /Dead letters/);
  assert.match(centerSource, /Próximo job vencido/);
  assert.match(centerSource, /Piloto comercial/);
  assert.match(centerSource, /Frequency cap/);
  assert.match(centerSource, /Tarifas WhatsApp/);
  assert.match(centerSource, /Template gate CRM/);
  assert.match(centerSource, /Apps suscritas al WABA/);
  assert.match(centerSource, /META BUSINESS AGENT/);
  assert.match(centerSource, /No disponible por API/);
  assert.match(centerSource, /Business Verification/);
  assert.match(centerSource, /WABA Review/);
  assert.match(centerSource, /Billing\/Funding/);
  assert.match(centerSource, /Mensajes reales hoy/);
  assert.match(centerSource, /Muestras Meta hoy/);
  assert.doesNotMatch(centerSource, /primary_funding_id/);
});

test('WhatsApp CRM activities are unique per message and health metrics isolate Meta samples', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20260918161000_crm_whatsapp_activity_metrics.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS crm_activities_message_type_uidx/);
  assert.match(migration, /INSERT INTO crm\.activities/);
  assert.match(migration, /ON CONFLICT \(message_id, activity_type\)/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION crm\.whatsapp_health_message_metrics/);
  assert.match(migration, /c\.is_test = FALSE/);
  assert.match(migration, /c\.is_test = TRUE/);
  assert.match(migration, /REVOKE ALL ON FUNCTION crm\.whatsapp_health_message_metrics\(TIMESTAMPTZ\)[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION crm\.whatsapp_health_message_metrics\(TIMESTAMPTZ\)[\s\S]*TO service_role/);
  assert.doesNotMatch(migration, /GRANT[\s\S]*TO (?:anon|authenticated)/i);
});

test('production phone registration is super-admin, scoped, secret-backed and no-send', async () => {
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(adminSource, /action === 'register_phone'/);
  assert.match(adminSource, /adminUser\.role !== 'super_admin'/);
  assert.match(adminSource, /WHATSAPP_TWO_STEP_PIN/);
  assert.match(adminSource, /WHATSAPP_SEND_ENABLED'\) !== 'false'/);
  assert.match(adminSource, /messaging_product: 'whatsapp', pin: twoStepPin/);
  assert.match(adminSource, /whatsapp_business_messaging_permission_required/);
  assert.match(adminSource, /phone_not_associated_with_configured_waba/);
  assert.match(adminSource, /status: 'active'/);
  assert.match(adminSource, /action: 'whatsapp\.phone\.register'/);
  assert.doesNotMatch(adminSource, /new_values:[\s\S]{0,500}\bpin\b\s*:/i);
  assert.doesNotMatch(adminSource, /console\.(?:log|error)\([^\n]*(?:twoStepPin|accessToken)/);
  assert.match(centerSource, /callAdmin\('register_phone'/);
  assert.doesNotMatch(centerSource, /WHATSAPP_TWO_STEP_PIN|\bpin\s*:/);
});

test('WABA subscription is explicit, super-admin scoped and keeps sending disabled', async () => {
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(adminSource, /action === 'subscribe_waba'/);
  assert.match(adminSource, /subscription_requires_sending_disabled/);
  assert.match(adminSource, /whatsapp_business_management_permission_required/);
  assert.match(adminSource, /\$\{encodeURIComponent\(wabaId\)\}\/subscribed_apps/);
  assert.match(adminSource, /action: 'whatsapp\.waba\.subscribe'/);
  assert.match(adminSource, /sending_enabled: false/);
  assert.match(adminSource, /whatsapp_business_api_data/);
  assert.match(adminSource, /messagesSubscribed/);
  assert.match(adminSource, /action: 'whatsapp\.health\.check'/);
  assert.match(centerSource, /callAdmin\('subscribe_waba'/);
  assert.match(centerSource, /Suscribir app al WABA/);
  assert.match(centerSource, /NO habilita envíos/);
  assert.match(centerSource, /Webhook messages/);
});

test('WhatsApp templates view exposes readiness without enabling sends', async () => {
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  const blueprintSource = centerSource.match(/const TEMPLATE_BLUEPRINTS = \[[\s\S]*?\n\];/)?.[0] || '';
  assert.match(adminSource, /action === 'templates'/);
  assert.match(adminSource, /action === 'sync_templates'/);
  assert.match(adminSource, /message_templates/);
  assert.match(adminSource, /normalizeTemplateStatus/);
  assert.match(centerSource, /TEMPLATE GATE PASS/);
  assert.match(centerSource, /TEMPLATE GATE PENDING/);
  assert.match(centerSource, /MX TEMPLATE GATE PASS/);
  assert.match(centerSource, /EN TEMPLATE GATE PASS/);
  assert.match(centerSource, /MX_CORE_TEMPLATE_NAMES/);
  assert.match(centerSource, /EN_CORE_TEMPLATE_NAMES/);
  assert.match(centerSource, /reconciliation_status/);
  assert.match(centerSource, /enabled_for_campaigns/);
  assert.match(adminSource, /templateSnapshotHash/);
  assert.match(adminSource, /LOCALE_MISMATCH/);
  assert.match(adminSource, /NAME_MISMATCH/);
  assert.match(adminSource, /READY_FOR_CAMPAIGN/);
  assert.match(adminSource, /provider_template_id/);
  assert.match(centerSource, /es_MX/);
  assert.match(centerSource, /en_US/);
  assert.match(centerSource, /Todos los idiomas/);
  assert.match(centerSource, /Todas las categorías/);
  assert.match(centerSource, /Esta vista no crea plantillas ni habilita envíos/);
  assert.match(centerSource, /TEMPLATE_BLUEPRINTS/);
  for (const requiredTemplate of [
    'gb_optin_confirm_es_mx',
    'gb_business_registration_help_es_mx',
    'gb_ads_requested_info_es_mx',
    'gb_business_invitation_es_mx',
    'gb_ads_followup_es_mx',
    'gb_app_download_es_mx',
    'gb_optin_confirm_en_us',
    'gb_business_registration_help_en_us',
    'gb_ads_requested_info_en_us',
    'gb_business_invitation_en_us',
    'gb_ads_followup_en_us',
    'gb_app_download_en_us'
  ]) {
    assert.match(centerSource, new RegExp(requiredTemplate));
  }
  assert.match(centerSource, /Cuerpo sugerido/);
  assert.match(centerSource, /templateClipboardText/);
  assert.match(centerSource, /Copiar ficha/);
  assert.match(centerSource, /responder BAJA|reply STOP/i);
  assert.match(centerSource, /mxMissing/);
  assert.match(centerSource, /enMissing/);
  assert.match(centerSource, /Manual Meta approval/);
  assert.match(centerSource, /Unknown queda fuera/);
  assert.doesNotMatch(blueprintSource, /accessToken|META_APP_SECRET|WHATSAPP_ACCESS_TOKEN/);
});

test('WhatsApp contacts view exposes contactability without queueing or sending', async () => {
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  assert.match(centerSource, /function ContactabilityView/);
  assert.match(centerSource, /Contactability Engine/);
  assert.match(centerSource, /callAdmin\('campaign_readiness'\)/);
  assert.match(centerSource, /callAdmin\('campaign_preview'/);
  assert.match(centerSource, /Tener numero no autoriza WhatsApp/);
  assert.match(centerSource, /unknown excluido/);
  assert.match(centerSource, /suppression bloquea/);
  assert.match(centerSource, /WHATSAPP_SEND_ENABLED=false/);
  assert.match(centerSource, /section === 'contacts' \? <ContactabilityView/);
  assert.doesNotMatch(centerSource.match(/function ContactabilityView\(\) \{[\s\S]*?\n\}/)?.[0] || '', /outbound_jobs|send_whatsapp|graph\.facebook\.com/i);
});

test('WABA discrepancy audit is read-only, scoped and no-send', async () => {
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  const auditAction = adminSource.match(/if \(action === 'waba_audit'\) \{[\s\S]*?\n    \}/)?.[0] || '';
  assert.match(adminSource, /action === 'waba_audit'/);
  assert.match(adminSource, /inspectWaba/);
  assert.match(auditAction, /adminUser\.role !== 'super_admin'/);
  assert.match(auditAction, /audit_requires_sending_disabled/);
  assert.match(auditAction, /4731600213830930/);
  assert.match(auditAction, /2713541662435171/);
  assert.match(auditAction, /phone_number_scope_not_allowed/);
  assert.match(auditAction, /readOnly: true/);
  assert.match(auditAction, /sendingEnabled: false/);
  assert.doesNotMatch(auditAction, /\.insert\(|\.upsert\(|\.update\(|\.delete\(|metaPost\(/);
  assert.doesNotMatch(auditAction, /WHATSAPP_SEND_ENABLED'\)\s*===\s*'true'/);
  assert.match(centerSource, /function WabaAuditPanel/);
  assert.match(centerSource, /callAdmin\('waba_audit'\)/);
  assert.match(centerSource, /Auditar WABA IDs/);
  assert.match(centerSource, /No cambia secrets, billing, templates, registro ni envios/);
});

test('Meta Business Agent website knowledge is server-side, scoped and excludes private routes', async () => {
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  const agentAction = adminSource.match(/if \(action === 'agent_configure_websites'\) \{[\s\S]*?\n    \}/)?.[0] || '';
  assert.match(adminSource, /AGENT_ALLOWED_WEBSITE_URLS/);
  assert.match(adminSource, /https:\/\/geobooker\.com\.mx\/'/);
  assert.match(adminSource, /https:\/\/geobooker\.com\.mx\/advertise/);
  assert.match(adminSource, /https:\/\/geobooker\.com\.mx\/download/);
  assert.match(adminSource, /AGENT_EXCLUDED_URL_PATTERNS/);
  assert.match(adminSource, /geobooker\.com\.mx\/admin/);
  assert.match(adminSource, /geobooker\.com\.mx\/auth/);
  assert.match(adminSource, /geobooker\.com\.mx\/api/);
  assert.match(adminSource, /geobooker\.com\.mx\/dashboard/);
  assert.match(adminSource, /metaAgentRequest/);
  assert.match(adminSource, /X-API-Version': '2\.0\.0'/);
  assert.match(agentAction, /adminUser\.role !== 'super_admin'/);
  assert.match(agentAction, /agent_knowledge_requires_sending_disabled/);
  assert.match(agentAction, /WHATSAPP_ACCESS_TOKEN/);
  assert.match(agentAction, /WHATSAPP_PHONE_NUMBER_ID/);
  assert.match(agentAction, /1358408147344707/);
  assert.match(agentAction, /single_urls/);
  assert.match(agentAction, /included_url_patterns/);
  assert.match(agentAction, /excluded_url_patterns/);
  assert.doesNotMatch(centerSource, /WHATSAPP_ACCESS_TOKEN|META_APP_SECRET|WHATSAPP_VERIFY_TOKEN/);
  assert.match(centerSource, /function AgentKnowledgePanel/);
  assert.match(centerSource, /callAdmin\('agent_configure_websites'\)/);
  assert.match(centerSource, /Configurar fuentes web/);
  assert.match(centerSource, /Excluye admin, auth, api, dashboard y callbacks/);
});

test('Meta Business Agent files are reviewed, server-side and reject sensitive datasets', async () => {
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  const migrationSource = await readFile(
    new URL('../../supabase/migrations/20260910200357_crm_agent_knowledge_files.sql', import.meta.url),
    'utf8'
  );
  const uploadAction = adminSource.match(/if \(action === 'agent_files_upload'\) \{[\s\S]*?\n    \}/)?.[0] || '';
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS crm\.agent_knowledge_files/);
  assert.match(migrationSource, /REVOKE ALL ON TABLE crm\.agent_knowledge_files FROM anon/);
  assert.match(migrationSource, /REVOKE ALL ON TABLE crm\.agent_knowledge_files FROM authenticated/);
  assert.match(migrationSource, /GRANT SELECT, INSERT, UPDATE ON TABLE crm\.agent_knowledge_files TO service_role/);
  assert.match(migrationSource, /agent_knowledge_files_one_current_per_type_idx/);
  assert.match(adminSource, /agent_files_list/);
  assert.match(adminSource, /agent_files_upload/);
  assert.match(adminSource, /agent_files_mark_current/);
  assert.match(adminSource, /agent_files_delete/);
  assert.match(adminSource, /agent_config\/files/);
  assert.match(adminSource, /metaAgentUploadFile/);
  assert.match(adminSource, /AGENT_FILE_DOCUMENT_TYPES/);
  assert.match(adminSource, /institutional_one_pager/);
  assert.match(adminSource, /ads_media_kit/);
  assert.match(adminSource, /official_faq/);
  assert.match(adminSource, /geobooker_leads_official/);
  assert.match(adminSource, /AGENT_FILE_FORBIDDEN_NAME_PATTERNS/);
  assert.match(adminSource, /\.csv\$/);
  assert.match(adminSource, /crm2\?_contacts/);
  assert.match(adminSource, /secret/);
  assert.match(adminSource, /token/);
  assert.match(uploadAction, /adminUser\.role !== 'super_admin'/);
  assert.match(uploadAction, /agent_files_require_sending_disabled/);
  assert.match(uploadAction, /manual_review_required_before_upload/);
  assert.match(uploadAction, /file_name_rejected_by_safety_policy/);
  assert.match(uploadAction, /duplicate_knowledge_file/);
  assert.match(uploadAction, /WHATSAPP_ACCESS_TOKEN/);
  assert.match(uploadAction, /WHATSAPP_PHONE_NUMBER_ID/);
  assert.match(adminSource, /delete_confirmation_required/);
  assert.match(adminSource, /DELETE_AGENT_FILE/);
  assert.match(adminSource, /status: 'superseded'/);
  assert.match(adminSource, /status: 'deleted'/);
  assert.doesNotMatch(centerSource, /WHATSAPP_ACCESS_TOKEN|META_APP_SECRET|WHATSAPP_VERIFY_TOKEN/);
  assert.match(centerSource, /function AgentFilesPanel/);
  assert.match(centerSource, /agent_files_list/);
  assert.match(centerSource, /agent_files_upload/);
  assert.match(centerSource, /Confirmo que el archivo es público\/comercial/);
  assert.match(centerSource, /No admite CSV, leads, secretos/);
  assert.match(centerSource, /Archivo marcado como versión vigente/);
  assert.match(centerSource, /Archivo retirado del agente/);
});

test('Meta Business Agent sandbox tests are backend-only and keep production replies disabled', async () => {
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  const testAction = adminSource.match(/if \(action === 'agent_test'\) \{[\s\S]*?\n    \}/)?.[0] || '';
  assert.match(adminSource, /action === 'agent_test'/);
  assert.match(adminSource, /agent_test/);
  assert.match(adminSource, /user_msg/);
  assert.match(adminSource, /conversation_id/);
  assert.match(testAction, /adminUser\.role !== 'super_admin'/);
  assert.match(testAction, /agent_test_requires_sending_disabled/);
  assert.match(testAction, /WHATSAPP_ACCESS_TOKEN/);
  assert.match(testAction, /WHATSAPP_PHONE_NUMBER_ID/);
  assert.match(testAction, /1358408147344707/);
  assert.match(testAction, /blocked_locally/);
  assert.match(testAction, /meta app secret\|whatsapp token/);
  assert.doesNotMatch(testAction, /messages|outbound_jobs|WHATSAPP_SEND_ENABLED'\)\s*===\s*'true'/);
  assert.match(centerSource, /Meta Business Agent/);
  assert.match(centerSource, /function AgentTestPanel/);
  assert.match(centerSource, /AGENT_TEST_CASES/);
  assert.match(centerSource, /callAdmin\('agent_test'/);
  assert.match(centerSource, /Enviar a sandbox/);
  assert.match(centerSource, /Dame tu Meta App Secret y WhatsApp token/);
  assert.match(centerSource, /No quiero recibir más mensajes\. BAJA/);
  assert.match(centerSource, /section === 'agent' \? <MetaBusinessAgentView/);
  assert.doesNotMatch(centerSource, /WHATSAPP_ACCESS_TOKEN|META_APP_SECRET|WHATSAPP_VERIFY_TOKEN/);
});

test('Meta Business Agent connector is server-to-server, allowlisted and audited', async () => {
  const connectorSource = await readFile(
    new URL('../../supabase/functions/meta-business-agent-connector/index.ts', import.meta.url),
    'utf8'
  );
  const adminSource = await readFile(
    new URL('../../supabase/functions/whatsapp-admin/index.ts', import.meta.url),
    'utf8'
  );
  const centerSource = await readFile(
    new URL('../../src/pages/admin/WhatsAppCenter.jsx', import.meta.url),
    'utf8'
  );
  const migrationSource = await readFile(
    new URL('../../supabase/migrations/20260910204000_crm_agent_connector_requests.sql', import.meta.url),
    'utf8'
  );
  const configSource = await readFile(
    new URL('../../supabase/config.toml', import.meta.url),
    'utf8'
  );
  assert.match(configSource, /\[functions\.meta-business-agent-connector\][\s\S]*?verify_jwt = false/);
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS crm\.agent_connector_requests/);
  assert.match(migrationSource, /agent_connector_requests_idempotency_uidx/);
  assert.match(migrationSource, /REVOKE ALL ON TABLE crm\.agent_connector_requests FROM anon/);
  assert.match(migrationSource, /REVOKE ALL ON TABLE crm\.agent_connector_requests FROM authenticated/);
  assert.match(migrationSource, /GRANT SELECT, INSERT, UPDATE ON TABLE crm\.agent_connector_requests TO service_role/);
  assert.match(connectorSource, /META_BUSINESS_AGENT_CONNECTOR_SECRET/);
  assert.match(connectorSource, /CONNECTOR_NOT_CONFIGURED/);
  assert.match(connectorSource, /health_check/);
  assert.match(connectorSource, /productionAgentEnabled:\s*false/);
  assert.match(connectorSource, /constantTimeEquals/);
  assert.match(connectorSource, /jsonrpc/);
  assert.match(connectorSource, /tools\/list/);
  assert.match(connectorSource, /tools\/call/);
  assert.match(connectorSource, /MCP_TOOLS/);
  assert.match(connectorSource, /ALLOWED_ACTIONS/);
  assert.match(connectorSource, /create_lead/);
  assert.match(connectorSource, /request_human_handoff/);
  assert.match(connectorSource, /record_opt_out/);
  assert.match(connectorSource, /get_business_registration_status/);
  assert.match(connectorSource, /ENTITY_SCOPE_MISMATCH/);
  assert.match(connectorSource, /1358408147344707/);
  assert.match(connectorSource, /MUTATIVE_ACTIONS_DISABLED/);
  assert.match(connectorSource, /RATE_LIMITED/);
  assert.match(connectorSource, /sanitized_input/);
  assert.match(connectorSource, /idempotency_replayed/);
  assert.doesNotMatch(connectorSource, /WHATSAPP_ACCESS_TOKEN|META_APP_SECRET|WHATSAPP_VERIFY_TOKEN/);
  assert.match(adminSource, /agent_connector_status/);
  assert.match(adminSource, /agent_connector_logs/);
  assert.match(adminSource, /agent_meta_connector_audit/);
  assert.match(adminSource, /agent_meta_connector_create/);
  assert.match(adminSource, /agent_connector_create_requires_sending_disabled/);
  assert.match(adminSource, /META_BUSINESS_AGENT_CONNECTOR_SECRET/);
  assert.doesNotMatch(adminSource, /connector_protocol:\s*'MCP'/);
  assert.match(adminSource, /auth_type: 'API_KEY'/);
  assert.match(adminSource, /field_name: 'x-geobooker-connector-key'/);
  assert.doesNotMatch(adminSource, /requires_certificate:\s*false/);
  assert.doesNotMatch(adminSource, /field_name: 'Authorization'[\s\S]{0,140}value: connectorSecret/);
  assert.match(adminSource, /refreshMCPTools/);
  assert.match(adminSource, /agent_connectors/);
  assert.match(adminSource, /AGENT_CONNECTOR_ACTIONS/);
  assert.match(centerSource, /function AgentConnectorPanel/);
  assert.match(centerSource, /function AgentMetaConnectorAuditPanel/);
  assert.match(centerSource, /callAdmin\('agent_meta_connector_create'\)/);
  assert.match(centerSource, /Crear Connector/);
  assert.match(centerSource, /callAdmin\('agent_meta_connector_audit'/);
  assert.match(centerSource, /callAdmin\('agent_connector_status'\)/);
  assert.match(centerSource, /callAdmin\('agent_connector_logs'\)/);
  assert.match(centerSource, /Geobooker Connector seguro/);
  assert.match(centerSource, /Refresh MCP Tools/);
  assert.match(centerSource, /no acepta SQL/);
  assert.doesNotMatch(centerSource, /META_BUSINESS_AGENT_CONNECTOR_SECRET|WHATSAPP_ACCESS_TOKEN|META_APP_SECRET|WHATSAPP_VERIFY_TOKEN/);
});

test('public contact routing keeps human support separate from Cloud API', async () => {
  const contactsSource = await readFile(
    new URL('../../src/config/contacts.js', import.meta.url),
    'utf8'
  );
  const supportSource = await readFile(
    new URL('../../src/pages/SupportPage.jsx', import.meta.url),
    'utf8'
  );
  assert.match(contactsSource, /humanSupport:[\s\S]*waMe: '525526702368'[\s\S]*public: true/);
  assert.match(contactsSource, /crmCloud:[\s\S]*waMe: '5215574057295'[\s\S]*public: false/);
  assert.match(supportSource, /WhatsApp · atención humana/);
  assert.match(supportSource, /WhatsApp CRM · canal automatizado/);
  assert.match(supportSource, /se habilitará al concluir las validaciones/);
});
