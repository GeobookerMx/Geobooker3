import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scanner = fileURLToPath(new URL('../security/secret-scan.mjs', import.meta.url));
function runScan(name, content) {
  const directory = mkdtempSync(path.join(tmpdir(), 'geobooker-secret-test-'));
  try {
    writeFileSync(path.join(directory, name), content);
    writeFileSync(path.join(directory, 'tracked.txt'), `${name}\n`);
    return spawnSync(process.execPath, [scanner, 'tracked.txt'], {
      cwd: directory, encoding: 'utf8', windowsHide: true
    });
  } finally {
    rmSync(directory, {recursive:true, force:true});
  }
}
function fakeToken(claims) {
  return [
    Buffer.from(JSON.stringify({alg:'HS256', typ:'JWT'})).toString('base64url'),
    Buffer.from(JSON.stringify(claims)).toString('base64url'),
    Buffer.from('test-only-invalid-signature').toString('base64url')
  ].join('.');
}

test('privileged JWTs are rejected in ordinary source files without logging their value', () => {
  for (const claims of [{role:'service_role'}, {role:'supabase_admin'}, {aud:'https://appleid.apple.com', sub:'test-service'}]) {
    const token = fakeToken(claims);
    const result = runScan('source.js', `export const key = '${token}';`);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Privileged Supabase or Apple/);
    assert.ok(!`${result.stdout}${result.stderr}`.includes(token));
  }
});

test('public anon JWTs, example placeholders and token-shaped regular expressions remain allowed', () => {
  assert.equal(runScan('source.js', `const key='${fakeToken({role:'anon'})}';`).status, 0);
  assert.equal(runScan('.env.example', 'SUPABASE_SERVICE_ROLE_KEY=your_example_key\n').status, 0);
  assert.equal(runScan('.env.production', `VITE_SUPABASE_ANON_KEY=${fakeToken({role:'anon'})}\nVITE_META_PIXEL_ID=1234567890123456\n`).status, 0);
  assert.equal(runScan('.env.production', 'SUPABASE_SERVICE_ROLE_KEY=test-only-private-value\n').status, 1);
  assert.equal(runScan('patterns.js', '/eyJ[A-Za-z0-9_-]{20,}/;').status, 0);
});

test('signing credentials and dated Apple secret files are rejected by name', () => {
  for (const file of ['AuthKey_TEST.p8', 'upload.jks', 'signing.p12', 'signing.pfx', 'upload.keystore', 'apple-client-secret-20261117.txt']) {
    const result = runScan(file, 'test-only-placeholder');
    assert.equal(result.status, 1, file);
    assert.match(result.stderr, /Sensitive filename/);
  }
});

test('Supabase secret keys and private key material fail without disclosing the contents', () => {
  const secret = ['sb', 'secret', 'test-only-not-a-real-key-1234567890'].join('_');
  const result = runScan('config.js', `const key='${secret}';`);
  assert.equal(result.status, 1);
  assert.ok(!result.stderr.includes(secret));
  const privateKeyMarker = `${'-'.repeat(5)}BEGIN PRIVATE KEY${'-'.repeat(5)}`;
  assert.equal(runScan('config.js', privateKeyMarker).status, 1);
});
