/**
 * _cors.js — Shared CORS helper for all Geobooker Netlify Functions
 *
 * Usage:
 *   const { getCorsHeaders, handlePreflight } = require('./_cors');
 *
 *   exports.handler = async (event) => {
 *     const preflight = handlePreflight(event);
 *     if (preflight) return preflight;
 *     const headers = getCorsHeaders(event);
 *     // ... rest of handler
 *   };
 */

const ALLOWED_ORIGINS = [
  'https://geobooker.com',
  'https://www.geobooker.com',
  'https://geobooker.com.mx',
  'https://www.geobooker.com.mx',
  // Capacitor mobile apps (androidScheme/iosScheme = "https")
  'https://localhost',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:8888',
];

function getRequestOrigin(event) {
  return event?.headers?.origin || event?.headers?.Origin || '';
}

/**
 * Returns CORS headers restricted to Geobooker-owned origins.
 * Falls back to the primary domain for unrecognized origins.
 */
function getCorsHeaders(event, extraHeaders = {}) {
  const origin = getRequestOrigin(event);
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Geobooker-Payment-Status-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    ...extraHeaders,
  };
}

/**
 * Stripe webhooks are called by Stripe's servers directly — not by a browser.
 * They MUST use '*' because Stripe does not send an Origin header.
 * Security is guaranteed by the signature verification (constructEvent).
 */
function getWebhookHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
  };
}

/**
 * Handles OPTIONS preflight request. Returns a 204 response or null.
 * Call at the top of your handler: const pre = handlePreflight(event); if (pre) return pre;
 */
function handlePreflight(event, extraHeaders = {}) {
  if (event.httpMethod === 'OPTIONS') {
    if (isUnauthorizedOrigin(event)) {
      return rejectUnauthorizedOrigin(event, extraHeaders);
    }

    return {
      statusCode: 204,
      headers: getCorsHeaders(event, extraHeaders),
      body: '',
    };
  }
  return null;
}

/**
 * Returns true if the request origin is NOT a known Geobooker origin.
 * Use this to reject unauthorized cross-origin calls explicitly.
 */
function isUnauthorizedOrigin(event) {
  const origin = getRequestOrigin(event);
  if (!origin) return false; // server-to-server calls have no Origin — allow
  return !ALLOWED_ORIGINS.includes(origin);
}

function rejectUnauthorizedOrigin(event, extraHeaders = {}) {
  if (!isUnauthorizedOrigin(event)) return null;

  return {
    statusCode: 403,
    headers: getCorsHeaders(event, {
      'Content-Type': 'application/json',
      ...extraHeaders,
    }),
    body: JSON.stringify({ error: 'Origin not allowed' }),
  };
}

module.exports = {
  getCorsHeaders,
  getWebhookHeaders,
  handlePreflight,
  isUnauthorizedOrigin,
  rejectUnauthorizedOrigin,
  ALLOWED_ORIGINS,
};
