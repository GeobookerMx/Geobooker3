const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [String(key).toLowerCase(), value])
  );
}

function getClientAddress(event) {
  const headers = normalizeHeaders(event?.headers);
  const forwarded = String(headers['x-forwarded-for'] || '').split(',')[0].trim();

  return String(
    headers['x-nf-client-connection-ip'] ||
    headers['client-ip'] ||
    forwarded ||
    'unknown'
  ).trim();
}

function createIdentifier(event, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(getClientAddress(event))
    .digest('hex');
}

function jsonResponse(statusCode, headers, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

async function enforceRateLimit(event, options = {}) {
  const {
    action,
    maxCalls = 10,
    windowSeconds = 60,
    headers = {},
    supabaseClient,
  } = options;

  if (!action) {
    throw new Error('Rate limit action is required');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hashSecret = process.env.RATE_LIMIT_HASH_SECRET || serviceRoleKey;

  if ((!supabaseUrl || !serviceRoleKey) && !supabaseClient) {
    console.error(`[rate-limit] Missing Supabase configuration for ${action}`);
    return jsonResponse(503, headers, { error: 'Security control unavailable' });
  }

  if (!hashSecret) {
    console.error(`[rate-limit] Missing identifier hash secret for ${action}`);
    return jsonResponse(503, headers, { error: 'Security control unavailable' });
  }

  const client = supabaseClient || createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await client.rpc('check_rate_limit', {
      p_identifier: createIdentifier(event, hashSecret),
      p_action: action,
      p_max_calls: maxCalls,
      p_window_secs: windowSeconds,
    });

    if (error) {
      console.error(`[rate-limit] RPC failed for ${action}:`, error.message || error);
      return jsonResponse(503, headers, { error: 'Security control unavailable' });
    }

    if (data !== true) {
      return jsonResponse(
        429,
        headers,
        { error: 'Too many requests' },
        { 'Retry-After': String(windowSeconds) }
      );
    }

    return null;
  } catch (error) {
    console.error(`[rate-limit] Unexpected failure for ${action}:`, error.message || error);
    return jsonResponse(503, headers, { error: 'Security control unavailable' });
  }
}

module.exports = {
  createIdentifier,
  enforceRateLimit,
  getClientAddress,
};
