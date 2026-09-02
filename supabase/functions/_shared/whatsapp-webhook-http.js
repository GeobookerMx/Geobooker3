import { constantTimeEqual } from './whatsapp-security.js';

export function verifyWebhookSubscription({ mode, token, challenge }, expectedToken) {
  if (mode !== 'subscribe' || !token || !challenge || !expectedToken) {
    return { verified: false, status: 403 };
  }

  return constantTimeEqual(token, expectedToken)
    ? { verified: true, status: 200, challenge: String(challenge) }
    : { verified: false, status: 403 };
}
