import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  computeRetry,
  evaluateOutboundPolicy,
  isCustomerServiceWindowOpen,
  shouldAdvanceMessageStatus
} from '../../supabase/functions/_shared/whatsapp-security.js';
import {
  getIngestionSourceDefinition,
  listIngestionSources,
  normalizeLegacySourceRecord
} from '../../supabase/functions/_shared/crm-ingestion-adapters.js';

const activeBudget = { is_active: true, kill_switch: false };

test('outbound policy fails closed when sending is disabled', () => {
  assert.deepEqual(evaluateOutboundPolicy({
    budgetPolicy: null, permissionStatus: 'opted_in', suppressed: false,
    serviceWindowOpen: true, messageType: 'text'
  }), { allowed: false, reason: 'sending_disabled' });
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
  assert.match(centerSource, /Crear campaign draft \+ dry run/);
  assert.match(centerSource, /No aprueba, no agenda y no env/);
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
  const template = { approval_status: 'approved', category: 'marketing' };
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
  assert.match(centerSource, /Cola outbound/);
  assert.match(centerSource, /Dead letters/);
  assert.match(centerSource, /Próximo job vencido/);
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
