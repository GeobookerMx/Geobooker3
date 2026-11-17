import test from 'node:test';
import assert from 'node:assert/strict';
import { createMetaConversionTracker } from '../../src/utils/metaConversionState.js';

const userId = '11111111-1111-4111-8111-111111111111';
const businessId = '22222222-2222-4222-8222-222222222222';
const oldBusinessId = '33333333-3333-4333-8333-333333333333';
const user = { id: userId, email_confirmed_at: '2026-11-15T12:00:00Z' };
function fixture() {
  const data = new Map();
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  const calls = [];
  const state = { allowed: true, first: null };
  const make = () => createMetaConversionTracker({ storage,
    sendRegistration: async params => { if (state.fail) throw new Error('offline'); if (!state.allowed) return false; calls.push(['registration', params]); return true; },
    sendPublication: async id => { if (!state.allowed) return false; calls.push(['publication', id]); return true; },
    lookupFirstPublishedBusiness: async () => state.first,
    now: () => Date.parse('2026-11-15T12:00:00Z'),
  });
  return { tracker: make(), make, calls, state };
}

test('registration requires a real signup and a confirmed session; retries are deduplicated across reloads', async () => {
  const { tracker, make, calls } = fixture();
  assert.equal(tracker.recordSignup({ user: { id: userId, identities: [] } }), false);
  await tracker.observeSession({ user });
  assert.equal(calls.length, 0);
  tracker.recordSignup({ user: { id: userId, identities: [{ provider: 'email' }] } });
  await tracker.observeSession({ user: { id: userId } });
  assert.equal(calls.length, 0);
  await Promise.all([tracker.observeSession({ user }), tracker.observeSession({ user })]);
  await make().observeSession({ user });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ['registration', { method: 'email', userId }]);
});

test('denied or unavailable tracking does not consume completed actions', async () => {
  const { tracker, calls, state } = fixture();
  tracker.recordSignup({ user: { id: userId, identities: [{}] } });
  state.allowed = false;
  await tracker.observeSession({ user });
  assert.equal(calls.length, 0);
  state.allowed = true;
  await tracker.observeSession({ user });
  assert.equal(calls.length, 1);
});

test('business event waits for approval and logs the first successful publication once', async () => {
  const { tracker, make, calls, state } = fixture();
  tracker.recordBusiness({ id: businessId, owner_id: userId, listing_type: 'business', status: 'pending' }, userId);
  await tracker.observeSession({ user });
  assert.equal(calls.length, 0);
  state.first = { id: businessId, owner_id: userId, status: 'pending' };
  await tracker.observeSession({ user });
  assert.equal(calls.length, 0);
  state.first.status = 'approved';
  await tracker.observeSession({ user });
  tracker.recordBusiness({ id: oldBusinessId, owner_id: userId }, userId);
  await make().observeSession({ user });
  assert.deepEqual(calls, [['publication', userId]]);
});

test('an existing published business, another owner or a rental is not a first business conversion', async () => {
  const { tracker, calls, state } = fixture();
  assert.equal(tracker.recordBusiness({ id: businessId, owner_id: oldBusinessId }, userId), false);
  assert.equal(tracker.recordBusiness({ id: businessId, owner_id: userId, listing_type: 'space_rental' }, userId), false);
  tracker.recordBusiness({ id: businessId, owner_id: userId }, userId);
  state.first = { id: oldBusinessId, owner_id: userId, status: 'approved' };
  await tracker.observeSession({ user });
  assert.equal(calls.length, 0);
});

test('OAuth signup intent cannot turn an existing login into a completed registration', async () => {
  const { tracker, calls } = fixture();
  tracker.recordOAuthAttempt('google');
  await tracker.observeSession({ user: { ...user, created_at: '2026-10-01T00:00:00Z', app_metadata: { provider: 'google' } } });
  assert.equal(calls.length, 0);
  tracker.recordOAuthAttempt('google');
  await tracker.observeSession({ user: { ...user, created_at: '2026-11-15T12:00:00Z', app_metadata: { provider: 'google' } } });
  assert.equal(calls.length, 1);
});

test('a failed send remains retryable and an anonymous session never logs conversions', async () => {
  const f = fixture();
  f.tracker.recordSignup({ user: { id: userId, identities: [{}] } });
  await f.tracker.observeSession({ user: { ...user, is_anonymous: true } });
  assert.equal(f.calls.length, 0);
  f.state.fail = true;
  await assert.rejects(f.tracker.observeSession({ user }), /offline/);
  f.state.fail = false;
  await f.tracker.observeSession({ user });
  assert.equal(f.calls.length, 1);
});
