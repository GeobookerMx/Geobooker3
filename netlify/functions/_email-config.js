const VERIFIED_SENDER_DOMAIN = process.env.RESEND_VERIFIED_DOMAIN || 'geobooker.com.mx';
const DEFAULT_FROM_NAME = process.env.CRM_DEFAULT_FROM_NAME || 'Geobooker Ads';
const DEFAULT_FROM_ADDRESS = process.env.CRM_DEFAULT_FROM_ADDRESS || process.env.CRM_DEFAULT_FROM_ADRESS || `hola@${VERIFIED_SENDER_DOMAIN}`;
const DEFAULT_REPLY_TO = process.env.CRM_REPLY_TO_EMAIL || process.env.CRM_REPLY_TO_MAIL || process.env.CMR_REPLY_TO_MAIL || 'hola@geobooker.com.mx';

function extractEmailAddress(value = '') {
    const match = String(value).match(/<([^>]+)>/);
    return (match ? match[1] : value).trim().toLowerCase();
}

function isVerifiedSender(email = '') {
    const normalized = extractEmailAddress(email);
    return normalized.endsWith(`@${VERIFIED_SENDER_DOMAIN}`) || normalized.endsWith('@geobooker.com');
}

function formatSender(name, email) {
    return name ? `${name} <${email}>` : email;
}

function resolveEmailSender({ preferredEmail, preferredName } = {}) {
    const requestedEmail = extractEmailAddress(preferredEmail || '');
    const requestedName = (preferredName || '').trim();

    if (requestedEmail && isVerifiedSender(requestedEmail)) {
        return {
            from: formatSender(requestedName || DEFAULT_FROM_NAME, requestedEmail),
            replyTo: requestedEmail === DEFAULT_FROM_ADDRESS ? DEFAULT_REPLY_TO : DEFAULT_REPLY_TO,
            requestedEmail,
            effectiveEmail: requestedEmail,
            fallbackApplied: false
        };
    }

    return {
        from: formatSender(DEFAULT_FROM_NAME, DEFAULT_FROM_ADDRESS),
        replyTo: requestedEmail || DEFAULT_REPLY_TO,
        requestedEmail: requestedEmail || null,
        effectiveEmail: DEFAULT_FROM_ADDRESS,
        fallbackApplied: Boolean(requestedEmail)
    };
}

module.exports = {
    VERIFIED_SENDER_DOMAIN,
    DEFAULT_FROM_NAME,
    DEFAULT_FROM_ADDRESS,
    DEFAULT_REPLY_TO,
    extractEmailAddress,
    isVerifiedSender,
    resolveEmailSender
};
