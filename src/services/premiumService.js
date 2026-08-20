import { supabase } from '../lib/supabase';

export async function activatePremiumPromotion(accessToken = null) {
  let token = accessToken;

  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  if (!token) throw new Error('Debes iniciar sesión');

  const response = await fetch('/.netlify/functions/activate-premium-promo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'No se pudo activar Premium');
  }

  return payload;
}
