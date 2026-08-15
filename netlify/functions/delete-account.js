// Apple Guideline 5.1.1(v): irreversible self-service account deletion.
const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders, handlePreflight, rejectUnauthorizedOrigin } = require('./_cors');
const { enforceRateLimit } = require('./_rate-limit');
const { getOptionalRequestUser } = require('./_payment-security');

function json(statusCode, headers, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function requireSuccess(query, code) {
  const { error } = await query;
  if (error) throw new Error(code);
}

exports.handler = async (event) => {
  const preflight = handlePreflight(event);
  if (preflight) return preflight;
  const headers = getCorsHeaders(event, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  const originError = rejectUnauthorizedOrigin(event);
  if (originError) return originError;
  if (event.httpMethod !== 'POST') return json(405, headers, { error: 'method_not_allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, headers, { error: 'invalid_request' });
  }
  if (body.confirmation !== 'DELETE_MY_ACCOUNT') {
    return json(400, headers, { error: 'explicit_confirmation_required' });
  }

  const rateLimitError = await enforceRateLimit(event, {
    action: 'delete_account',
    maxCalls: 3,
    windowSeconds: 3600,
    headers
  });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getOptionalRequestUser(event);
    if (!user) return json(401, headers, { error: 'authentication_required' });

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return json(503, headers, { error: 'account_deletion_unavailable' });
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const now = new Date().toISOString();

    await requireSuccess(
      admin.from('businesses').update({ status: 'deleted', updated_at: now }).eq('owner_id', user.id),
      'business_cleanup_failed'
    );
    await requireSuccess(
      admin.from('user_profiles').update({
        full_name: '[Cuenta Eliminada]',
        first_name: null,
        last_name: null,
        phone: null,
        avatar_url: null,
        deleted_at: now,
        updated_at: now
      }).eq('id', user.id),
      'profile_cleanup_failed'
    );
    await requireSuccess(
      admin.from('account_deletion_requests').insert({
        user_id: user.id,
        email: user.email,
        reason: 'user_initiated_in_app',
        status: 'processed',
        requested_at: now,
        processed_at: now
      }),
      'deletion_audit_failed'
    );

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw new Error('auth_deletion_failed');
    return json(200, headers, { success: true, message: 'Cuenta eliminada correctamente' });
  } catch (error) {
    console.error('[delete-account] Failed:', error.message);
    return json(error.statusCode || 500, headers, { error: 'account_deletion_failed' });
  }
};
