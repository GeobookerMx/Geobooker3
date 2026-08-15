const DEFAULT_ALLOWED_ORIGINS = [
    'https://geobooker.com.mx',
    'https://www.geobooker.com.mx',
    'http://localhost:5173',
    'http://localhost:8888'
];
const { timingSafeEqual } = require('node:crypto');
const { authorizeAdminRequest } = require('./_admin-request-auth');

function normalizeHeaderMap(headers = {}) {
    const normalized = {};
    Object.entries(headers || {}).forEach(([key, value]) => {
        normalized[String(key).toLowerCase()] = value;
    });
    return normalized;
}

function extractOriginCandidate(event) {
    const headers = normalizeHeaderMap(event?.headers);
    return headers.origin || headers.referer || '';
}

function isAllowedOrigin(originCandidate) {
    if (!originCandidate) return false;
    return DEFAULT_ALLOWED_ORIGINS.some((allowed) => originCandidate.startsWith(allowed));
}

function hasValidCronSecret(event) {
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) return false;

    const headers = normalizeHeaderMap(event?.headers);
    const bearer = headers.authorization || '';
    const directHeader = headers['x-cron-secret'] || '';

    const supplied = bearer.startsWith('Bearer ') ? bearer.slice(7) : directHeader;
    const expected = Buffer.from(String(expectedSecret));
    const actual = Buffer.from(String(supplied || ''));
    return expected.length >= 32
      && actual.length === expected.length
      && timingSafeEqual(actual, expected);
}

async function ensureCronOrAdmin(event, dependencies = {}) {
    if (hasValidCronSecret(event)) {
        return null;
    }

    const authorization = await authorizeAdminRequest(event, dependencies);
    if (authorization.authorized) return null;
    return {
        statusCode: authorization.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            success: false,
            error: authorization.error
        })
    };
}

module.exports = {
    ensureCronOrAdmin,
    extractOriginCandidate,
    isAllowedOrigin
};
