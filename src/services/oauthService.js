import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { withAuthTimeout } from '../utils/authFlow';

export const NATIVE_OAUTH_CALLBACK_URL = 'geobooker://auth/callback';

export function getOAuthCallbackUrl({ isNative = Capacitor.isNativePlatform(), origin } = {}) {
  if (isNative) return NATIVE_OAUTH_CALLBACK_URL;
  const browserOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!browserOrigin) throw new Error('OAuth callback origin is unavailable');
  return `${browserOrigin}/auth/callback`;
}

export async function beginOAuthSignIn(provider) {
  const isNative = Capacitor.isNativePlatform();
  const { data, error } = await withAuthTimeout(supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getOAuthCallbackUrl({ isNative }),
      skipBrowserRedirect: true,
      queryParams: provider === 'google'
        ? { access_type: 'offline', prompt: 'select_account' }
        : undefined
    }
  }));

  if (error) throw error;
  if (!data?.url) throw new Error('OAuth provider did not return a redirect URL');

  if (isNative) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url });
  } else {
    window.location.assign(data.url);
  }
}
