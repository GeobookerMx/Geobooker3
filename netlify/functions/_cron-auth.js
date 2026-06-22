const DEFAULT_ALLOWED_ORIGINS = [
    'https://geobooker.com.mx',
    'https://www.geobooker.com.mx',
    'http://localhost:5173',
    'http://localhost:8888'
];

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

    return bearer === `Bearer ${expectedSecret}` || directHeader === expectedSecret;
}

function ensureCronOrTrustedOrigin(event) {
    if (hasValidCronSecret(event)) {
        return null;
    }

    if (isAllowedOrigin(extractOriginCandidate(event))) {
        return null;
    }

    return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            success: false,
            error: 'Unauthorized'
        })
    };
}

module.exports = {
    ensureCronOrTrustedOrigin
};
