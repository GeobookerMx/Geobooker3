const encoder = new TextEncoder();

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  const maxLength = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

export async function hmacSha256Hex(secret, rawBody) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  return toHex(new Uint8Array(signature));
}

export async function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!rawBody || !appSecret || !signatureHeader?.startsWith('sha256=')) return false;
  const received = signatureHeader.slice('sha256='.length).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) return false;
  const expected = await hmacSha256Hex(appSecret, rawBody);
  return constantTimeEqual(expected, received);
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return toHex(new Uint8Array(digest));
}

export function normalizeProviderPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export function isCustomerServiceWindowOpen(expiresAt, now = new Date()) {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  return !Number.isNaN(expiry.getTime()) && expiry.getTime() > now.getTime();
}

const STATUS_RANK = Object.freeze({
  pending: 0,
  queued: 1,
  accepted: 2,
  sent: 3,
  delivered: 4,
  read: 5,
  deleted: 6,
  received: 3
});

export function shouldAdvanceMessageStatus(currentStatus, nextStatus) {
  if (nextStatus === 'failed') {
    return !['delivered', 'read', 'deleted'].includes(currentStatus);
  }
  const currentRank = STATUS_RANK[currentStatus] ?? -1;
  const nextRank = STATUS_RANK[nextStatus] ?? -1;
  return nextRank >= currentRank;
}

export function evaluateOutboundPolicy({
  budgetPolicy,
  permissionStatus,
  suppressed,
  serviceWindowOpen,
  template,
  messageType
}) {
  if (!budgetPolicy || !budgetPolicy.is_active || budgetPolicy.kill_switch) {
    return { allowed: false, reason: 'sending_disabled' };
  }
  if (suppressed) return { allowed: false, reason: 'recipient_suppressed' };

  if (serviceWindowOpen && messageType === 'text') {
    return { allowed: true, purpose: 'service' };
  }

  if (!template || template.approval_status !== 'approved') {
    return { allowed: false, reason: 'approved_template_required' };
  }

  const purpose = template.category === 'marketing' ? 'marketing' : 'transactional';
  if (!['allowed', 'opted_in'].includes(permissionStatus)) {
    return { allowed: false, reason: `${purpose}_permission_required`, purpose };
  }

  return { allowed: true, purpose };
}

export function computeRetry({ attemptCount, statusCode, ambiguousTimeout = false }) {
  if (ambiguousTimeout) return { retry: false, state: 'unknown', delaySeconds: null };
  const retryable = statusCode === 429 || statusCode >= 500;
  if (!retryable || attemptCount >= 5) return { retry: false, state: 'failed', delaySeconds: null };
  const base = Math.min(3600, 2 ** Math.max(1, attemptCount) * 15);
  return { retry: true, state: 'retry', delaySeconds: base };
}

export function buildStatusFingerprint(providerMessageId, status, providerTimestamp) {
  return `${providerMessageId}:${status}:${providerTimestamp}`;
}

