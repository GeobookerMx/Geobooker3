import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const migrationPath = new URL('../../supabase/migrations/20261002124500_ads_international_commercial_audit.sql', import.meta.url);

test('international Ads audit covers fiscal controls, high-value threshold and localized KPIs', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.ads_campaign_commercial_audit/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.ads_campaign_kpi_summary/);
  assert.match(migration, /spain_buyer_colombia_campaign/);
  assert.match(migration, /highValueThresholdMxn', 18000/);
  assert.match(migration, /high_value_contract_required/);
  assert.match(migration, /oxxo_only_for_mx_billing/);
  assert.match(migration, /foreign_buyer_foreign_delivery_export_review/);
  assert.match(migration, /export_review_required/);
  assert.match(migration, /kpi_report_language/);
  assert.match(migration, /recommendations/);
});

test('international Ads audit log is RLS-protected and service-role writable', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.ad_campaign_commercial_audit_log/);
  assert.match(migration, /FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /ad_campaign_commercial_audit_admin_all_v1/);
  assert.match(migration, /ad_campaign_commercial_audit_advertiser_read_v1/);
  assert.match(migration, /GRANT ALL ON public\.ad_campaign_commercial_audit_log TO service_role/);
  assert.match(migration, /REVOKE ALL ON public\.ad_campaign_commercial_audit_log FROM anon/);
});
