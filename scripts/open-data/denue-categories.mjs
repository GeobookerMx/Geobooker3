// SCIAN 2023: INEGI classification. Preserve the original activity code in
// provenance; these are Geobooker's broader discovery categories.
export function classifyDenueActivity(value) {
    const code = String(value || '').trim();
    if (!/^\d{6}$/.test(code)) return 'servicios';
    if (code.startsWith('4641')) return 'salud';
    if (code.startsWith('8121')) return 'salud';
    if (code.startsWith('7224')) return 'bares';
    if (code.startsWith('722')) return 'restaurantes';
    if (code.startsWith('721')) return 'alojamiento';
    if (code.startsWith('611')) return 'educacion';
    if (/^62/.test(code)) return 'salud';
    if (/^52/.test(code)) return 'finanzas';
    if (/^531/.test(code)) return 'inmobiliarias';
    if (/^811[124]/.test(code) || code.startsWith('8124') || code.startsWith('5321')) return 'hogar_autos';
    if (/^7[13]/.test(code)) return 'entretenimiento';
    if (/^4[36]/.test(code)) return 'tiendas';
    return 'servicios';
}
