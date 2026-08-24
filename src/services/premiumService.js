import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';

const configuredFunctionsBase = String(import.meta.env.VITE_FUNCTIONS_BASE_URL || '').replace(/\/$/, '');

const getPremiumEndpoint = () => {
  if (/^https?:\/\//i.test(configuredFunctionsBase)) {
    return `${configuredFunctionsBase}/activate-premium-promo`;
  }

  if (Capacitor.isNativePlatform()) {
    return 'https://geobooker.com.mx/.netlify/functions/activate-premium-promo';
  }

  const functionsBase = configuredFunctionsBase || '/.netlify/functions';
  return `${functionsBase}/activate-premium-promo`;
};

export async function activatePremiumPromotion(accessToken = null) {
  let token = accessToken;

  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  if (!token) throw new Error('Debes iniciar sesión');

  const response = await fetch(getPremiumEndpoint(), {
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
