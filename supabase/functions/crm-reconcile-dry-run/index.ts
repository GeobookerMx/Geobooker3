import { createClient } from 'npm:@supabase/supabase-js@2.83.0';
import {
  buildIngestionEvent,
  getIngestionSourceDefinition,
  listIngestionSources,
  normalizeLegacySourceRecord,
  sourceFilter
} from '../_shared/crm-ingestion-adapters.js';

const ALLOWED_ORIGINS = new Set(['https://geobooker.com.mx', 'https://www.geobooker.com.mx']);
const INTERNAL_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const MAX_BATCH_SIZE = 500;

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://geobooker.com.mx',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };
}

function jsonResponse(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return jsonResponse(403, { error: 'origin_not_allowed' }, origin);
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' }, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return jsonResponse(403, { error: 'origin_not_allowed' }, origin);
  if (Deno.env.get('CRM360_RECONCILIATION_ENABLED') !== 'true') {
    return jsonResponse(503, { error: 'crm360_reconciliation_disabled' }, origin);
  }

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return jsonResponse(401, { error: 'authentication_required' }, origin);

  let payload: Record<string, unknown>;
  let adminClient: ReturnType<typeof createClient> | null = null;
  let ingestionRunId: string | null = null;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 20_000) return jsonResponse(413, { error: 'payload_too_large' }, origin);
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: 'invalid_json' }, origin);
  }

  const source = String(payload.source || '');
  const definition = getIngestionSourceDefinition(source);
  const limit = Number(payload.limit ?? 100);
  const offset = Number(payload.offset ?? 0);
  if (!definition) return jsonResponse(400, { error: 'invalid_source', allowed: listIngestionSources() }, origin);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BATCH_SIZE || !Number.isInteger(offset) || offset < 0) {
    return jsonResponse(400, { error: 'invalid_pagination' }, origin);
  }

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    adminClient = admin;
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return jsonResponse(401, { error: 'invalid_session' }, origin);

    const { data: adminUser, error: adminError } = await admin
      .from('admin_users')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (adminError || !adminUser) return jsonResponse(403, { error: 'admin_required' }, origin);

    const crm = admin.schema('crm');
    const { data: run, error: runError } = await crm
      .from('ingestion_runs')
      .insert({
        workspace_id: INTERNAL_WORKSPACE_ID,
        source_system: definition.sourceSystem,
        adapter_version: '1.0.0',
        run_mode: 'dry_run',
        run_status: 'running',
        source_cursor: `${offset}`,
        started_at: new Date().toISOString(),
        created_by_user_id: authData.user.id,
        safe_metadata: { source, relation: definition.relation, limit, offset, promotes_entities: false }
      })
      .select('id')
      .single();
    if (runError || !run) throw new Error('ingestion_run_create_failed');
    ingestionRunId = run.id;

    let query = admin
      .from(definition.relation)
      .select('*')
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);
    query = sourceFilter(source, query);
    const { data: records, error: sourceError } = await query;
    if (sourceError) throw new Error(`source_read_failed_${source}`);

    const events = [];
    let rejectedCount = 0;
    for (const record of records || []) {
      const prepared = normalizeLegacySourceRecord(source, record);
      if (!prepared) {
        rejectedCount += 1;
        continue;
      }
      const payloadSha256 = await sha256Hex(JSON.stringify(prepared.normalized));
      const idempotencyKey = await sha256Hex(
        `${definition.sourceSystem}:${prepared.sourceRecordId}:${payloadSha256}`
      );
      const event = buildIngestionEvent({
        workspaceId: INTERNAL_WORKSPACE_ID,
        ingestionRunId: run.id,
        source,
        record,
        payloadSha256,
        idempotencyKey
      });
      if (event) events.push(event);
    }

    let insertedCount = 0;
    if (events.length > 0) {
      const { data: inserted, error: eventError } = await crm
        .from('source_events')
        .upsert(events, {
          onConflict: 'workspace_id,source_system,idempotency_key',
          ignoreDuplicates: true
        })
        .select('id');
      if (eventError) throw new Error('source_event_stage_failed');
      insertedCount = inserted?.length || 0;
    }

    const discoveredCount = records?.length || 0;
    const duplicateCount = events.length - insertedCount;
    const nextOffset = offset + discoveredCount;
    const { error: updateError } = await crm
      .from('ingestion_runs')
      .update({
        run_status: 'review_ready',
        source_cursor: `${nextOffset}`,
        discovered_count: discoveredCount,
        accepted_count: 0,
        duplicate_count: duplicateCount,
        review_count: insertedCount,
        rejected_count: rejectedCount,
        completed_at: new Date().toISOString(),
        safe_metadata: {
          source,
          relation: definition.relation,
          limit,
          offset,
          next_offset: nextOffset,
          has_more: discoveredCount === limit,
          promotes_entities: false
        }
      })
      .eq('id', run.id);
    if (updateError) throw new Error('ingestion_run_finalize_failed');

    return jsonResponse(200, {
      mode: 'dry_run',
      source,
      runId: run.id,
      discovered: discoveredCount,
      stagedForReview: insertedCount,
      duplicates: duplicateCount,
      rejected: rejectedCount,
      nextOffset,
      hasMore: discoveredCount === limit,
      entitiesPromoted: 0,
      messagesQueued: 0,
      messagesSent: 0
    }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    if (adminClient && ingestionRunId) {
      await adminClient
        .schema('crm')
        .from('ingestion_runs')
        .update({
          run_status: 'failed',
          error_count: 1,
          completed_at: new Date().toISOString()
        })
        .eq('id', ingestionRunId);
    }
    console.error('CRM 360 dry-run failed', {
      stage: 'reconcile',
      error_name: error instanceof Error ? error.name : 'Error',
      error_message: message
    });
    return jsonResponse(500, { error: message }, origin);
  }
});
