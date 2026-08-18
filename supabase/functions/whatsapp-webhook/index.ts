import { createClient } from 'npm:@supabase/supabase-js@2.83.0';
import {
  sha256Hex,
  shouldAdvanceMessageStatus,
  verifyMetaSignature
} from '../_shared/whatsapp-security.js';
import {
  classifyWebhookPayload,
  isAllowedWebhookScope
} from '../_shared/whatsapp-events.js';

const jsonHeaders = { 'Content-Type': 'application/json' };

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function envSet(name: string) {
  return new Set(
    (Deno.env.get(name) || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
}

async function processStatusEvent(admin: ReturnType<typeof createClient>, event: Record<string, any>) {
  const { data: message, error: messageError } = await admin
    .schema('crm')
    .from('messages')
    .select('id,current_status')
    .eq('provider_message_id', event.providerMessageId)
    .maybeSingle();

  if (messageError) throw messageError;
  if (!message) return false;

  const { error: statusError } = await admin
    .schema('crm')
    .from('message_status_events')
    .upsert({
      message_id: message.id,
      status: event.status,
      provider_timestamp: event.providerTimestamp,
      provider_event_fingerprint: event.fingerprint,
      error_code: event.errorCode,
      error_detail: event.errorDetail
    }, { onConflict: 'provider_event_fingerprint', ignoreDuplicates: true });

  if (statusError) throw statusError;

  if (shouldAdvanceMessageStatus(message.current_status, event.status)) {
    const { error: updateError } = await admin
      .schema('crm')
      .from('messages')
      .update({
        current_status: event.status,
        failure_code: event.errorCode,
        failure_detail: event.errorDetail
      })
      .eq('id', message.id);
    if (updateError) throw updateError;
  }

  if (event.status === 'delivered') {
    await admin.schema('crm').from('usage_ledger').upsert({
      message_id: message.id,
      charge_status: 'estimated',
      delivered_at: event.providerTimestamp
    }, { onConflict: 'message_id' });
  }

  return true;
}

async function processInboundEvent(admin: ReturnType<typeof createClient>, event: Record<string, any>) {
  const { data: phoneNumber, error: phoneError } = await admin
    .schema('crm')
    .from('whatsapp_phone_numbers')
    .select('id')
    .eq('provider_phone_number_id', event.phoneNumberId)
    .maybeSingle();
  if (phoneError) throw phoneError;
  if (!phoneNumber) return false;

  const { data: existingMessage, error: existingError } = await admin
    .schema('crm')
    .from('messages')
    .select('id')
    .eq('provider_message_id', event.providerMessageId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingMessage) return true;

  const { data: points, error: pointsError } = await admin
    .schema('crm')
    .from('contact_points')
    .select('id,contact_id')
    .in('point_type', ['phone', 'whatsapp'])
    .eq('normalized_value', event.normalizedFrom)
    .limit(2);
  if (pointsError) throw pointsError;

  let contactId: string;
  let contactPointId: string;

  if ((points || []).length > 1) return false;

  if (points?.length === 1) {
    contactId = points[0].contact_id;
    contactPointId = points[0].id;
  } else {
    const { data: contact, error: contactError } = await admin
      .schema('crm')
      .from('contacts')
      .upsert({
        external_source_id: 'meta_whatsapp_inbound',
        external_contact_id: event.providerWaId,
        contact_status: 'needs_review',
        source_metadata: { source: 'whatsapp_inbound' }
      }, { onConflict: 'external_source_id,external_contact_id' })
      .select('id')
      .single();
    if (contactError) throw contactError;
    contactId = contact.id;

    const { data: point, error: pointError } = await admin
      .schema('crm')
      .from('contact_points')
      .insert({
        contact_id: contactId,
        point_type: 'whatsapp',
        raw_value: event.providerWaId,
        normalized_value: event.normalizedFrom,
        normalization_method: 'meta_wa_id',
        normalization_confidence: 'high',
        validation_status: 'valid',
        is_primary: true
      })
      .select('id')
      .single();
    if (pointError) throw pointError;
    contactPointId = point.id;
  }

  const now = new Date(event.providerTimestamp);
  const serviceWindowExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data: conversation, error: conversationError } = await admin
    .schema('crm')
    .from('conversations')
    .upsert({
      whatsapp_phone_number_id: phoneNumber.id,
      contact_id: contactId,
      contact_point_id: contactPointId,
      provider_wa_id: event.providerWaId,
      status: 'open',
      service_window_expires_at: serviceWindowExpiresAt,
      last_inbound_at: event.providerTimestamp,
      last_message_at: event.providerTimestamp
    }, { onConflict: 'whatsapp_phone_number_id,contact_point_id' })
    .select('id')
    .single();
  if (conversationError) throw conversationError;

  const { data: replyTo } = event.contextProviderMessageId
    ? await admin.schema('crm').from('messages').select('id').eq('provider_message_id', event.contextProviderMessageId).maybeSingle()
    : { data: null };

  const { data: insertedMessage, error: insertError } = await admin
    .schema('crm')
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      direction: 'inbound',
      message_type: event.messageType,
      provider_message_id: event.providerMessageId,
      reply_to_message_id: replyTo?.id || null,
      body_text: event.text,
      content: event.content,
      current_status: 'received',
      provider_timestamp: event.providerTimestamp
    })
    .select('id')
    .single();
  if (insertError) throw insertError;

  await admin.schema('crm').from('channel_permissions').upsert({
    contact_id: contactId,
    channel: 'whatsapp',
    purpose: 'service',
    status: 'allowed',
    consent_source: 'customer_inbound_message',
    consented_at: event.providerTimestamp
  }, { onConflict: 'contact_id,channel,purpose' });

  await admin.schema('crm').from('activities').insert({
    contact_id: contactId,
    conversation_id: conversation.id,
    message_id: insertedMessage.id,
    activity_type: 'whatsapp_inbound',
    summary: 'Inbound WhatsApp message received',
    occurred_at: event.providerTimestamp
  });

  return true;
}

