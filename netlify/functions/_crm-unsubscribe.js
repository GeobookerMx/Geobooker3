const { createHmac, timingSafeEqual } = require('node:crypto');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function unsubscribeSecret() {
  return process.env.CRM_UNSUBSCRIBE_SECRET
    || process.env.RESEND_WEBHOOK_SECRET
    || process.env.INTERNAL_FUNCTION_SECRET
    || '';
}

function createUnsubscribeToken(email) {
  const secret = unsubscribeSecret();
  const normalized = normalizeEmail(email);
  if (secret.length < 32 || !normalized) return null;
  return createHmac('sha256', secret).update(normalized).digest('hex');
}

function verifyUnsubscribeToken(email, suppliedToken) {
  const expectedToken = createUnsubscribeToken(email);
  const supplied = String(suppliedToken || '').trim().toLowerCase();
  if (!expectedToken || !supplied) return false;

  const expectedBuffer = Buffer.from(expectedToken);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function buildUnsubscribeUrl(email) {
  const normalized = normalizeEmail(email);
  const token = createUnsubscribeToken(normalized);
  if (!token) return null;

  const baseUrl = String(process.env.CRM_PUBLIC_URL || 'https://geobooker.com.mx').replace(/\/$/, '');
  const url = new URL(`${baseUrl}/.netlify/functions/crm-unsubscribe`);
  url.searchParams.set('email', normalized);
  url.searchParams.set('token', token);
  return url.toString();
}

module.exports = {
  buildUnsubscribeUrl,
  normalizeEmail,
  verifyUnsubscribeToken
};
