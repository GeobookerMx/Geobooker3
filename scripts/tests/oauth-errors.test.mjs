import test from 'node:test';
import assert from 'node:assert/strict';
import { getOAuthError } from '../../src/utils/oauthErrors.js';

test('successful callback data is never treated as a login error', () => {
  assert.equal(getOAuthError('?code=fake-code'), null);
  assert.equal(getOAuthError('', '#access_token=fake-token&refresh_token=fake-refresh'), null);
});

test('query and fragment errors retain a safe actionable category', () => {
  const cases = [
    ['access_denied', '', 'auth_cancelled'],
    ['server_error', '503 Service Unavailable', 'auth_provider_unavailable'],
    ['server_error', 'oauth2: invalid_client', 'auth_provider_configuration'],
    ['server_error', 'invalid_grant: code expired', 'auth_code_expired'],
    ['server_error', 'Unable to exchange external code: c4da', 'auth_exchange_failed'],
    ['auth_exchange_failed', '', 'auth_exchange_failed']
  ];
  for (const [error, description, expected] of cases) {
    const params = new URLSearchParams({error, error_description:description}).toString();
    assert.equal(getOAuthError(params).code, expected);
    assert.deepEqual(getOAuthError('', `#${params}`), getOAuthError(params));
  }
  assert.equal(getOAuthError('?error_code=unexpected_failure').code, 'auth_exchange_failed');
});

test('untrusted descriptions, identifiers and HTML never reach output', () => {
  const result = getOAuthError(new URLSearchParams({
    error:'server_error', error_code:'unexpected_failure',
    error_description:'Unable to exchange external code: SECRET victim@example.invalid <script>alert(1)</script>'
  }).toString());
  assert.equal(result.code, 'auth_exchange_failed');
  assert.doesNotMatch(JSON.stringify(result), /SECRET|victim|script|external code/);
  assert.equal(getOAuthError('?error=__proto__').code, 'auth_failed');
});
