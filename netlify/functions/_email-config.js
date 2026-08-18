const VERIFIED_SENDER_DOMAIN = process.env.RESEND_VERIFIED_DOMAIN || 'geobooker.com';
const DEFAULT_FROM_NAME = process.env.CRM_DEFAULT_FROM_NAME || 'Geobooker';
const DEFAULT_FROM_ADDRESS = process.env.CRM_DEFAULT_FROM_ADDRESS || `notificaciones@${VERIFIED_SENDER_DOMAIN}`;
const DEFAULT_REPLY_TO = process.env.CRM_REPLY_TO_EMAIL || process.env.CRM_REPLY_TO_MAIL || process.env.CMR_REPLY_TO_MAIL || 'hola@geobooker.com.mx';
const ALLOWED_REPLY_TO_DOMAINS = new Set(
    String(process.env.CRM_ALLOWED_REPLY_TO_DOMAINS || 'geobooker.com,geobooker.com.mx')
        .split(',')
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean)
);

function extractEmailAddress(value = '') {
    const match = String(value).match(/<([^>]+)>/);
    return (match ? match[1] : value).trim().toLowerCase();
}

function isVerifiedSender(email = '') {
    const normalized = extractEmailAddress(email);
    const parts = normalized.split('@');
    return parts.length === 2 && parts[1] === VERIFIED_SENDER_DOMAIN.toLowerCase();
}

function isAllowedReplyTo(email = '') {
    const normalized = extractEmailAddress(email);
    const parts = normalized.split('@');
    return parts.length === 2 && ALLOWED_REPLY_TO_DOMAINS.has(parts[1]);
}

function assertEmailSenderConfiguration() {
    if (!isVerifiedSender(DEFAULT_FROM_ADDRESS)) {
        throw new Error('crm_sender_domain_mismatch');
    }
    return true;
}

function formatSender(name, email) {
    return name ? `${name} <${email}>` : email;
}

function resolveEmailSender({ preferredEmail } = {}) {
    assertEmailSenderConfiguration();
    const requestedEmail = extractEmailAddress(preferredEmail || '');
    const requestedReplyTo = requestedEmail
        && requestedEmail !== DEFAULT_FROM_ADDRESS
        && isAllowedReplyTo(requestedEmail)
        ? requestedEmail
        : DEFAULT_REPLY_TO;

    return {
        from: formatSender(DEFAULT_FROM_NAME, DEFAULT_FROM_ADDRESS),
        replyTo: requestedReplyTo,
        requestedEmail: requestedEmail || null,
        effectiveEmail: DEFAULT_FROM_ADDRESS,
        fallbackApplied: Boolean(requestedEmail && requestedEmail !== DEFAULT_FROM_ADDRESS)
    };
}

module.exports = {
    VERIFIED_SENDER_DOMAIN,
    DEFAULT_FROM_NAME,
    DEFAULT_FROM_ADDRESS,
    DEFAULT_REPLY_TO,
    extractEmailAddress,
    isVerifiedSender,
    isAllowedReplyTo,
    assertEmailSenderConfiguration,
    resolveEmailSender
};
