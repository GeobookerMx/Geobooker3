const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_GRAPH_VERSION = 'v23.0';

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function text(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    },
    body: String(body)
  };
}

function normalizeHeaderMap(headers = {}) {
  const normalized = {};
  Object.entries(headers || {}).forEach(([key, value]) => {
    normalized[String(key).toLowerCase()] = value;
  });
  return normalized;
}

function truthy(value) {
  return ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(String(value || '').trim().toLowerCase());
}

function getWhatsAppConfig() {
  return {
    graphVersion: process.env.META_GRAPH_VERSION || process.env.WHATSAPP_GRAPH_VERSION || DEFAULT_GRAPH_VERSION,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.META_WHATSAPP_VERIFY_TOKEN || '',
    appSecret: process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '',
    sendingEnabled: truthy(process.env.CRM_WHATSAPP_SENDING_ENABLED || process.env.WHATSAPP_SENDING_ENABLED),
    requireWebhookSignature: !['0', 'false', 'no', 'off'].includes(String(process.env.WHATSAPP_WEBHOOK_REQUIRE_SIGNATURE || 'true').toLowerCase())
  };
}

function serverClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('supabase_server_not_configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getRawBody(event) {
  if (!event?.body) return '';
  if (event.isBase64Encoded) return Buffer.from(event.body, 'base64').toString('utf8');
  return event.body;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function verifyMetaSignature(event, rawBody, appSecret) {
  if (!appSecret) return false;
  const headers = normalizeHeaderMap(event.headers);
  const supplied = String(headers['x-hub-signature-256'] || '');
  if (!supplied.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')}`;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function extractWhatsAppEvents(payload = {}) {
  const events = [];
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change.value || {};
      const metadata = value.metadata || {};

      for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
        events.push({
          type: 'status',
          providerMessageId: status.id || null,
          status: status.status || 'unknown',
          providerTimestamp: status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString(),
          phoneNumberId: metadata.phone_number_id || null,
          displayPhoneNumber: metadata.display_phone_number || null,
          recipientId: status.recipient_id || null,
          error: Array.isArray(status.errors) ? status.errors[0] || null : null,
          raw: status
        });
      }

      for (const message of Array.isArray(value.messages) ? value.messages : []) {
        events.push({
          type: 'message',
          providerMessageId: message.id || null,
          status: 'received',
          providerTimestamp: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
          phoneNumberId: metadata.phone_number_id || null,
          displayPhoneNumber: metadata.display_phone_number || null,
          from: message.from || null,
          messageType: message.type || 'unknown',
          text: message.text?.body || null,
          raw: message
        });
      }
    }
  }

  return events;
}

async function sendTemplateMessage({ to, templateName, languageCode = 'es_MX', components = [] }) {
  const config = getWhatsAppConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    throw Object.assign(new Error('whatsapp_cloud_not_configured'), { code: 'whatsapp_cloud_not_configured' });
  }

  const normalizedTo = normalizePhone(to);
  if (!normalizedTo || normalizedTo.length < 8) {
    throw Object.assign(new Error('invalid_whatsapp_recipient'), { code: 'invalid_whatsapp_recipient' });
  }

  const response = await fetch(`https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(Array.isArray(components) && components.length > 0 ? { components } : {})
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'whatsapp_provider_rejected');
    error.code = payload?.error?.code || response.status;
    error.providerPayload = payload;
    throw error;
  }

  return payload;
}

module.exports = {
  extractWhatsAppEvents,
  getRawBody,
  getWhatsAppConfig,
  json,
  normalizePhone,
  serverClient,
  sendTemplateMessage,
  sha256Hex,
  text,
  verifyMetaSignature
};
