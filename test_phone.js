const WhatsAppService = {
    normalizePhone: (phone) => {
        if (!phone) return '';
        const clean = phone.replace(/\D/g, '');
        const usaCanadaAreaCodes = ['214', '469', '512', '210']; // ... truncated for brevity

        if (clean.length === 11 && clean.startsWith('1')) return '+' + clean;
        if (clean.length === 10) {
            // Simplified check
            if (usaCanadaAreaCodes.includes(clean.substring(0, 3))) return '+1' + clean;
            return '+52' + clean;
        }
        return '+' + clean;
    }
};

const rawPhone = "5512345678";
const normalized = WhatsAppService.normalizePhone(rawPhone);
console.log(`Raw: ${rawPhone}`);
console.log(`Normalized: ${normalized}`);
console.log(`OpenWhatsApp would use: ${normalized.replace(/\D/g, '')}`);

const rawPhoneUS = "2141234567";
const normalizedUS = WhatsAppService.normalizePhone(rawPhoneUS);
console.log(`Raw: ${rawPhoneUS}`);
console.log(`Normalized: ${normalizedUS}`);
console.log(`OpenWhatsApp would use: ${normalizedUS.replace(/\D/g, '')}`);
