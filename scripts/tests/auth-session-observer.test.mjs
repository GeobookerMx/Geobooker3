import test from 'node:test';
import assert from 'node:assert/strict';
import { observeAuthSession, setAuthRefreshActivity } from '../../src/utils/authSessionObserver.js';

const session = id => ({ user: { id }, access_token: 'test-only' });
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

function fixture() {
  let resolveRead, rejectRead, listener;
  let unsubscribed = false;
  const read = new Promise((resolve, reject) => { resolveRead = resolve; rejectRead = reject; });
  const timers = new Map();
  let id = 0;
  let state = { user: null, loading: true, authError: null };
  const errors = [];
  const auth = {
    getSession: () => read,
    onAuthStateChange: callback => {
      listener = callback;
      return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } };
    },
  };
  const dispose = observeAuthSession({
    auth, onState: next => { state = { ...state, ...next }; }, onError: error => errors.push(error),
    schedule: callback => { timers.set(++id, callback); return id; }, cancel: key => timers.delete(key),
  });
  return {
    get state() { return state; }, get unsubscribed() { return unsubscribed; }, errors, timers, dispose,
    emit: (event, value) => listener(event, value),
    resolve: value => resolveRead({ data: { session: value }, error: null }), reject: rejectRead,
    timeout: () => { for (const callback of [...timers.values()]) callback(); },
  };
}

test('Apple SIGNED_IN cancels startup timeout and wins over a stale null session read', async () => {
  const f = fixture();
  f.emit('SIGNED_IN', session('apple-account'));
  assert.equal(f.timers.size, 0);
  f.resolve(null);
  await tick();
  f.timeout();
  assert.equal(f.state.user.id, 'apple-account');
  assert.equal(f.state.authError, null);
  assert.equal(f.state.loading, false);
  f.dispose();
});

test('an outdated rejected startup read cannot undo a successful login', async () => {
  const f = fixture();
  f.emit('SIGNED_IN', session('apple-account'));
  f.reject(new Error('offline startup'));
  await tick();
  assert.equal(f.state.user.id, 'apple-account');
  assert.equal(f.errors.length, 0);
  f.dispose();
});

test('a delayed INITIAL_SESSION cannot erase a newer Apple login', () => {
  const f = fixture();
  f.emit('SIGNED_IN', session('apple-account'));
  f.emit('INITIAL_SESSION', null);
  assert.equal(f.state.user.id, 'apple-account');
  f.dispose();
});

test('explicit sign out wins over a delayed previously authenticated startup read', async () => {
  const f = fixture();
  f.emit('SIGNED_IN', session('old-account'));
  f.emit('SIGNED_OUT', null);
  f.resolve(session('old-account'));
  await tick();
  assert.equal(f.state.user, null);
  assert.equal(f.state.authError, null);
  f.dispose();
});

test('offline startup stays retryable rather than pretending the user signed out', async () => {
  const f = fixture();
  f.timeout();
  assert.ok(f.state.authError);
  assert.equal(f.state.loading, false);
  f.emit('SIGNED_IN', session('reconnected-account'));
  f.resolve(null);
  await tick();
  assert.equal(f.state.user.id, 'reconnected-account');
  assert.equal(f.state.authError, null);
  f.dispose();
});

test('a confirmed empty session is anonymous, while a failed read remains an error', async () => {
  const guest = fixture();
  guest.resolve(null);
  await tick();
  assert.deepEqual(guest.state, { user: null, loading: false, authError: null });
  guest.dispose();
  const offline = fixture();
  offline.reject(new Error('network unavailable'));
  await tick();
  assert.ok(offline.state.authError);
  offline.dispose();
});

test('token refresh keeps the account; null unrelated events do not sign it out', () => {
  const f = fixture();
  f.emit('SIGNED_IN', session('account'));
  f.emit('TOKEN_REFRESHED', session('account'));
  f.emit('USER_UPDATED', null);
  assert.equal(f.state.user.id, 'account');
  f.dispose();
});

test('unmounted auth observers cannot update state or retain startup timers', async () => {
  const f = fixture();
  f.dispose();
  f.emit('SIGNED_IN', session('late-account'));
  f.resolve(session('late-account'));
  await tick();
  assert.equal(f.state.user, null);
  assert.equal(f.timers.size, 0);
  assert.equal(f.unsubscribed, true);
});

test('returning from Apple OAuth resumes SDK auto-refresh without forcing token rotation', async () => {
  const calls = [];
  const auth = {
    startAutoRefresh: async () => calls.push('start'),
    stopAutoRefresh: async () => calls.push('stop'),
    refreshSession: () => { throw new Error('Do not force token rotation on resume'); },
  };
  await setAuthRefreshActivity(auth, false);
  await setAuthRefreshActivity(auth, true);
  await setAuthRefreshActivity(auth, true);
  assert.deepEqual(calls, ['stop', 'start', 'start']);
});
