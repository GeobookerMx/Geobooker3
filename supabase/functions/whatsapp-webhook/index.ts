import { createClient } from 'npm:@supabase/supabase-js@2.83.0';
import {
  sha256Hex,
  shouldAdvanceMessageStatus,
  verifyMetaSignature
} from '../_shared/whatsapp-security.js';
import {
  classifyWebhookPayload,
  isAllowedWebhookScope,
  isMetaTestPayload
} from '../_shared/whatsapp-events.js';
import { verifyWebhookSubscription } from '../_shared/whatsapp-webhook-http.js';

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

function requiredSecret(name: string, minimumLength: number) {
  const value = requiredEnv(name);
  if (value.length < minimumLength) throw new Error(`Server secret is too short: ${name}`);
  return value;
}

function sanitizeDiagnostic(value: unknown, maximumLength = 4_000) {
  return String(value ?? '')
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\bsbp_(?:oauth_)?[a-f0-9]{20,}\b/gi, '[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted]')
    .replace(/((?:access[_-]?token|api[_-]?key|authorization|secret)\s*[=:]\s*)[^\s,;}]+/gi, '$1[redacted]')
    .slice(0, maximumLength);
}

function safeErrorDiagnostic(error: unknown) {
  const record = error && typeof error === 'object'
    ? error as Record<string, unknown>
    : {};
  return {
    error_name: sanitizeDiagnostic(
      error instanceof Error ? error.name : record.name || 'NonErrorThrown',
      200
    ),
    error_message: sanitizeDiagnostic(
      error instanceof Error ? error.message : record.message || error,
      2_000
    ),
    error_stack: sanitizeDiagnostic(
      error instanceof Error ? error.stack : record.stack || '',
      4_000
    ) || null,
    error_code: sanitizeDiagnostic(record.code || '', 200) || null
  };
}

async function ensureProviderPhoneNumber(admin: ReturnType<typeof createClient>, event: Record<string, any>) {
  if (!event.providerBusinessAccountId || !event.phoneNumberId) return null;

  const { data: existingPhone, error: existingPhoneError } = await admin
    .schema('crm')
    .from('whatsapp_phone_numbers')
    .select('id')
    .eq('provider_phone_number_id', event.phoneNumberId)
    .maybeSingle();
  if (existingPhoneError) throw existingPhoneError;
  if (existingPhone) return existingPhone;

  const { error: businessInsertError } = await admin
    .schema('crm')
    .from('whatsapp_business_accounts')
    .upsert({
      provider_business_account_id: event.providerBusinessAccountId,
      display_name: 'Meta WhatsApp test account',
      status: 'test'
    }, { onConflict: 'provider_business_account_id', ignoreDuplicates: true });
  if (businessInsertError) throw businessInsertError;

  const { data: businessAccount, error: businessError } = await admin
    .schema('crm')
    .from('whatsapp_business_accounts')
    .select('id')
    .eq('provider_business_account_id', event.providerBusinessAccountId)
    .single();
  if (businessError) throw businessError;

  const { error: phoneInsertError } = await admin
    .schema('crm')
    .from('whatsapp_phone_numbers')
    .upsert({
      business_account_id: businessAccount.id,
      provider_phone_number_id: event.phoneNumberId,
      display_phone_number: event.displayPhoneNumber,
      status: 'test'
    }, { onConflict: 'provider_phone_number_id', ignoreDuplicates: true });
  if (phoneInsertError) throw phoneInsertError;

  const { data: phoneNumber, error: phoneError } = await admin
    .schema('crm')
    .from('whatsapp_phone_numbers')
    .select('id')
    .eq('provider_phone_number_id', event.phoneNumberId)
    .single();
  if (phoneError) throw phoneError;
  return phoneNumber;
}

