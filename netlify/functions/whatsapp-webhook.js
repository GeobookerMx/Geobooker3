const {
  extractWhatsAppEvents,
  getRawBody,
  getWhatsAppConfig,
  json,
  serverClient,
  sha256Hex,
  text,
  verifyMetaSignature
} = require('./_whatsapp-cloud');

async function reserveWebhookEvent(supabase, rawBody, payload, signatureVerified, eventType, providerMessageId) {
  const payloadHash = sha256Hex(rawBody);
  const { error } = await supabase
    .schema('crm')
    .from('webhook_events')
    .insert({
      payload_hash: payloadHash,
      signature_verified: signatureVerified,
      event_type: eventType,
      provider_message_id: providerMessageId,
      processing_status: 'processing',
      payload
    });

  if (!error) return { reserved: true, payloadHash };
  if (error.code === '23505') return { reserved: false, duplicate: true, payloadHash };
  throw error;
}

async function markWebhookProcessed(supabase, payloadHash, status, lastError = null) {
  await supabase
    .schema('crm')
    .from('webhook_events')
    .update({
      processing_status: status,
      last_error: lastError,
      processed_at: new Date().toISOString()
    })
    .eq('payload_hash', payloadHash);
}

async function applyStatusEvent(supabase, event) {
  if (!event.providerMessageId) return;

  const { data: message } = await supabase
    .schema('crm')
    .from('messages')
    .select('id')
    .eq('provider_message_id', event.providerMessageId)
    .maybeSingle();

  if (!message?.id) return;

  await supabase
    .schema('crm')
    .from('messages')
    .update({
      current_status: event.status || 'unknown',
      failure_code: event.error?.code ? String(event.error.code) : null,
      failure_detail: event.error?.message || event.error?.title || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', message.id);

  await supabase
    .schema('crm')
    .from('message_status_events')
    .upsert({
      message_id: message.id,
      status: event.status || 'unknown',
      provider_timestamp: event.providerTimestamp,
      provider_event_fingerprint: `${event.providerMessageId}:${event.status}:${event.providerTimestamp}`,
      error_code: event.error?.code ? String(event.error.code) : null,
      error_detail: event.error?.message || event.error?.title || null
    }, { onConflict: 'provider_event_fingerprint' });
}

exports.handler = async (event) => {
  const config = getWhatsAppConfig();

  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    if (mode === 'subscribe' && token && token === config.verifyToken) {
      return text(200, challenge || '');
    }

    return json(403, { success: false, error: 'invalid_verify_token' });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { success: false, error: 'method_not_allowed' });
  }

  const rawBody = getRawBody(event);
  const signatureVerified = verifyMetaSignature(event, rawBody, config.appSecret);

  if (config.requireWebhookSignature && !signatureVerified) {
    return json(401, { success: false, error: 'invalid_meta_signature' });
  }

  let payload;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (error) {
    return json(400, { success: false, error: 'invalid_json_payload' });
  }

  const extractedEvents = extractWhatsAppEvents(payload);
  const eventType = extractedEvents[0]?.type || 'unknown';
  const providerMessageId = extractedEvents[0]?.providerMessageId || null;

  let supabase;
  let reserved;
  try {
    supabase = serverClient();
    reserved = await reserveWebhookEvent(supabase, rawBody, payload, signatureVerified, eventType, providerMessageId);
    if (!reserved.reserved) {
      return json(200, { success: true, duplicate: true });
    }

    for (const extractedEvent of extractedEvents) {
      if (extractedEvent.type === 'status') {
        await applyStatusEvent(supabase, extractedEvent);
      }
    }

    await markWebhookProcessed(supabase, reserved.payloadHash, 'processed');
    return json(200, { success: true, events: extractedEvents.length, signatureVerified });
  } catch (error) {
    if (supabase && reserved?.payloadHash) {
      await markWebhookProcessed(supabase, reserved.payloadHash, 'failed', error.message || 'webhook_processing_failed');
    }

    return json(500, {
      success: false,
      error: 'webhook_processing_failed',
      message: error.message
    });
  }
};
