import { createClient } from 'npm:@supabase/supabase-js@2.83.0';
import {
  buildStatusFingerprint,
  computeRetry,
  evaluateOutboundPolicy,
  isCustomerServiceWindowOpen
} from '../_shared/whatsapp-security.js';

const ALLOWED_ORIGINS = new Set([
  'https://www.geobooker.com.mx',
  'https://geobooker.com.mx',
  'http://localhost:5173'
]);

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

function allowedOrigins() {
  const configured = (Deno.env.get('WHATSAPP_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...ALLOWED_ORIGINS, ...configured]);
}

function cors(origin: string | null) {
  if (!origin || !allowedOrigins().has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(status: number, body: Record<string, unknown>, headers: Record<string, string> | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(headers || {}) }
  });
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function safeFailureDetail(value: unknown) {
  return String(value || '')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/((?:access[_-]?token|api[_-]?key|authorization|secret)\s*[=:]\s*)[^\s,;}]+/gi, '$1[redacted]')
    .slice(0, 500);
}

function cleanTemplateParameters(value: unknown) {
  if (!Array.isArray(value) || value.length > 20) return [];
  return value
    .map((parameter) => String(parameter).trim())
    .filter(Boolean)
    .map((parameter) => parameter.slice(0, 1024));
}

async function authorizeWorker(
  admin: ReturnType<typeof createClient>,
  bearer: string,
  serviceKey: string
) {
  if (bearer === serviceKey) return { actorUserId: null, actorType: 'service_role' };

  const { data: authData, error: authError } = await admin.auth.getUser(bearer);
  if (authError || !authData.user) return null;
  const { data: adminUser } = await admin
    .from('admin_users')
    .select('id,role')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (!adminUser) return null;
  return { actorUserId: authData.user.id, actorType: 'admin' };
}

async function failJob(
  crm: ReturnType<typeof createClient>,
  job: Record<string, any>,
  messageId: string | null,
  status: string,
  code: string,
  detail: string,
  nextAttemptAt: string | null = null
) {
  const safeDetail = safeFailureDetail(detail);
  const updates = [
    crm.from('outbound_jobs').update({
      status,
      locked_at: null,
      next_attempt_at: nextAttemptAt,
      last_error_code: code,
      last_error_detail: safeDetail
    }).eq('id', job.id)
  ];
  if (messageId) {
    updates.push(crm.from('messages').update({
      current_status: status === 'retry' ? 'queued' : 'failed',
      failure_code: code,
      failure_detail: safeDetail
    }).eq('id', messageId));
  }
  await Promise.all(updates);
}

