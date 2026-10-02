import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const webhookPath = new URL('../../netlify/functions/stripe-webhook.js', import.meta.url);
const checkoutAuthorityPath = new URL('../../netlify/functions/_checkout-authority.js', import.meta.url);
const oxxoStatusPath = new URL('../../netlify/functions/check-payment-status.js', import.meta.url);
const migrationPath = new URL('../../supabase/migrations/20261002113000_ads_stripe_webhook_audit_idempotency.sql', import.meta.url);

test('Stripe webhook has idempotency audit and handles canceled payments', async () => {
  const [webhook, migration] = await Promise.all([
    readFile(webhookPath, 'utf8'),
    readFile(migrationPath, 'utf8')
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.stripe_webhook_events/);
  assert.match(migration, /stripe_event_id TEXT NOT NULL UNIQUE/);
  assert.match(migration, /FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /GRANT ALL ON TABLE public\.stripe_webhook_events TO service_role/);
  assert.match(webhook, /claimStripeWebhookEvent/);
  assert.match(webhook, /markStripeWebhookEvent/);
  assert.match(webhook, /Duplicate event ignored/);
  assert.match(webhook, /case 'payment_intent\.canceled'/);
});

test('Ads checkout amount is resolved server-side and OXXO status is token-protected', async () => {
  const [checkoutAuthority, oxxoStatus] = await Promise.all([
    readFile(checkoutAuthorityPath, 'utf8'),
    readFile(oxxoStatusPath, 'utf8')
  ]);

  assert.match(checkoutAuthority, /resolveCheckoutAuthority/);
  assert.match(checkoutAuthority, /getTrustedLocalAdPrice/);
  assert.match(checkoutAuthority, /ad_spaces\(id, name, display_name, price_monthly\)/);
  assert.match(checkoutAuthority, /allowOxxo: isMexico/);
  assert.match(oxxoStatus, /verifyPaymentStatusToken/);
  assert.match(oxxoStatus, /validPaymentIntentId/);
});
