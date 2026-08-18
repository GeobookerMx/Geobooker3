import { supabase } from '../lib/supabase';

export async function activatePremiumPromotion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Debes iniciar sesión');

  const response = await fetch('/.netlify/functions/activate-premium-promo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'No se pudo activar Premium');
  }

  return payload;
}
