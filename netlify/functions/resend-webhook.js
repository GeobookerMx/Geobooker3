const { createClient } = require('@supabase/supabase-js');
const { verifyResendWebhook } = require('./_resend-webhook-signature');

const MAX_BODY_BYTES = 256 * 1024;
const HANDLED_EVENTS = new Set([
  'email.sent',
  'email.delivered',
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.complained',
  'email.delivery_delayed',
  'email.failed',
  'email.suppressed'
]);

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function serverClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('server_not_configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function recipientEmail(data) {
  const candidates = Array.isArray(data?.to) ? data.to : [data?.to];
  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.includes('@'));
  return String(value || '').trim().toLowerCase();
}

function eventTimestamp(webhook) {
  const parsed = Date.parse(webhook?.created_at || webhook?.data?.created_at || '');
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function safeMetadata(type, data) {
  if (type === 'email.clicked') {
    return {
      url: typeof data?.link === 'string' ? data.link.slice(0, 2048) : null,
      user_agent: typeof data?.user_agent === 'string' ? data.user_agent.slice(0, 512) : null
    };
  }
  if (type === 'email.opened') {
    return {
      user_agent: typeof data?.user_agent === 'string' ? data.user_agent.slice(0, 512) : null
    };
  }
  if (type === 'email.bounced') {
    return {
      bounce_type: typeof data?.bounce_type === 'string' ? data.bounce_type.slice(0, 100) : null,
      bounce_reason: typeof data?.bounce_reason === 'string' ? data.bounce_reason.slice(0, 500) : null
    };
  }
  if (type === 'email.delivery_delayed' || type === 'email.failed' || type === 'email.suppressed') {
    return {
      reason: typeof data?.reason === 'string' ? data.reason.slice(0, 500) : null,
      status: typeof data?.status === 'string' ? data.status.slice(0, 100) : null
    };
  }
  return {};
}

async function requireSuccess(query, code) {
  const result = await query;
  if (result.error) {
    const error = new Error(code);
    error.cause = result.error;
    throw error;
  }
  return result.data;
}

async function reserveEvent(supabase, svixId, eventType) {
  const { error } = await supabase.from('resend_webhook_events').insert({
    svix_id: svixId,
    event_type: eventType,
    processing_status: 'processing'
  });
  if (!error) return true;
  if (error.code !== '23505') throw new Error('webhook_reservation_failed');

  const { data: existing, error: readError } = await supabase
    .from('resend_webhook_events')
    .select('processing_status')
    .eq('svix_id', svixId)
    .maybeSingle();
  if (readError) throw new Error('webhook_reservation_read_failed');
  if (existing?.processing_status !== 'failed') return false;

  await requireSuccess(
    supabase.from('resend_webhook_events').update({
      processing_status: 'processing',
      last_error_code: null,
      updated_at: new Date().toISOString()
    }).eq('svix_id', svixId).eq('processing_status', 'failed'),
    'webhook_retry_reservation_failed'
  );
  return true;
}

async function updateContactEngagement(supabase, email, fields, scoreIncrement) {
  const { data: contact, error } = await supabase
    .from('marketing_contacts')
    .select('id,email_engagement_score')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error('contact_lookup_failed');
  if (!contact) return;

  await requireSuccess(
    supabase.from('marketing_contacts').update({
      ...fields,
      email_engagement_score: (contact.email_engagement_score || 0) + scoreIncrement
    }).eq('id', contact.id),
    'contact_update_failed'
  );
}

async function processEmailEvent(supabase, webhook) {
  const type = webhook.type;
  const data = webhook.data;
  const email = recipientEmail(data);
  const messageId = typeof data?.email_id === 'string' ? data.email_id : '';
  if (!email || !messageId) throw new Error('invalid_email_event');

  const eventType = type.slice('email.'.length);
  const metadata = safeMetadata(type, data);
  await requireSuccess(
    supabase.from('email_analytics').insert({
      message_id: messageId,
      recipient_email: email,
      event_type: eventType,
      timestamp: eventTimestamp(webhook),
      metadata
    }),
    'analytics_insert_failed'
  );

  await requireSuccess(
    supabase.from('campaign_history').update({
      status: eventType
    }).eq('message_id', messageId),
    'campaign_history_update_failed'
  );

  const now = new Date().toISOString();
  if (type === 'email.delivered') {
    await updateContactEngagement(supabase, email, { email_status: 'delivered' }, 0);
  } else if (type === 'email.opened') {
    await updateContactEngagement(supabase, email, { last_email_opened: now, email_status: 'opened' }, 5);
  } else if (type === 'email.clicked') {
    await updateContactEngagement(supabase, email, { last_email_clicked: now, email_status: 'clicked' }, 10);
  } else if (type === 'email.bounced') {
    await requireSuccess(
      supabase.from('marketing_contacts').update({
        email_status: 'bounced',
        is_active: false,
        bounce_reason: metadata.bounce_reason
      }).eq('email', email),
      'bounce_suppression_failed'
    );
    await requireSuccess(
      supabase.from('email_queue').update({
        status: 'failed',
        error_message: metadata.bounce_reason || 'Email bounced'
      }).eq('message_id', messageId),
      'bounce_queue_update_failed'
    );
  } else if (type === 'email.complained') {
    await requireSuccess(
      supabase.from('marketing_contacts').update({
        email_status: 'complained',
        is_active: false,
        email_unsubscribed: true
      }).eq('email', email),
      'complaint_suppression_failed'
    );
    await requireSuccess(
      supabase.from('email_queue').update({
        status: 'failed',
        error_message: 'Recipient complained / spam report'
      }).eq('message_id', messageId),
      'complaint_queue_update_failed'
    );
  } else if (type === 'email.suppressed' || type === 'email.failed') {
    await requireSuccess(
      supabase.from('marketing_contacts').update({
        email_status: type === 'email.suppressed' ? 'suppressed' : 'failed',
        is_active: false,
        bounce_reason: metadata.reason || metadata.status || eventType
      }).eq('email', email),
      'failed_suppression_failed'
    );
    await requireSuccess(
      supabase.from('email_queue').update({
        status: 'failed',
        error_message: metadata.reason || metadata.status || eventType
      }).eq('message_id', messageId),
      'failed_queue_update_failed'
    );
  } else if (type === 'email.delivery_delayed') {
    await requireSuccess(
      supabase.from('marketing_contacts').update({
        email_status: 'delivery_delayed'
      }).eq('email', email),
      'delivery_delay_mark_failed'
    );
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  const payload = typeof event.body === 'string' ? event.body : '';
  if (!payload || Buffer.byteLength(payload, 'utf8') > MAX_BODY_BYTES) {
    return json(400, { error: 'invalid_payload' });
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return json(503, { error: 'webhook_not_configured' });

  let signature;
  try {
    signature = verifyResendWebhook({ payload, headers: event.headers, secret });
  } catch {
    return json(503, { error: 'webhook_not_configured' });
  }
  if (!signature) return json(400, { error: 'invalid_signature' });

  let webhook;
  try {
    webhook = JSON.parse(payload);
  } catch {
    return json(400, { error: 'invalid_payload' });
  }
  if (!webhook?.type || !webhook?.data) return json(400, { error: 'invalid_payload' });

  let supabase;
  try {
    supabase = serverClient();
    const shouldProcess = await reserveEvent(supabase, signature.id, webhook.type);
    if (!shouldProcess) return json(200, { success: true, duplicate: true });

    if (HANDLED_EVENTS.has(webhook.type)) await processEmailEvent(supabase, webhook);
    await requireSuccess(
      supabase.from('resend_webhook_events').update({
        processing_status: 'completed',
        completed_at: new Date().toISOString(),
        last_error_code: null,
        updated_at: new Date().toISOString()
      }).eq('svix_id', signature.id),
      'webhook_completion_failed'
    );
    return json(200, { success: true });
  } catch (error) {
    console.error('[Resend webhook] Processing failed:', error.message);
    if (supabase && signature?.id) {
      await supabase.from('resend_webhook_events').update({
        processing_status: 'failed',
        last_error_code: String(error.message || 'processing_failed').slice(0, 100),
        updated_at: new Date().toISOString()
      }).eq('svix_id', signature.id);
    }
    return json(500, { error: 'processing_failed' });
  }
};

exports._test = { recipientEmail, safeMetadata };
