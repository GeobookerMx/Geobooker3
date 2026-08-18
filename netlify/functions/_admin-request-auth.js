const { createClient } = require('@supabase/supabase-js');
const { bearerToken } = require('./_email-request-auth');

async function authorizeAdminRequest(event, dependencies = {}) {
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

  const { data: adminUser, error: adminError } = await admin
    .from('admin_users')
    .select('id')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (adminError || !adminUser) {
    return { authorized: false, statusCode: 403, error: 'admin_required' };
  }

  return { authorized: true, userId: authData.user.id };
}

module.exports = { authorizeAdminRequest };
