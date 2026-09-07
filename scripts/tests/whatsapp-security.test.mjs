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
