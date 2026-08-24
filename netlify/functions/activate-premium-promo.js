const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders, handlePreflight, rejectUnauthorizedOrigin } = require('./_cors');
const { enforceRateLimit } = require('./_rate-limit');
const { getOptionalRequestUser } = require('./_payment-security');
const { PREMIUM_PROMO_UNTIL, isPremiumPromoActive } = require('./_premium-policy');

exports.handler = async (event) => {
  const preflight = handlePreflight(event);
  if (preflight) return preflight;

  const headers = getCorsHeaders(event);
  const originError = rejectUnauthorizedOrigin(event);
  if (originError) return originError;

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const rateLimitError = await enforceRateLimit(event, {
    action: 'activate_premium_promo',
    maxCalls: 3,
    windowSeconds: 300,
    headers
  });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getOptionalRequestUser(event);
    if (!user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
    }

    if (!isPremiumPromoActive()) {
      return { statusCode: 410, headers, body: JSON.stringify({ error: 'Premium promotion has ended' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw Object.assign(new Error('Premium service not configured'), { statusCode: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const now = new Date().toISOString();
    let { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        is_premium: true,
        is_premium_owner: true,
        premium_since: now,
        premium_until: PREMIUM_PROMO_UNTIL,
        updated_at: now
      })
      .eq('id', user.id)
      .select('id, is_premium, is_premium_owner, premium_until')
      .maybeSingle();

    // Algunos registros antiguos o creados durante una incidencia del trigger
    // de Auth pueden no tener todavia su fila en user_profiles. La promocion no
    // debe fallar por eso: el backend de confianza crea el perfil faltante.
    if (!error && !profile) {
      const fallbackName = user.user_metadata?.full_name
        || user.user_metadata?.name
        || String(user.email || 'Usuario').split('@')[0]
        || 'Usuario';

      const insertResult = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email || null,
          full_name: fallbackName,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          is_premium: true,
          is_premium_owner: true,
          premium_since: now,
          premium_until: PREMIUM_PROMO_UNTIL,
          updated_at: now
        })
        .select('id, is_premium, is_premium_owner, premium_until')
        .single();

      profile = insertResult.data;
      error = insertResult.error;
    }

    if (error || !profile) {
      console.error('[activate-premium-promo] Profile update failed:', error?.message);
      throw Object.assign(new Error('User profile could not be updated'), { statusCode: 409 });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, premiumUntil: profile.premium_until })
    };
  } catch (error) {
    console.error('[activate-premium-promo] Error:', error.message);
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Premium activation failed' })
    };
  }
};
