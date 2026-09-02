import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import {
  classifyWebhookPayload,
  isAllowedWebhookScope,
  isMetaTestPayload
} from '../../supabase/functions/_shared/whatsapp-events.js';
import { verifyMetaSignature } from '../../supabase/functions/_shared/whatsapp-security.js';
import { verifyWebhookSubscription } from '../../supabase/functions/_shared/whatsapp-webhook-http.js';

const payload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: 'waba_test',
    changes: [{
      field: 'messages',
      value: {
        metadata: { phone_number_id: 'phone_test', display_phone_number: '15550000000' },
        messages: [{ id: 'wamid.inbound.1', from: '5215512345678', timestamp: '1788048000', type: 'text', text: { body: 'Hola' } }],
        statuses: [{ id: 'wamid.outbound.1', recipient_id: '5215512345678', timestamp: '1788048001', status: 'delivered' }]
      }
    }]
  }]
};

test('GET verification returns only the challenge for the expected token', () => {
  assert.deepEqual(
    verifyWebhookSubscription({ mode: 'subscribe', token: 'strong-test-token', challenge: '123456' }, 'strong-test-token'),
    { verified: true, status: 200, challenge: '123456' }
  );
  assert.equal(
    verifyWebhookSubscription({ mode: 'subscribe', token: 'wrong', challenge: '123456' }, 'strong-test-token').status,
    403
  );
});

test('POST signature validation accepts a valid x-hub-signature-256 and rejects an invalid one', async () => {
  const raw = JSON.stringify(payload);
  const secret = 'meta-app-secret-for-test-only';
  const signature = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
  assert.equal(await verifyMetaSignature(raw, signature, secret), true);
  assert.equal(await verifyMetaSignature(raw, 'sha256='.padEnd(71, '0'), secret), false);
});

test('messages webhook extracts inbound and delivery status identifiers', () => {
  const events = classifyWebhookPayload(payload);
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((event) => event.kind), ['inbound', 'status']);
  assert.equal(events[0].providerMessageId, 'wamid.inbound.1');
  assert.equal(events[0].providerWaId, '5215512345678');
  assert.equal(events[0].phoneNumberId, 'phone_test');
  assert.equal(events[0].text, 'Hola');
  assert.equal(events[1].status, 'delivered');
});

test('webhook scope fails closed and accepts only configured WABA and phone IDs', () => {
  assert.equal(isAllowedWebhookScope(payload, new Set(['waba_test']), new Set(['phone_test'])), true);
  assert.equal(isAllowedWebhookScope(payload, new Set(), new Set(['phone_test'])), false);
  assert.equal(isAllowedWebhookScope(payload, new Set(['waba_test']), new Set(['other_phone'])), false);
});

test('Meta sample bypass accepts only the exact signed-test payload shape and configured sample phone ID', () => {
  const sample = structuredClone(payload);
  sample.entry[0].changes[0].value.metadata.phone_number_id = '123456123';
  sample.entry[0].changes[0].value.messages = [{
    id: 'wamid.meta.sample',
    from: '16315551181',
    timestamp: '1788048000',
    type: 'text',
    text: { body: 'this is a text message' }
  }];
  sample.entry[0].changes[0].value.statuses = [];

  assert.equal(isMetaTestPayload(sample, new Set(['123456123'])), true);
  assert.equal(isMetaTestPayload(sample, new Set(['another-id'])), false);

  const wrongBody = structuredClone(sample);
  wrongBody.entry[0].changes[0].value.messages[0].text.body = 'anything else';
  assert.equal(isMetaTestPayload(wrongBody, new Set(['123456123'])), false);

  const mixedPayload = structuredClone(sample);
  mixedPayload.entry[0].changes.push({ field: 'account_update', value: {} });
  assert.equal(isMetaTestPayload(mixedPayload, new Set(['123456123'])), false);
});
