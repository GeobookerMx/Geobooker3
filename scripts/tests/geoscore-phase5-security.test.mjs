import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const publicPagePath = new URL('../../src/pages/geoscore/GeoScorePublicPage.jsx', import.meta.url);
const edgeFunctionPath = new URL('../../supabase/functions/location-intelligence/index.ts', import.meta.url);
const phase5MigrationPath = new URL('../../supabase/migrations/20260930200000_geoscore_phase5_certificates.sql', import.meta.url);
const hardeningMigrationPath = new URL('../../supabase/migrations/20261001103000_geoscore_phase5_certificate_issue_hardening.sql', import.meta.url);

test('GeoScore certificate issuance is backend-only from the public page', async () => {
  const [publicPage, edgeFunction] = await Promise.all([
    readFile(publicPagePath, 'utf8'),
    readFile(edgeFunctionPath, 'utf8')
  ]);

  assert.doesNotMatch(publicPage, /supabase\.rpc\(['"]geoscore_issue_certificate['"]/);
  assert.match(publicPage, /action:\s*['"]issue_certificate['"]/);
  assert.match(edgeFunction, /publicActions = new Set\(\[[^\]]*'issue_certificate'/);
  assert.match(edgeFunction, /admin\.rpc\('geoscore_calculate_location_score_safe'/);
  assert.match(edgeFunction, /score_not_eligible_for_certificate/);
  assert.match(edgeFunction, /admin\.rpc\('geoscore_issue_certificate'/);
});

test('GeoScore issue RPC is not executable by anon or authenticated clients', async () => {
  const [phase5Migration, hardeningMigration] = await Promise.all([
    readFile(phase5MigrationPath, 'utf8'),
    readFile(hardeningMigrationPath, 'utf8')
  ]);
  const combined = `${phase5Migration}\n${hardeningMigration}`;
  const issueGrants = [...combined.matchAll(/GRANT EXECUTE ON FUNCTION public\.geoscore_issue_certificate\([\s\S]*?\)\s+TO\s+([^;]+);/g)]
    .map((match) => match[1].trim().toLowerCase());

  assert.match(combined, /REVOKE ALL ON FUNCTION public\.geoscore_issue_certificate[\s\S]+FROM PUBLIC, anon, authenticated;/);
  assert.ok(issueGrants.length >= 1);
  assert.ok(issueGrants.every((roles) => roles === 'service_role'));
  assert.ok(!issueGrants.some((roles) => /public|anon|authenticated/.test(roles)));
});
