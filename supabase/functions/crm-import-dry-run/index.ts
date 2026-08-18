import { createClient } from 'npm:@supabase/supabase-js@2.83.0';
import {
  classifyAccountDuplicate,
  classifyContactDuplicate,
  determineImportStatus,
  normalizeText,
  validateAccountRow,
  validateContactRow,
  validateSuppressionRow
} from '../_shared/crm-import-rules.js';

const ALLOWED_ORIGINS = new Set(['https://geobooker.com.mx', 'https://www.geobooker.com.mx']);
const DATASET_TYPES = new Set(['accounts', 'contacts', 'suppressions', 'needs_review']);

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://geobooker.com.mx',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };
}

function response(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function sourceRecordId(datasetType: string, row: Record<string, unknown>) {
  if (datasetType === 'accounts') return row.account_id;
  if (datasetType === 'suppressions') return row.bounce_id;
  return row.contact_id;
}

function validateRow(datasetType: string, row: Record<string, unknown>) {
  if (datasetType === 'accounts') return validateAccountRow(row);
  if (datasetType === 'suppressions') return validateSuppressionRow(row);
  return validateContactRow(row);
}

function duplicateKey(datasetType: string, normalized: Record<string, unknown>) {
  if (datasetType === 'accounts') {
    return normalized.normalized_domain || (
      normalized.normalized_name && normalized.country_code
        ? `${normalized.normalized_name}|${normalized.country_code}`
        : null
    );
  }
  if (datasetType === 'suppressions') return normalized.normalized_identifier;
  return normalized.normalized_email || normalized.normalized_phone || null;
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return response(403, { error: 'origin_not_allowed' }, origin);
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== 'POST') return response(405, { error: 'method_not_allowed' }, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return response(403, { error: 'origin_not_allowed' }, origin);
  if (Deno.env.get('CRM2_IMPORT_DRY_RUN_ENABLED') !== 'true') {
    return response(503, { error: 'crm_import_disabled' }, origin);
  }

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return response(401, { error: 'authentication_required' }, origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return response(503, { error: 'server_not_configured' }, origin);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return response(401, { error: 'invalid_session' }, origin);
  const { data: adminUser } = await admin.from('admin_users').select('id').eq('id', authData.user.id).maybeSingle();
  if (!adminUser) return response(403, { error: 'admin_required' }, origin);

  let payload: Record<string, any>;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 1_000_000) return response(413, { error: 'payload_too_large' }, origin);
    payload = JSON.parse(rawBody);
  } catch {
    return response(400, { error: 'invalid_json' }, origin);
  }

  const datasetType = String(payload.datasetType || '');
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!DATASET_TYPES.has(datasetType) || rows.length < 1 || rows.length > 500) {
    return response(400, { error: 'invalid_batch' }, origin);
  }
  if (!/^[a-f0-9]{64}$/.test(String(payload.sourceFileSha256 || ''))) {
    return response(400, { error: 'invalid_source_checksum' }, origin);
  }

  const seen = new Map<string, Record<string, unknown>>();
  const prepared = [];
  for (let index = 0; index < rows.length; index += 1) {
    const raw = rows[index];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return response(400, { error: 'invalid_row', row: index + 1 }, origin);
    }
    const validation = validateRow(datasetType, raw);
    const key = duplicateKey(datasetType, validation.normalized);
    let duplicate = { classification: 'none', rule: null };
    if (key && seen.has(String(key))) {
      if (datasetType === 'accounts') duplicate = classifyAccountDuplicate(validation.normalized, seen.get(String(key))!);
      else if (datasetType === 'suppressions') duplicate = { classification: 'exact', rule: 'suppression_identifier_exact' };
      else duplicate = classifyContactDuplicate(validation.normalized, seen.get(String(key))!);
    }
    if (key && !seen.has(String(key))) seen.set(String(key), validation.normalized);
    const forcedReview = (
      datasetType === 'needs_review'
      || normalizeText(raw.crm_import_status).replace(/[\s-]+/g, '_') === 'needs_review'
    ) && validation.errors.length === 0;
    const sourceSuppressed = ['bounced', 'suppressed', 'blocked', 'hard_bounce'].includes(
      normalizeText(raw.suppression_status).replace(/[\s-]+/g, '_')
    ) || String(raw.primary_email_bounced || '').toLowerCase() === 'true';
    const status = forcedReview
      ? 'needs_review'
      : determineImportStatus({
        validation,
        duplicate,
        suppressed: sourceSuppressed || validation.normalized.consent_status === 'suppressed'
      });
    prepared.push({
      source_row_number: Number(raw.source_row) > 0 ? Number(raw.source_row) : index + 1,
      source_partition: String(raw.source_sheet || ''),
      source_record_id: String(sourceRecordId(datasetType, raw) || ''),
      row_sha256: await sha256Hex(JSON.stringify(raw)),
      raw,
      normalized: validation.normalized,
      errors: validation.errors,
      warnings: [...validation.warnings, ...(duplicate.rule ? [duplicate.rule] : [])],
      status
    });
  }

  const { data: batchId, error } = await admin.schema('crm').rpc('stage_dry_run_batch', {
    p_source_key: String(payload.sourceKey || '').trim(),
    p_source_display_name: String(payload.sourceDisplayName || payload.sourceKey || '').trim(),
    p_batch_name: String(payload.batchName || '').trim(),
    p_source_file_name: String(payload.sourceFileName || '').trim(),
    p_source_file_sha256: String(payload.sourceFileSha256),
    p_dataset_type: datasetType,
    p_rows: prepared,
    p_created_by: authData.user.id
  });
  if (error) return response(422, { error: 'staging_failed' }, origin);

  const counts = prepared.reduce((result, row) => {
    result[row.status] = (result[row.status] || 0) + 1;
    return result;
  }, {} as Record<string, number>);
  return response(200, { batchId, mode: 'dry_run', counts }, origin);
});
