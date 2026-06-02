const WEB_BASE_URL = 'https://geobooker.com.mx';

export const APP_LINKS = {
  web: WEB_BASE_URL,
  downloadHub: `${WEB_BASE_URL}/download`,
  androidStoreUrl: import.meta.env.VITE_ANDROID_STORE_URL || 'https://play.google.com/store/apps/details?id=com.geobooker.app&hl=es_MX',
  iosStoreUrl: import.meta.env.VITE_IOS_STORE_URL || 'https://apps.apple.com/mx/app/geobooker-cerca-de-ti/id6758590506',
};

export const hasAndroidStoreLink = () => Boolean(APP_LINKS.androidStoreUrl);
export const hasIosStoreLink = () => Boolean(APP_LINKS.iosStoreUrl);

export const buildTrackedDownloadUrl = ({
  platform = 'generic',
  source = 'qr',
  medium = 'scan',
  campaign = 'evergreen',
  target = 'hub',
} = {}) => {
  let destination = APP_LINKS.downloadHub;

  if (target === 'android_store' && hasAndroidStoreLink()) {
    destination = APP_LINKS.androidStoreUrl;
  } else if (target === 'ios_store' && hasIosStoreLink()) {
    destination = APP_LINKS.iosStoreUrl;
  }

  const url = new URL(destination);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('platform_hint', platform);
  url.searchParams.set('qr_target', target);
  return url.toString();
};

export const getPreferredQrTarget = (platform = 'generic') => {
  if (platform === 'android' && hasAndroidStoreLink()) return APP_LINKS.androidStoreUrl;
  if (platform === 'ios' && hasIosStoreLink()) return APP_LINKS.iosStoreUrl;
  return APP_LINKS.downloadHub;
};
