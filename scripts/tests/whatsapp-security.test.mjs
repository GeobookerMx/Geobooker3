import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  computeRetry,
  evaluateOutboundPolicy,
  isCustomerServiceWindowOpen,
  shouldAdvanceMessageStatus
} from '../../supabase/functions/_shared/whatsapp-security.js';

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
