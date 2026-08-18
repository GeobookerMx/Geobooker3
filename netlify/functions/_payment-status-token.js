const { createHmac, timingSafeEqual } = require('node:crypto');

const TOKEN_LIFETIME_SECONDS = 4 * 24 * 60 * 60;

function signingSecret() {
  const secret = String(process.env.PAYMENT_STATUS_SIGNING_SECRET || '').trim();
  if (secret.length < 32) throw new Error('payment_status_signing_not_configured');
  return secret;
}

function validPaymentIntentId(value) {
  return /^pi_[A-Za-z0-9]{8,100}$/.test(String(value || ''));
}

function signature(paymentIntentId, expiresAt, secret) {
  return createHmac('sha256', secret)
    .update(`${paymentIntentId}.${expiresAt}`)
    .digest('base64url');
}

function createPaymentStatusToken(paymentIntentId, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!validPaymentIntentId(paymentIntentId)) throw new Error('invalid_payment_intent');
  const expiresAt = nowSeconds + TOKEN_LIFETIME_SECONDS;
  return `${expiresAt}.${signature(paymentIntentId, expiresAt, signingSecret())}`;
}

function assertPaymentStatusSigningConfigured() {
  signingSecret();
}

function verifyPaymentStatusToken(paymentIntentId, token, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!validPaymentIntentId(paymentIntentId)) return false;
  const [expiresValue, suppliedValue, extra] = String(token || '').split('.');
  const expiresAt = Number(expiresValue);
  if (extra || !Number.isInteger(expiresAt) || expiresAt < nowSeconds || expiresAt > nowSeconds + TOKEN_LIFETIME_SECONDS) {
    return false;
  }

  const expected = Buffer.from(signature(paymentIntentId, expiresAt, signingSecret()));
  const supplied = Buffer.from(String(suppliedValue || ''));
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

module.exports = {
  assertPaymentStatusSigningConfigured,
  createPaymentStatusToken,
  validPaymentIntentId,
  verifyPaymentStatusToken
};
