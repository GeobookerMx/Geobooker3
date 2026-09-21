const DEFAULT_OPT_OUT_KEYWORDS = Object.freeze([
  'STOP',
  'BAJA',
  'ALTO',
  'SALIR',
  'CANCELAR',
  'PARAR',
  'UNSUBSCRIBE',
  'NO QUIERO',
  'NO DESEO'
]);

export function normalizeConsentCommand(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function detectWhatsAppOptOut(value, extraKeywords = []) {
  const command = normalizeConsentCommand(value);
  if (!command) return null;

  const keywords = new Set(
    [...DEFAULT_OPT_OUT_KEYWORDS, ...(Array.isArray(extraKeywords) ? extraKeywords : [])]
      .map(normalizeConsentCommand)
      .filter(Boolean)
  );

  return keywords.has(command) ? command : null;
}

export function detectWhatsAppConsentConfirmation(value) {
  const command = normalizeConsentCommand(value);
  const match = command.match(/^(?:CONFIRMAR|CONFIRM) GEOBOOKER ([A-Z0-9]{10})$/);
  return match?.[1] || null;
}

export function parseOptOutKeywords(value) {
  return String(value || '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 50);
}
