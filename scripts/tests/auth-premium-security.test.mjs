import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  clearPasswordRecoveryVerification,
  getPasswordRecoveryRedirect,
  hasPasswordRecoverySignal,
  isPasswordRecoveryVerified,
  markPasswordRecoveryVerified
} from '../../src/utils/authRedirects.js';

test('password recovery redirects remain on approved Geobooker origins', () => {
  assert.equal(
    getPasswordRecoveryRedirect({ hostname: 'geobooker.com.mx' }),
    'https://geobooker.com.mx/reset-password'
  );
  assert.equal(
    getPasswordRecoveryRedirect({ hostname: 'www.geobooker.com' }),
    'https://www.geobooker.com/reset-password'
  );
  assert.equal(
    getPasswordRecoveryRedirect({ isNative: true }),
    'https://geobooker.com.mx/reset-password'
  );
});

test('only recovery callbacks establish recovery intent', () => {
  assert.equal(hasPasswordRecoverySignal('https://geobooker.com.mx/reset-password?code=abc'), true);
  assert.equal(hasPasswordRecoverySignal('https://geobooker.com.mx/auth/callback?code=abc'), false);
  assert.equal(hasPasswordRecoverySignal('https://geobooker.com.mx/reset-password#type=recovery'), true);
  assert.equal(hasPasswordRecoverySignal('https://geobooker.com.mx/reset-password'), false);
});

test('recovery verification marker can be consumed and cleared', () => {
  const values = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };

  assert.equal(isPasswordRecoveryVerified(), false);
  markPasswordRecoveryVerified();
  assert.equal(isPasswordRecoveryVerified(), true);
  clearPasswordRecoveryVerification();
  assert.equal(isPasswordRecoveryVerified(), false);
  delete globalThis.sessionStorage;
});

test('Premium rate-limit migration is server-only and callable by service_role', async () => {
  const sql = await readFile(
    new URL('../../supabase/migrations/20260907010000_restore_premium_rate_limit.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /REVOKE ALL ON TABLE public\.api_rate_limits FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.check_rate_limit[\s\S]*TO service_role/i);
  assert.doesNotMatch(sql, /GRANT[^;]*(anon|authenticated)/i);
});
