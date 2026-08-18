const { createHmac, timingSafeEqual } = require('node:crypto');

function secret() {
    const value = String(process.env.CRM_UNSUBSCRIBE_SECRET || '');
    if (value.length < 32) throw new Error('crm_unsubscribe_not_configured');
    return value;
}

function payload(contactId, email) {
    return `${String(contactId || '').trim()}:${String(email || '').trim().toLowerCase()}`;
}

function createToken(contactId, email) {
    return createHmac('sha256', secret()).update(payload(contactId, email)).digest('base64url');
}

function verifyToken(contactId, email, suppliedToken) {
    const expected = Buffer.from(createToken(contactId, email));
    const supplied = Buffer.from(String(suppliedToken || ''));
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function unsubscribeUrl(contactId, email) {
    const base = process.env.CRM_UNSUBSCRIBE_URL
        || 'https://geobooker.com.mx/.netlify/functions/crm-unsubscribe';
    const url = new URL(base);
    url.searchParams.set('contact', contactId);
    url.searchParams.set('token', createToken(contactId, email));
    return url.toString();
}

module.exports = { createToken, unsubscribeUrl, verifyToken };
