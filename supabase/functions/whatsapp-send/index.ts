import { createClient } from 'npm:@supabase/supabase-js@2.83.0';
import {
  computeRetry,
  evaluateOutboundPolicy,
  isCustomerServiceWindowOpen
} from '../_shared/whatsapp-security.js';

const defaultOrigins = new Set([
  'https://www.geobooker.com.mx',
  'https://geobooker.com.mx',
  'http://localhost:5173'
]);

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
}

function allowedOrigins() {
  const configured = (Deno.env.get('WHATSAPP_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...defaultOrigins, ...configured]);
}

function corsHeaders(origin: string | null) {
  if (!origin || !allowedOrigins().has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function response(status: number, body: Record<string, unknown>, cors: Record<string, string> | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(cors || {}) }
  });
}

function cleanTemplateParameters(value: unknown) {
  if (!Array.isArray(value) || value.length > 20) return [];
  return value.map((parameter) => String(parameter).trim()).filter(Boolean).map((parameter) => parameter.slice(0, 1024));
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin);
  if (origin && !cors) return response(403, { error: 'origin_not_allowed' }, null);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors || {} });
  if (request.method !== 'POST') return response(405, { error: 'method_not_allowed' }, cors);

  try {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return response(401, { error: 'authentication_required' }, cors);

    const admin = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return response(401, { error: 'invalid_session' }, cors);

    const { data: adminUser, error: adminError } = await admin
      .from('admin_users')
      .select('id,role')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (adminError || !adminUser) return response(403, { error: 'crm_role_required' }, cors);

    if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'true') {
      return response(503, { error: 'whatsapp_sending_disabled' }, cors);
    }

    const rawBody = await request.text();
    if (rawBody.length > 100_000) return response(413, { error: 'payload_too_large' }, cors);
    let body: Record<string, any>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return response(400, { error: 'invalid_json' }, cors);
    }
    const conversationId = String(body.conversationId || '');
    const idempotencyKey = String(body.idempotencyKey || '');
    const messageType = body.messageType === 'template' ? 'template' : 'text';
    if (!/^[0-9a-f-]{36}$/i.test(conversationId)) {
      return response(400, { error: 'invalid_conversation_id' }, cors);
    }
    if (!/^[A-Za-z0-9:_-]{16,128}$/.test(idempotencyKey)) {
      return response(400, { error: 'invalid_idempotency_key' }, cors);
    }

    const { data: existingJob } = await admin
      .schema('crm')
      .from('outbound_jobs')
      .select('id,message_id,status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existingJob) {
      return response(200, { accepted: true, duplicate: true, jobId: existingJob.id, status: existingJob.status }, cors);
    }

    const { data: conversation, error: conversationError } = await admin
      .schema('crm')
      .from('conversations')
      .select('id,contact_id,contact_point_id,service_window_expires_at,status,whatsapp_phone_number_id')
      .eq('id', conversationId)
      .single();
    if (conversationError || !conversation || conversation.status === 'blocked') {
      return response(404, { error: 'conversation_not_available' }, cors);
    }

    const [{ data: point }, { data: phoneNumber }, { data: budgetPolicy }] = await Promise.all([
      admin.schema('crm').from('contact_points').select('normalized_value,validation_status').eq('id', conversation.contact_point_id).single(),
      admin.schema('crm').from('whatsapp_phone_numbers').select('provider_phone_number_id,status').eq('id', conversation.whatsapp_phone_number_id).single(),
      admin.schema('crm').from('budget_policies').select('*').eq('provider', 'meta_cloud').eq('is_active', true).limit(1).maybeSingle()
    ]);
    if (!point || point.validation_status !== 'valid' || !phoneNumber || phoneNumber.status !== 'active') {
      return response(409, { error: 'conversation_channel_not_ready' }, cors);
    }

    const { data: suppressions, error: suppressionError } = await admin
      .schema('crm')
      .from('suppressions')
      .select('id')
      .eq('identifier_type', 'whatsapp')
      .eq('normalized_identifier', point.normalized_value)
      .eq('status', 'active')
      .or('channel.eq.whatsapp,channel.is.null')
      .limit(1);
    if (suppressionError) throw suppressionError;

    let template = null;
    if (messageType === 'template') {
      const templateId = String(body.templateId || '');
      const { data, error } = await admin
        .schema('crm')
        .from('whatsapp_templates')
        .select('id,template_name,language_code,category,approval_status')
        .eq('id', templateId)
        .single();
      if (error) return response(409, { error: 'template_not_available' }, cors);
      template = data;
    }

    const serviceWindowOpen = isCustomerServiceWindowOpen(conversation.service_window_expires_at);
    const purpose = serviceWindowOpen && messageType === 'text'
      ? 'service'
      : template?.category === 'marketing' ? 'marketing' : 'transactional';
    const { data: permission } = await admin
      .schema('crm')
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
      messageType
    });
    if (!policy.allowed) return response(409, { error: policy.reason }, cors);

    const text = String(body.text || '').trim();
    if (messageType === 'text' && (!text || text.length > 4096)) {
      return response(400, { error: 'invalid_text_message' }, cors);
    }
    const templateParameters = cleanTemplateParameters(body.templateParameters);
    const { data: message, error: messageError } = await admin
      .schema('crm')
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'outbound',
        message_type: messageType,
        client_idempotency_key: idempotencyKey,
        template_id: template?.id || null,
        body_text: messageType === 'text' ? text : null,
        content: messageType === 'template' ? { parameters: templateParameters } : {},
        current_status: 'pending',
        initiated_by_user_id: authData.user.id
      })
      .select('id')
      .single();
    if (messageError) throw messageError;

    const { data: job, error: jobError } = await admin
      .schema('crm')
      .from('outbound_jobs')
      .insert({
        conversation_id: conversation.id,
        message_id: message.id,
        idempotency_key: idempotencyKey,
        job_type: messageType === 'template' ? 'template' : 'service_reply',
        status: 'processing',
        attempt_count: 1,
        request_payload: { messageType, templateId: template?.id || null },
        created_by_user_id: authData.user.id
      })
      .select('id')
      .single();
    if (jobError) throw jobError;

    const graphVersion = requiredEnv('META_GRAPH_API_VERSION');
    const accessToken = requiredEnv('WHATSAPP_ACCESS_TOKEN');
    const providerPayload = messageType === 'text'
      ? { messaging_product: 'whatsapp', to: point.normalized_value.replace(/^\+/, ''), type: 'text', text: { body: text } }
      : {
          messaging_product: 'whatsapp',
          to: point.normalized_value.replace(/^\+/, ''),
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
      await Promise.all([
        admin.schema('crm').from('messages').update({ current_status: 'unknown' }).eq('id', message.id),
        admin.schema('crm').from('outbound_jobs').update({ status: 'unknown', last_error_code: 'ambiguous_timeout' }).eq('id', job.id)
      ]);
      return response(202, { accepted: false, status: 'unknown', jobId: job.id }, cors);
    }

    const providerBody = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) {
      const retry = computeRetry({ attemptCount: 1, statusCode: providerResponse.status });
      await Promise.all([
        admin.schema('crm').from('messages').update({ current_status: 'failed', failure_code: String(providerResponse.status) }).eq('id', message.id),
        admin.schema('crm').from('outbound_jobs').update({
          status: retry.state,
          next_attempt_at: retry.delaySeconds ? new Date(Date.now() + retry.delaySeconds * 1000).toISOString() : null,
          last_error_code: String(providerResponse.status),
          last_error_detail: 'Provider rejected request'
        }).eq('id', job.id)
      ]);
      return response(502, { accepted: false, error: 'provider_rejected_message', retry: retry.retry }, cors);
    }

    const providerMessageId = providerBody?.messages?.[0]?.id;
    if (!providerMessageId) throw new Error('Provider response missing message id');
    await Promise.all([
      admin.schema('crm').from('messages').update({ provider_message_id: providerMessageId, current_status: 'accepted' }).eq('id', message.id),
      admin.schema('crm').from('outbound_jobs').update({ status: 'accepted' }).eq('id', job.id),
      admin.schema('crm').from('message_status_events').insert({
        message_id: message.id,
        status: 'accepted',
        provider_timestamp: new Date().toISOString(),
        provider_event_fingerprint: `${providerMessageId}:accepted`
      })
    ]);

    return response(202, { accepted: true, jobId: job.id, messageId: message.id }, cors);
  } catch (error) {
    console.error('WhatsApp send failed without recipient details');
    return response(500, { error: 'whatsapp_send_failed' }, cors);
  }
});
