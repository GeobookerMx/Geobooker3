import pkg from 'google-libphonenumber';

const { PhoneNumberUtil, PhoneNumberFormat } = pkg;
const phoneUtil = PhoneNumberUtil.getInstance();

// Use the same parsed number for validation and the wa.me destination.
// Never accept a number solely because its length looks international.
export function normalizeWhatsAppPhone(phone, { countryCode = '' } = {}) {
    if (!phone) return '';
    let raw = String(phone).trim().replace(/^tel:/i, '');
    raw = raw.replace(/(?:\s*(?:ext\.?|extension|extensión|x|#)\s*\d+)$/i, '').trim();
    if (!/^[+\d\s().\-/]+$/.test(raw)) return '';
    let digits = raw.replace(/\D/g, '');
    if (!digits || /^(\d)\1+$/.test(digits)) return '';
    let region = String(countryCode || '').trim().toUpperCase();
    if (region === 'UK') region = 'GB';
    if (!phoneUtil.getSupportedRegions().includes(region)) region = '';
    if (raw.startsWith('00')) {
        raw = '+' + digits.slice(2);
        digits = digits.slice(2);
    }
    // Mexico retired the extra mobile 1 after +52.
    if (digits.startsWith('521') && digits.length === 13 && (raw.startsWith('+') || region === 'MX')) {
        raw = '+52' + digits.slice(3);
    }
    const candidates = raw.startsWith('+') ? [[raw, undefined]] : [
        ...(region ? [[raw, region]] : []),
        ...(digits.length >= 11 ? [['+' + digits, undefined]] : []),
    ];
    for (const [value, country] of candidates) {
        try {
            const parsed = phoneUtil.parseAndKeepRawInput(value, country);
            if (phoneUtil.isValidNumber(parsed)) return phoneUtil.format(parsed, PhoneNumberFormat.E164);
        } catch { /* Try only the remaining evidence-based interpretations. */ }
    }
    return '';
}
