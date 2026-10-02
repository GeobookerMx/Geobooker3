/**
 * Safe CSV -> CRM importer for WhatsApp prospecting.
 *
 * Default mode imports research prospects only. It never invents phones and
 * never marks CSV/open-data rows as WhatsApp marketing opt-ins.
 *
 * Usage:
 *   node scripts/import-csv-to-crm-whatsapp.mjs --tier=AAA --limit=20 --dry-run
 *   node scripts/import-csv-to-crm-whatsapp.mjs --tier=AAA --limit=20
 *   node scripts/import-csv-to-crm-whatsapp.mjs --file=data/processed/all_cleaned.csv --country=MX
 *   node scripts/import-csv-to-crm-whatsapp.mjs --mode=consented --consent-ref=FORM_2026_09_24_A --limit=20
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import phoneLib from 'google-libphonenumber';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../.env.local') });
config({ path: path.resolve(__dirname, '../.env') });

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, ...rest] = arg.slice(2).split('=');
      return [key, rest.length ? rest.join('=') : 'true'];
    }),
);

const tier = (args.tier || 'AAA').toUpperCase();
const country = (args.country || 'MX').toUpperCase();
const limit = args.limit ? Number.parseInt(args.limit, 10) : 20;
const dryRun = args['dry-run'] === 'true';
const mode = (args.mode || 'prospect').toLowerCase();
const consentRef = args['consent-ref'] || '';
const csvFile = args.file
  ? path.resolve(process.cwd(), args.file)
  : path.resolve(__dirname, `../data/processed/tier_${tier}.csv`);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { PhoneNumberUtil, PhoneNumberFormat } = phoneLib;
const phoneUtil = PhoneNumberUtil.getInstance();

if (!['prospect', 'consented'].includes(mode)) {
  console.error('Invalid --mode. Use prospect or consented.');
  process.exit(1);
}

if (mode === 'consented' && !consentRef) {
  console.error('Consented mode requires --consent-ref with a real opt-in evidence reference.');
  process.exit(1);
}

if (!dryRun && (!supabaseUrl || !supabaseKey)) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL/SUPABASE_URL in .env.');
  process.exit(1);
}

const supabase = !dryRun ? createClient(supabaseUrl, supabaseKey) : null;

function splitCSVLine(line) {
  const result = [];
  let curr = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        curr += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(curr);
      curr = '';
    } else {
      curr += ch;
    }
  }

  result.push(curr);
  return result;
}

function parseCSV(raw) {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((header) => header.trim().replace(/^\uFEFF/, ''));
  return lines.slice(1).map((line) => {
    const vals = splitCSVLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, (vals[index] || '').trim()]));
  });
}

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim()) return value.trim();
  }
  return '';
}

function normalizePhone(rawPhone, isoCountry) {
  const raw = (rawPhone || '').trim();
  if (!raw) return '';

  try {
    const parsed = phoneUtil.parseAndKeepRawInput(raw, isoCountry);
    if (!phoneUtil.isValidNumber(parsed)) return '';
    return phoneUtil.format(parsed, PhoneNumberFormat.E164);
  } catch {
    return '';
  }
}

function scoreForTier(rowTier) {
  const normalized = (rowTier || tier).toUpperCase();
  if (normalized === 'AAA') return 92;
  if (normalized === 'AA') return 82;
  if (normalized === 'A') return 70;
  return 55;
}

function normalizeRow(row) {
  const rowTier = pick(row, ['tier', 'Tipo']) || tier;
  const phone = normalizePhone(
    pick(row, ['phone', 'Telefono', 'Telefono 2', 'Telefono 3', 'Teléfono', 'Teléfono 2', 'Teléfono 3']),
    country,
  );

  return {
    company: pick(row, ['company', 'Compania', 'Compañía', 'Empresa']),
    name: pick(row, ['name', 'Nombre', 'Contacto']),
    position: pick(row, ['position', 'Puesto', 'Cargo']) || 'Directivo',
    email: pick(row, ['email', 'Email corporativo', 'Email']).toLowerCase(),
    phone,
    tier: rowTier.toUpperCase(),
    industry: pick(row, ['company_type', 'Tipo de empresa', 'Industria', 'Giro', 'Tipo']),
    city: pick(row, ['city', 'Ciudad']),
    country,
    score: scoreForTier(rowTier),
  };
}

function isUsableLead(lead) {
  if (!lead.company) return false;
  if (!['AAA', 'AA', 'A', 'B'].includes(lead.tier)) return false;
  if (mode === 'consented' && !lead.phone) return false;
  return true;
}

async function importLead(lead) {
  const rpcName = mode === 'consented'
    ? 'import_lead_with_whatsapp_consent'
    : 'import_lead_prospect';

  const payload = mode === 'consented'
    ? {
        p_account_name: lead.company,
        p_contact_name: lead.name,
        p_job_title: lead.position,
        p_phone_e164: lead.phone,
        p_email: lead.email,
        p_industry: lead.industry,
        p_city: lead.city,
        p_source_tier: lead.tier,
        p_country_code: lead.country,
        p_score: lead.score,
        p_consent_ref: consentRef,
      }
    : {
        p_account_name: lead.company,
        p_contact_name: lead.name,
        p_job_title: lead.position,
        p_email: lead.email,
        p_phone_e164: lead.phone || null,
        p_industry: lead.industry,
        p_city: lead.city,
        p_source_tier: lead.tier,
        p_country_code: lead.country,
        p_score: lead.score,
        p_source_ref: `CSV_${lead.tier}_${lead.country}_${new Date().toISOString().slice(0, 10)}`,
      };

  return supabase.schema('crm').rpc(rpcName, payload);
}

async function run() {
  if (!Number.isFinite(limit) || limit <= 0) {
    console.error('Invalid --limit. Use a positive number.');
    process.exit(1);
  }

  if (!fs.existsSync(csvFile)) {
    console.error(`CSV not found: ${csvFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvFile, 'utf8');
  const rows = parseCSV(raw);
  const leads = rows.map(normalizeRow).filter(isUsableLead).slice(0, limit);

  console.log(`File: ${csvFile}`);
  console.log(`Mode: ${mode}${dryRun ? ' dry-run' : ''} | Country: ${country} | Tier: ${tier} | Limit: ${limit}`);
  console.log(`Rows read: ${rows.length} | Importable: ${leads.length}`);

  let imported = 0;
  let errors = 0;

  for (const [index, lead] of leads.entries()) {
    const status = mode === 'consented' ? 'eligible_after_verified_consent' : 'prospect_not_campaign_eligible';
    const summary = `${index + 1}/${leads.length} ${lead.company} | ${lead.name || 'no contact name'} | ${lead.phone || 'no phone'} | ${status}`;

    if (dryRun) {
      console.log(`[dry-run] ${summary}`);
      imported += 1;
      continue;
    }

    const { error } = await importLead(lead);
    if (error) {
      console.error(`[error] ${summary}: ${error.message}`);
      errors += 1;
    } else {
      console.log(`[ok] ${summary}`);
      imported += 1;
    }
  }

  const skipped = Math.max(rows.length - leads.length, 0);
  console.log(`Done. Imported: ${imported} | Skipped/filter-missing: ${skipped} | Errors: ${errors}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
