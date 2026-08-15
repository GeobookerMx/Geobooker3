const { createClient } = require('@supabase/supabase-js');
const { timingSafeEqual } = require('node:crypto');

function normalize(value) {
  return String(value || '').trim();
}

function safeEqual(left, right) {
  const a = Buffer.from(normalize(left));
  const b = Buffer.from(normalize(right));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

function bearerToken(event) {
  const value = event.headers?.authorization || event.headers?.Authorization || '';
  return value.match(/^Bearer\s+(.+)$/i)?.[1] || null;
}

async function authorizeEmailRequest(event, payload, dependencies = {}) {
  const expectedInternalSecret = normalize(process.env.INTERNAL_FUNCTION_SECRET);
  const suppliedInternalSecret = event.headers?.['x-geobooker-internal-secret']
    || event.headers?.['X-Geobooker-Internal-Secret'];
  if (expectedInternalSecret.length >= 32 && safeEqual(suppliedInternalSecret, expectedInternalSecret)) {
    return { authorized: true, actor: 'internal' };
  }

  const token = bearerToken(event);
  if (!token) return { authorized: false, statusCode: 401, error: 'authentication_required' };

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { authorized: false, statusCode: 503, error: 'server_not_configured' };
  }

  const makeClient = dependencies.createClient || createClient;
  const admin = makeClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) {
    return { authorized: false, statusCode: 401, error: 'invalid_session' };
  }

  const recipient = normalize(payload?.data?.email).toLowerCase();
  const actorEmail = normalize(authData.user.email).toLowerCase();
  if (payload?.type === 'welcome' && recipient && recipient === actorEmail) {
    return { authorized: true, actor: 'self', userId: authData.user.id };
  }

  const { data: adminUser, error: adminError } = await admin
    .from('admin_users')
    .select('id')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (adminError || !adminUser) {
    return { authorized: false, statusCode: 403, error: 'admin_required' };
  }

  return { authorized: true, actor: 'admin', userId: authData.user.id };
}

module.exports = {
  authorizeEmailRequest,
  bearerToken,
  safeEqual
};