async function processPersistedEvents(
  admin: ReturnType<typeof createClient>,
  inboxEventId: string,
  events: Array<Record<string, any>>
) {
  try {
    await admin.schema('crm').from('webhook_events').update({
      processing_status: 'processing',
      attempt_count: 1,
      last_error: null
    }).eq('id', inboxEventId);

    let fullyProcessed = true;
    for (const event of events) {
      const processed = event.kind === 'status'
        ? await processStatusEvent(admin, event)
        : await processInboundEvent(admin, event);
      fullyProcessed = fullyProcessed && processed;
    }

    await admin.schema('crm').from('webhook_events').update({
      processing_status: fullyProcessed ? 'processed' : 'received',
      processed_at: fullyProcessed ? new Date().toISOString() : null,
      next_attempt_at: fullyProcessed ? null : new Date(Date.now() + 60_000).toISOString(),
      last_error: fullyProcessed ? null : 'Waiting for related CRM/provider record'
    }).eq('id', inboxEventId);
  } catch {
    await admin.schema('crm').from('webhook_events').update({
      processing_status: 'failed',
      next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
      last_error: 'Webhook event processing failed'
    }).eq('id', inboxEventId);
    console.error('WhatsApp background event processing failed without payload details');
  }
}

Deno.serve(async (request: Request) => {
  try {
    const verifyToken = requiredEnv('WHATSAPP_VERIFY_TOKEN');

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const valid = url.searchParams.get('hub.mode') === 'subscribe'
        && url.searchParams.get('hub.verify_token') === verifyToken;
      const challenge = url.searchParams.get('hub.challenge');
      return valid && challenge
        ? new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
        : response(403, { error: 'verification_failed' });
    }

    if (request.method !== 'POST') return response(405, { error: 'method_not_allowed' });

    const rawBody = await request.text();
    if (rawBody.length > 1_000_000) return response(413, { error: 'payload_too_large' });

    const appSecret = requiredEnv('META_APP_SECRET');
    const validSignature = await verifyMetaSignature(
      rawBody,
      request.headers.get('x-hub-signature-256'),
      appSecret
    );
    if (!validSignature) return response(401, { error: 'invalid_signature' });

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return response(400, { error: 'invalid_json' });
    }

    const allowedWabas = envSet('WHATSAPP_BUSINESS_ACCOUNT_ID');
    const allowedPhones = envSet('WHATSAPP_PHONE_NUMBER_ID');
    if (payload.object !== 'whatsapp_business_account'
      || !isAllowedWebhookScope(payload, allowedWabas, allowedPhones)) {
      return response(403, { error: 'invalid_webhook_scope' });
    }

    const admin = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const payloadHash = await sha256Hex(rawBody);
    const events = classifyWebhookPayload(payload);
    let { data: inboxEvent, error: inboxError } = await admin
      .schema('crm')
      .from('webhook_events')
      .insert({
        payload_hash: payloadHash,
        signature_verified: true,
        event_type: events.map((event) => event.kind).join(',') || 'unknown',
        provider_message_id: events[0]?.providerMessageId || null,
        payload
      })
      .select('id')
      .single();

    if (inboxError?.code === '23505') {
      const { data: existingEvent, error: existingError } = await admin
        .schema('crm')
        .from('webhook_events')
        .select('id,processing_status')
        .eq('payload_hash', payloadHash)
        .single();
      if (existingError) throw existingError;
      if (existingEvent.processing_status === 'processed') {
        return response(200, { received: true, duplicate: true });
      }
      inboxEvent = existingEvent;
      inboxError = null;
    }
    if (inboxError) throw inboxError;

    EdgeRuntime.waitUntil(processPersistedEvents(admin, inboxEvent.id, events));
    return response(200, { received: true });
  } catch (error) {
    console.error('WhatsApp webhook processing failed without payload details');
    return response(500, { error: 'webhook_processing_failed' });
  }
});