async function ensureConversation(admin: ReturnType<typeof createClient>, event: Record<string, any>) {
  const phoneNumber = await ensureProviderPhoneNumber(admin, event);
  if (!phoneNumber || !event.providerWaId || !event.normalizedFrom) return null;

  let contactId: string;
  let contactPointId: string;
  if (event.isTest) {
    const { data: contact, error: contactError } = await admin
      .schema('crm')
      .from('contacts')
      .upsert({
        external_source_id: 'meta_whatsapp_sample',
        external_contact_id: event.providerWaId,
        full_name: 'Meta webhook sample contact',
        normalized_name: 'meta webhook sample contact',
        contact_status: 'archived',
        source_metadata: { source: 'meta_developers_test_button', is_test: true }
      }, { onConflict: 'external_source_id,external_contact_id' })
      .select('id')
      .single();
    if (contactError) throw contactError;
    contactId = contact.id;

    const { data: point, error: pointError } = await admin
      .schema('crm')
      .from('contact_points')
      .upsert({
        contact_id: contactId,
        point_type: 'whatsapp',
        raw_value: event.providerWaId,
        normalized_value: event.normalizedFrom,
        normalization_method: 'meta_sample_wa_id',
        normalization_confidence: 'high',
        validation_status: 'valid',
        is_primary: true,
        source_metadata: { source: 'meta_developers_test_button', is_test: true }
      }, { onConflict: 'contact_id,account_id,point_type,normalized_value' })
      .select('id')
      .single();
    if (pointError) throw pointError;
    contactPointId = point.id;
  } else {
    const { data: points, error: pointsError } = await admin
      .schema('crm')
      .from('contact_points')
      .select('id,contact_id')
      .in('point_type', ['phone', 'whatsapp'])
      .eq('normalized_value', event.normalizedFrom)
      .limit(2);
    if (pointsError) throw pointsError;
    if ((points || []).length > 1) return null;

    if (points?.length === 1) {
      contactId = points[0].contact_id;
      contactPointId = points[0].id;
    } else {
      const { data: contact, error: contactError } = await admin
        .schema('crm')
        .from('contacts')
        .upsert({
          external_source_id: 'meta_whatsapp',
          external_contact_id: event.providerWaId,
          contact_status: 'needs_review',
          source_metadata: { source: 'whatsapp_webhook' }
        }, { onConflict: 'external_source_id,external_contact_id' })
        .select('id')
        .single();
      if (contactError) throw contactError;
      contactId = contact.id;

      const { data: point, error: pointError } = await admin
        .schema('crm')
        .from('contact_points')
        .upsert({
          contact_id: contactId,
          point_type: 'whatsapp',
          raw_value: event.providerWaId,
          normalized_value: event.normalizedFrom,
          normalization_method: 'meta_wa_id',
          normalization_confidence: 'high',
          validation_status: 'valid',
          is_primary: true
        }, { onConflict: 'contact_id,account_id,point_type,normalized_value' })
        .select('id')
        .single();
      if (pointError) throw pointError;
      contactPointId = point.id;
    }
  }

  const { data: conversation, error: conversationError } = await admin
    .schema('crm')
    .from('conversations')
    .upsert({
      whatsapp_phone_number_id: phoneNumber.id,
      contact_id: contactId,
      contact_point_id: contactPointId,
      provider_wa_id: event.providerWaId,
      is_test: Boolean(event.isTest),
      status: 'open',
      last_message_at: event.providerTimestamp
    }, { onConflict: 'whatsapp_phone_number_id,contact_point_id' })
    .select('id,contact_id,contact_point_id')
    .single();
  if (conversationError) throw conversationError;
  return conversation;
}

