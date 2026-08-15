const { createClient } = require('@supabase/supabase-js');

const PAYMENT_RETURN_ORIGINS = new Set([
  'https://geobooker.com.mx',
  'https://www.geobooker.com.mx',
  'https://geobooker.com',
  'https://www.geobooker.com'
]);

function getBearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function getOptionalRequestUser(event, { supabaseClient } = {}) {
  const token = getBearerToken(event);
  if (!token) return null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = supabaseClient || (
    supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null
  );

  if (!client) {
    const error = new Error('Authentication service not configured');
    error.statusCode = 503;
    throw error;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    const authError = new Error('Invalid or expired authorization');
    authError.statusCode = 401;
    throw authError;
  }

  return data.user;
}

function normalizePaymentReturnUrl(value, fallback) {
  if (!value) return fallback;

  let url;
  try {
    url = new URL(String(value));
  } catch {
    const error = new Error('Invalid payment return URL');
    error.statusCode = 400;
    throw error;
  }

  if (!PAYMENT_RETURN_ORIGINS.has(url.origin) || url.username || url.password) {
    const error = new Error('Payment return URL is not allowed');
    error.statusCode = 400;
    throw error;
  }

  return url.toString();
}

function validateAmountInMinorUnits(amount, currency) {
  const parsed = Number(amount);
  const minimum = currency === 'mxn' ? 1000 : 50;

  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > 50_000_000) {
    const error = new Error('Invalid payment amount');
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

module.exports = {
  PAYMENT_RETURN_ORIGINS,
  getBearerToken,
  getOptionalRequestUser,
  normalizePaymentReturnUrl,
  validateAmountInMinorUnits
};
