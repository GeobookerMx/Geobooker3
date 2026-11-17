import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { metaTrackCompleteRegistration } from '../lib/metaPixel';
import { metaAppTrackFirstBusinessPublished } from './metaAppEvents';
import { createMetaConversionTracker } from '../utils/metaConversionState';

const isIOS = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
let tracker;
function getTracker() {
  if (!tracker) tracker = createMetaConversionTracker({
    storage: window.localStorage,
    sendRegistration: metaTrackCompleteRegistration,
    sendPublication: userId => isIOS() ? metaAppTrackFirstBusinessPublished(userId) : false,
    lookupFirstPublishedBusiness: async userId => {
      if (!isIOS()) return null;
      const { data, error } = await supabase.from('businesses')
        .select('id,owner_id,status,listing_type')
        .eq('owner_id', userId).eq('status', 'approved').eq('listing_type', 'business')
        .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return tracker;
}

export function rememberMetaSignup(data) {
  try {
    getTracker().recordSignup(data);
    if (data?.session) void observeMetaConversions(data.session);
  } catch { /* Measurement must never affect registration. */ }
}

export function rememberMetaOAuthSignup(method) {
  try { getTracker().recordOAuthAttempt(method); } catch { /* Storage may be unavailable. */ }
}

export function rememberMetaBusiness(business, userId) {
  if (!isIOS()) return;
  try {
    getTracker().recordBusiness(business, userId);
    void supabase.auth.getSession().then(({ data }) => observeMetaConversions(data?.session)).catch(() => {});
  } catch { /* Measurement must never affect business creation. */ }
}

export async function observeMetaConversions(session) {
  try { await getTracker().observeSession(session); } catch { /* Retry on the next active session. */ }
}