async function processStatusEvent(admin: ReturnType<typeof createClient>, event: Record<string, any>) {
  let { data: message, error: messageError } = await admin
    .schema('crm')
    .from('messages')
    .select('id,current_status')
    .eq('provider_message_id', event.providerMessageId)
    .maybeSingle();

  if (messageError) throw messageError;
  if (!message) {
    const conversation = await ensureConversation(admin, event);
    if (!conversation) return false;

    const { data: insertedMessage, error: insertError } = await admin
      .schema('crm')
      .from('messages')
      .upsert({
        conversation_id: conversation.id,
        direction: 'outbound',
        message_type: 'unknown',
        provider_message_id: event.providerMessageId,
        provider_wa_id: event.providerWaId,
        provider_phone_number_id: event.phoneNumberId,
        provider_metadata: { source: 'whatsapp_status_webhook' },
        current_status: event.status,
        provider_timestamp: event.providerTimestamp
      }, { onConflict: 'provider_message_id' })
      .select('id,current_status')
      .single();
    if (insertError) throw insertError;
    message = insertedMessage;
  }

  const { error: statusError } = await admin
    .schema('crm')
    .from('message_status_events')
    .upsert({
      message_id: message.id,
      status: event.status,
      provider_timestamp: event.providerTimestamp,
      provider_event_fingerprint: event.fingerprint,
      error_code: event.errorCode,
      error_detail: event.errorDetail,
      provider_wa_id: event.providerWaId,
      provider_phone_number_id: event.phoneNumberId,
      metadata: event.metadata || {}
    }, { onConflict: 'provider_event_fingerprint', ignoreDuplicates: true });

  if (statusError) throw statusError;

  if (shouldAdvanceMessageStatus(message.current_status, event.status)) {
    const { error: updateError } = await admin
      .schema('crm')
      .from('messages')
      .update({
        current_status: event.status,
        failure_code: event.errorCode,
        failure_detail: event.errorDetail,
        provider_wa_id: event.providerWaId,
        provider_phone_number_id: event.phoneNumberId
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
  const { data: existingMessage, error: existingError } = await admin
    .schema('crm')
    .from('messages')
    .select('id')
    .eq('provider_message_id', event.providerMessageId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingMessage) return true;

  const baseConversation = await ensureConversation(admin, event);
  if (!baseConversation) return false;
  const now = new Date(event.providerTimestamp);
  const serviceWindowExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data: conversation, error: conversationError } = await admin
    .schema('crm')
    .from('conversations')
    .update({
      status: 'open',
      service_window_expires_at: serviceWindowExpiresAt,
      last_inbound_at: event.providerTimestamp,
      last_message_at: event.providerTimestamp
    })
    .eq('id', baseConversation.id)
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
      provider_wa_id: event.providerWaId,
      provider_phone_number_id: event.phoneNumberId,
      reply_to_message_id: replyTo?.id || null,
      body_text: event.text,
      content: event.content,
      provider_metadata: {
        business_account_id: event.providerBusinessAccountId,
        display_phone_number: event.displayPhoneNumber,
        is_test: Boolean(event.isTest),
        sample_source: event.isTest ? 'meta_developers_test_button' : null
      },
      current_status: 'received',
      provider_timestamp: event.providerTimestamp
    })
    .select('id')
    .single();
  if (insertError?.code === '23505') return true;
  if (insertError) throw insertError;

  if (!event.isTest) {
    await admin.schema('crm').from('channel_permissions').upsert({
      contact_id: baseConversation.contact_id,
      channel: 'whatsapp',
      purpose: 'service',
      status: 'allowed',
      consent_source: 'customer_inbound_message',
      consented_at: event.providerTimestamp
    }, { onConflict: 'contact_id,channel,purpose' });
  }

  await admin.schema('crm').from('activities').insert({
    contact_id: baseConversation.contact_id,
    conversation_id: conversation.id,
    message_id: insertedMessage.id,
    activity_type: 'whatsapp_inbound',
    summary: event.isTest ? 'Meta webhook sample message received' : 'Inbound WhatsApp message received',
    metadata: {
      is_test: Boolean(event.isTest),
      sample_source: event.isTest ? 'meta_developers_test_button' : null
    },
    occurred_at: event.providerTimestamp
  });

  return true;
}

async function processPersistedEvents(
  admin: ReturnType<typeof createClient>,
  inboxEventId: string,
  events: Array<Record<string, any>>
) {
  let stage = 'mark_webhook_processing';
  try {
    await admin.schema('crm').from('webhook_events').update({
      processing_status: 'processing',
      attempt_count: 1,
      last_error: null
    }).eq('id', inboxEventId);

    stage = 'process_normalized_events';
    let fullyProcessed = true;
    for (const event of events) {
      const processed = event.kind === 'status'
        ? await processStatusEvent(admin, event)
        : await processInboundEvent(admin, event);
      fullyProcessed = fullyProcessed && processed;
    }

    stage = 'finalize_webhook_processing';
    await admin.schema('crm').from('webhook_events').update({
      processing_status: fullyProcessed ? 'processed' : 'received',
      processed_at: fullyProcessed ? new Date().toISOString() : null,
      next_attempt_at: fullyProcessed ? null : new Date(Date.now() + 60_000).toISOString(),
      last_error: fullyProcessed ? null : 'Waiting for related CRM/provider record'
    }).eq('id', inboxEventId);
  } catch (error) {
    try {
      await admin.schema('crm').from('webhook_events').update({
        processing_status: 'failed',
        next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
        last_error: `Webhook event processing failed at ${stage}`
      }).eq('id', inboxEventId);
    } catch (statusUpdateError) {
      console.error(JSON.stringify({
        event: 'whatsapp_webhook_background_status_update_failed',
        stage,
        ...safeErrorDiagnostic(statusUpdateError)
      }));
    }
    console.error(JSON.stringify({
      event: 'whatsapp_webhook_background_failed',
      stage,
      ...safeErrorDiagnostic(error)
    }));
  }
}