async function processJob(
  admin: ReturnType<typeof createClient>,
  job: Record<string, any>
) {
  const crm = admin.schema('crm');
  const { data: message, error: messageError } = await crm
    .from('messages')
    .select('id,conversation_id,message_type,body_text,template_id,current_status')
    .eq('id', job.message_id)
    .single();
  if (messageError || !message) {
    await failJob(crm, job, null, 'failed', 'message_not_found', 'Queued message not found');
    return { jobId: job.id, status: 'failed', reason: 'message_not_found' };
  }

  const { data: conversation, error: conversationError } = await crm
    .from('conversations')
    .select('id,contact_id,contact_point_id,service_window_expires_at,status,whatsapp_phone_number_id')
    .eq('id', job.conversation_id)
    .single();
  if (conversationError || !conversation || conversation.status === 'blocked') {
    await failJob(crm, job, message.id, 'failed', 'conversation_not_available', 'Conversation is not available');
    return { jobId: job.id, status: 'failed', reason: 'conversation_not_available' };
  }

  const [{ data: point }, { data: phoneNumber }, { data: budgetPolicy }] = await Promise.all([
    crm.from('contact_points').select('normalized_value,validation_status').eq('id', conversation.contact_point_id).single(),
    crm.from('whatsapp_phone_numbers').select('provider_phone_number_id,status').eq('id', conversation.whatsapp_phone_number_id).single(),
    crm.from('budget_policies').select('*').eq('provider', 'meta_cloud').eq('is_active', true).limit(1).maybeSingle()
  ]);
  if (!point || point.validation_status !== 'valid' || !phoneNumber || phoneNumber.status !== 'active') {
    await failJob(crm, job, message.id, 'failed', 'conversation_channel_not_ready', 'Conversation channel is not ready');
    return { jobId: job.id, status: 'failed', reason: 'conversation_channel_not_ready' };
  }

  const { data: suppressions, error: suppressionError } = await crm
    .from('suppressions')
    .select('id')
    .eq('identifier_type', 'whatsapp')
    .eq('normalized_identifier', point.normalized_value)
    .eq('status', 'active')
    .or('channel.eq.whatsapp,channel.is.null')
    .limit(1);
  if (suppressionError) throw suppressionError;

  let template = null;
  if (message.message_type === 'template') {
    const { data, error } = await crm
      .from('whatsapp_templates')
      .select('id,template_name,language_code,category,approval_status')
      .eq('id', message.template_id)
      .single();
    if (error || !data) {
      await failJob(crm, job, message.id, 'failed', 'template_not_available', 'Template not available');
      return { jobId: job.id, status: 'failed', reason: 'template_not_available' };
    }
    template = data;
  }

  const serviceWindowOpen = isCustomerServiceWindowOpen(conversation.service_window_expires_at);
  const purpose = serviceWindowOpen && message.message_type === 'text'
    ? 'service'
    : template?.category === 'marketing' ? 'marketing' : 'transactional';
  const { data: permission } = await crm
    .from('channel_permissions')
    .select('status')
    .eq('contact_id', conversation.contact_id)
    .eq('channel', 'whatsapp')
    .eq('purpose', purpose)
    .maybeSingle();
  const policy = evaluateOutboundPolicy({
    budgetPolicy,
    permissionStatus: permission?.status || 'unknown',
    suppressed: (suppressions || []).length > 0,
    serviceWindowOpen,
    template,
    messageType: message.message_type
  });
  if (!policy.allowed) {
    await failJob(crm, job, message.id, 'failed', policy.reason, 'Outbound policy rejected the message');
    return { jobId: job.id, status: 'failed', reason: policy.reason };
  }

  const accessToken = requiredEnv('WHATSAPP_ACCESS_TOKEN');
  const graphVersion = requiredEnv('META_GRAPH_API_VERSION');
  const templateParameters = cleanTemplateParameters(job.request_payload?.templateParameters);
  const recipient = point.normalized_value.replace(/^\+/, '');
  const providerPayload = message.message_type === 'text'
    ? { messaging_product: 'whatsapp', to: recipient, type: 'text', text: { body: message.body_text } }
    : {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: template.template_name,
          language: { code: template.language_code },
          ...(templateParameters.length ? {
            components: [{
              type: 'body',
              parameters: templateParameters.map((value) => ({ type: 'text', text: value }))
            }]
          } : {})
        }
      };

  let providerResponse: Response;
  try {
    providerResponse = await fetch(
      `https://graph.facebook.com/${graphVersion}/${phoneNumber.provider_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(providerPayload),
        signal: AbortSignal.timeout(12_000)
      }
    );
  } catch {
    await failJob(crm, job, message.id, 'unknown', 'ambiguous_timeout', 'Provider request timed out ambiguously');
    return { jobId: job.id, status: 'unknown', reason: 'ambiguous_timeout' };
  }

  const providerBody = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok) {
    const retry = computeRetry({ attemptCount: job.attempt_count, statusCode: providerResponse.status });
    await failJob(
      crm,
      job,
      message.id,
      retry.state,
      String(providerResponse.status),
      providerBody?.error?.message || 'Provider rejected request',
      retry.delaySeconds ? new Date(Date.now() + retry.delaySeconds * 1000).toISOString() : null
    );
    return { jobId: job.id, status: retry.state, retry: retry.retry };
  }

  const providerMessageId = providerBody?.messages?.[0]?.id;
  if (!providerMessageId) {
    await failJob(crm, job, message.id, 'failed', 'missing_provider_message_id', 'Provider response missing message id');
    return { jobId: job.id, status: 'failed', reason: 'missing_provider_message_id' };
  }

  const now = new Date().toISOString();
  await Promise.all([
    crm.from('messages').update({
      provider_message_id: providerMessageId,
      provider_phone_number_id: phoneNumber.provider_phone_number_id,
      current_status: 'accepted'
    }).eq('id', message.id),
    crm.from('outbound_jobs').update({
      status: 'accepted',
      locked_at: null,
      next_attempt_at: null,
      last_error_code: null,
      last_error_detail: null
    }).eq('id', job.id),
    crm.from('message_status_events').insert({
      message_id: message.id,
      status: 'accepted',
      provider_timestamp: now,
      provider_event_fingerprint: buildStatusFingerprint(providerMessageId, 'accepted', now),
      provider_phone_number_id: phoneNumber.provider_phone_number_id
    }),
    crm.from('conversations').update({
      last_outbound_at: now,
      last_message_at: now
    }).eq('id', conversation.id)
  ]);

  return { jobId: job.id, status: 'accepted', messageId: message.id };
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  const corsHeaders = cors(origin);
  if (origin && !corsHeaders) return json(403, { error: 'origin_not_allowed' }, null);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders || {} });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, corsHeaders);

  try {
    const authorization = request.headers.get('authorization') || '';
    const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearer) return json(401, { error: 'authentication_required' }, corsHeaders);

    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const authorizationResult = await authorizeWorker(admin, bearer, serviceKey);
    if (!authorizationResult) return json(403, { error: 'worker_not_authorized' }, corsHeaders);

    if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'true') {
      return json(200, { processed: 0, sendingEnabled: false }, corsHeaders);
    }

    const rawBody = await request.text();
    if (rawBody.length > 20_000) return json(413, { error: 'payload_too_large' }, corsHeaders);
    const body = rawBody ? JSON.parse(rawBody) : {};
    const limit = clampInteger(body.limit, 10, 1, 25);

    const { data: jobs, error: claimError } = await admin
      .schema('crm')
      .rpc('claim_whatsapp_outbound_jobs', { p_limit: limit });
    if (claimError) throw claimError;

    const results = [];
    for (const job of jobs || []) {
      results.push(await processJob(admin, job));
    }

    return json(200, { processed: results.length, results }, corsHeaders);
  } catch (error) {
    console.error('WhatsApp worker failed', {
      name: error?.name || 'Error',
      message: safeFailureDetail(error?.message || error)
    });
    return json(500, { error: 'whatsapp_worker_failed' }, corsHeaders);
  }
});
