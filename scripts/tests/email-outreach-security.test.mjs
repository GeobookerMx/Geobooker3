import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const require = createRequire(import.meta.url);
const { normalizeEmail } = require('../../netlify/functions/_crm-email-suppression.js');

const processorPath = new URL('../../netlify/functions/process-email-queue.js', import.meta.url);
const unsubscribePath = new URL('../../netlify/functions/crm-unsubscribe.js', import.meta.url);
const webhookPath = new URL('../../netlify/functions/resend-webhook.js', import.meta.url);
const migrationPath = new URL('../../supabase/migrations/20260930130000_crm_email_explicit_opt_in_gate.sql', import.meta.url);

test('email normalization is stable for suppression matching', () => {
  assert.equal(normalizeEmail('  Person@Example.COM '), 'person@example.com');
  assert.equal(normalizeEmail(null), '');
});

test('the Resend queue requires evidenced explicit opt-in and global suppression checks', async () => {
  const [processor, migration] = await Promise.all([
    readFile(processorPath, 'utf8'),
    readFile(migrationPath, 'utf8')
  ]);

  assert.match(processor, /email_marketing_basis !== 'explicit_opt_in'/);
  assert.match(processor, /loadActiveEmailSuppressions/);
  assert.match(processor, /isEmailSuppressed/);
  assert.match(migration, /mc\.email_marketing_basis = 'explicit_opt_in'/);
  assert.match(migration, /FROM crm\.suppressions suppression/);
  assert.match(migration, /NOT crm\.is_admin\(auth\.uid\(\)\)/);
  assert.match(migration, /'\{email_sending_enabled\}'/);
  assert.doesNotMatch(migration, /GRANT EXECUTE[^;]+\bTO\s+anon\b/i);
  assert.doesNotMatch(migration, /UPDATE public\.email_queue/i);
});

test('unsubscribe and adverse provider events populate the canonical suppression list', async () => {
  const [unsubscribe, webhook] = await Promise.all([
    readFile(unsubscribePath, 'utf8'),
    readFile(webhookPath, 'utf8')
  ]);

  assert.match(unsubscribe, /recordEmailSuppression/);
  assert.match(unsubscribe, /reason: 'opt_out'/);
  assert.match(webhook, /reason: 'complaint'/);
  assert.match(webhook, /'hard_bounce'/);
  assert.match(webhook, /type === 'email\.suppressed'/);
});
