import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const migrationPath = new URL('../../supabase/migrations/20261002133000_crm_intl_strategic_accounts_phase2.sql', import.meta.url);

test('strategic accounts CRM adds ABM evidence, buying committee and CRM bridge outbox', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.intl_account_research/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.intl_evidence/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.intl_buying_committee/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.intl_claims_catalog/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.intl_integration_outbox/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm\.intl_crm_links/);
  assert.match(migration, /INTL_LEAD_QUALIFIED/);
  assert.match(migration, /UNIQUE \(event_id\)/);
  assert.match(migration, /idempotency_key TEXT NOT NULL UNIQUE/);
});

test('strategic accounts CRM is fail-closed for providers and sending', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /provider_monthly_budget_usd NUMERIC\(12,2\) NOT NULL DEFAULT 0 CHECK \(provider_monthly_budget_usd = 0\)/);
  assert.match(migration, /allow_paid_overage BOOLEAN NOT NULL DEFAULT FALSE CHECK \(allow_paid_overage = FALSE\)/);
  assert.match(migration, /auto_purchase_credits BOOLEAN NOT NULL DEFAULT FALSE CHECK \(auto_purchase_credits = FALSE\)/);
  assert.match(migration, /autosend_enabled BOOLEAN NOT NULL DEFAULT FALSE CHECK \(autosend_enabled = FALSE\)/);
  assert.match(migration, /send_enabled = FALSE/);
  assert.match(migration, /kill_switch = TRUE/);
  assert.match(migration, /WHERE provider = 'snov' AND mode <> 'disabled'/);
  assert.match(migration, /paid_overage_allowed = FALSE/);
  assert.match(migration, /auto_purchase_enabled = FALSE/);
});

test('qualified conversion is server-side, audited and idempotent', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.crm_intl_mark_qualified/);
  assert.match(migration, /campaign_contact_not_approved/);
  assert.match(migration, /only_aaa_aa_can_convert/);
  assert.match(migration, /compliance_not_approved/);
  assert.match(migration, /ON CONFLICT \(idempotency_key\) DO UPDATE/);
  assert.match(migration, /intl_lead_qualified/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.crm_intl_mark_qualified\(UUID, TEXT\) TO authenticated, service_role/);
});
