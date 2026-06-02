import { trackEvent } from './analyticsService';

const STORAGE_KEY = 'gb_qr_attribution';

export function captureQrAttribution(url = window.location.href) {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    const params = parsedUrl.searchParams;

    const payload = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      platform_hint: params.get('platform_hint'),
      qr_target: params.get('qr_target'),
      landing_path: parsedUrl.pathname,
      captured_at: new Date().toISOString(),
    };

    const hasQrSignal = Object.values(payload).some((value) => Boolean(value));
    if (!hasQrSignal) return null;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('geobooker:qr-attribution', { detail: payload }));

    trackEvent('qr_attribution_captured', payload);
    return payload;
  } catch (error) {
    console.warn('[QR Attribution] capture failed:', error);
    return null;
  }
}

export function getStoredQrAttribution() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[QR Attribution] read failed:', error);
    return null;
  }
}