Deno.serve(async (request: Request) => {
  let stage = 'load_verify_token';
  try {
    const verifyToken = requiredSecret('WHATSAPP_VERIFY_TOKEN', 32);

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const mode = url.searchParams.get('hub.mode');
      const suppliedToken = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      const verification = verifyWebhookSubscription({
        mode,
        token: suppliedToken,
        challenge
      }, verifyToken);
      console.info(JSON.stringify({
        event: 'whatsapp_webhook_verification',
        mode,
        token_present: Boolean(suppliedToken),
        token_matches: verification.verified,
        challenge_present: Boolean(challenge),
        challenge,
        response_status: verification.status
      }));
      return verification.verified
        ? new Response(verification.challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }
          })
        : response(403, { error: 'verification_failed' });
    }

    if (request.method !== 'POST') return response(405, { error: 'method_not_allowed' });

    stage = 'read_request_body';
    const rawBody = await request.text();
    if (rawBody.length > 1_000_000) return response(413, { error: 'payload_too_large' });

    stage = 'load_meta_app_secret';
    const appSecret = requiredSecret('META_APP_SECRET', 24);
    stage = 'verify_meta_signature';
    const validSignature = await verifyMetaSignature(
      rawBody,
      request.headers.get('x-hub-signature-256'),
      appSecret
    );
    if (!validSignature) return response(401, { error: 'invalid_signature' });

    stage = 'parse_json_payload';
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return response(400, { error: 'invalid_json' });
    }

    stage = 'validate_webhook_scope';
    const allowedWabas = envSet('WHATSAPP_BUSINESS_ACCOUNT_ID');
    const allowedPhones = envSet('WHATSAPP_PHONE_NUMBER_ID');
    const allowMetaTestPayloads = Deno.env.get('WHATSAPP_ALLOW_META_TEST_PAYLOADS') === 'true';
    const allowedMetaTestPhones = envSet('WHATSAPP_META_TEST_PHONE_NUMBER_IDS');
    const metaTestPayload = allowMetaTestPayloads
      && isMetaTestPayload(payload, allowedMetaTestPhones);
    if (payload.object !== 'whatsapp_business_account'
      || (!metaTestPayload && !isAllowedWebhookScope(payload, allowedWabas, allowedPhones))) {
      return response(403, { error: 'invalid_webhook_scope' });
    }

    stage = 'initialize_supabase_client';
    const admin = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    stage = 'normalize_webhook_events';
    const payloadHash = await sha256Hex(rawBody);
    const events = classifyWebhookPayload(payload)
      .map((event) => ({ ...event, isTest: metaTestPayload }));
    stage = 'persist_webhook_event';
    let { data: inboxEvent, error: inboxError } = await admin
      .schema('crm')
      .from('webhook_events')
      .insert({
        payload_hash: payloadHash,
        signature_verified: true,
        event_type: `${metaTestPayload ? 'test:' : ''}${events.map((event) => event.kind).join(',') || 'unknown'}`,
        provider_message_id: events[0]?.providerMessageId || null,
        metadata: {
          is_test: metaTestPayload,
          sample_source: metaTestPayload ? 'meta_developers_test_button' : null
        },
        payload
      })
      .select('id')
      .single();

    if (inboxError?.code === '23505') {
      stage = 'load_duplicate_webhook_event';
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

    stage = 'schedule_background_processing';
    EdgeRuntime.waitUntil(processPersistedEvents(admin, inboxEvent.id, events));
    return response(200, { received: true });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'whatsapp_webhook_request_failed',
      stage,
      ...safeErrorDiagnostic(error)
    }));
    return response(500, { error: 'webhook_processing_failed' });
  }
});
