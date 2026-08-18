const { createHmac, timingSafeEqual } = require('node:crypto');

const DEFAULT_TOLERANCE_SECONDS = 300;

function headerValue(headers, name) {
  if (!headers) return '';
  return String(headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '').trim();
}

function decodeSecret(secret) {
  const value = String(secret || '').trim();
  if (!value.startsWith('whsec_')) throw new Error('invalid_webhook_secret');
  const decoded = Buffer.from(value.slice(6), 'base64');
  if (decoded.length < 16) throw new Error('invalid_webhook_secret');
  return decoded;
}

function verifyResendWebhook({ payload, headers, secret, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = DEFAULT_TOLERANCE_SECONDS }) {
  const id = headerValue(headers, 'svix-id');
  const timestampValue = headerValue(headers, 'svix-timestamp');
  const signatureHeader = headerValue(headers, 'svix-signature');
  const timestamp = Number(timestampValue);

  if (!id || !Number.isInteger(timestamp) || !signatureHeader) return null;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return null;

  const expected = createHmac('sha256', decodeSecret(secret))
    .update(`${id}.${timestampValue}.${payload}`)
    .digest();

  const candidates = signatureHeader.split(/\s+/).map((part) => part.split(',', 2))
    .filter(([version, value]) => version === 'v1' && value);
  const valid = candidates.some(([, value]) => {
    let supplied;
    try {
      supplied = Buffer.from(value, 'base64');
    } catch {
      return false;
    }
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });

  return valid ? { id, timestamp } : null;
}

module.exports = { verifyResendWebhook };
