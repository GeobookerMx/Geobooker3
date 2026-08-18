import {
  buildStatusFingerprint,
  normalizeProviderPhone
} from './whatsapp-security.js';

function timestampToIso(timestamp) {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

export function classifyWebhookPayload(payload) {
  const events = [];
  const allowedMessageTypes = new Set([
    'text', 'image', 'audio', 'video', 'document', 'location', 'interactive', 'reaction'
  ]);
  const allowedStatuses = new Set(['sent', 'delivered', 'read', 'failed', 'deleted']);

  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      if (change?.field !== 'messages') continue;
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id || null;

      for (const message of value.messages || []) {
        const providerTimestamp = timestampToIso(message.timestamp);
        const normalizedFrom = normalizeProviderPhone(message.from);
        if (!message.id || !providerTimestamp || !normalizedFrom || !phoneNumberId) continue;

        events.push({
          kind: 'inbound',
          providerMessageId: message.id,
          providerTimestamp,
          providerWaId: message.from,
          normalizedFrom,
          phoneNumberId,
          messageType: allowedMessageTypes.has(message.type) ? message.type : 'unknown',
          text: message.text?.body || null,
          contextProviderMessageId: message.context?.id || null,
          content: message
        });
      }

      for (const statusEvent of value.statuses || []) {
        const providerTimestamp = timestampToIso(statusEvent.timestamp);
        if (!statusEvent.id || !allowedStatuses.has(statusEvent.status) || !providerTimestamp) continue;
        events.push({
          kind: 'status',
          providerMessageId: statusEvent.id,
          status: statusEvent.status,
          providerTimestamp,
          fingerprint: buildStatusFingerprint(statusEvent.id, statusEvent.status, providerTimestamp),
          errorCode: statusEvent.errors?.[0]?.code ? String(statusEvent.errors[0].code) : null,
          errorDetail: statusEvent.errors?.[0]?.title || statusEvent.errors?.[0]?.message || null
        });
      }
    }
  }

  return events;
}

export function webhookScope(payload) {
  const businessAccountIds = new Set();
  const phoneNumberIds = new Set();

  for (const entry of payload?.entry || []) {
    if (entry?.id) businessAccountIds.add(String(entry.id));
    for (const change of entry?.changes || []) {
      const id = change?.value?.metadata?.phone_number_id;
      if (id) phoneNumberIds.add(String(id));
    }
  }

  return {
    businessAccountIds: [...businessAccountIds],
    phoneNumberIds: [...phoneNumberIds]
  };
}

export function isAllowedWebhookScope(payload, allowedBusinessAccountIds, allowedPhoneNumberIds) {
  const scope = webhookScope(payload);
  if (scope.businessAccountIds.length === 0) return false;
  if (scope.businessAccountIds.some((id) => !allowedBusinessAccountIds.has(id))) return false;
  if (scope.phoneNumberIds.some((id) => !allowedPhoneNumberIds.has(id))) return false;
  return true;
}
