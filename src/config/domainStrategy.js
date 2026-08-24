const GLOBAL_CANONICAL_ORIGIN = 'https://www.geobooker.com';
const MEXICO_CANONICAL_ORIGIN = 'https://geobooker.com.mx';

const GLOBAL_HOSTS = new Set(['www.geobooker.com', 'geobooker.com']);
const MEXICO_HOSTS = new Set(['geobooker.com.mx', 'www.geobooker.com.mx']);

const cleanPath = (path = '/') => {
  const value = String(path || '/').split('#')[0].split('?')[0] || '/';
  return value.startsWith('/') ? value : '/' + value;
};

export const getRuntimeHostname = () => {
  if (typeof window === 'undefined') return '';
  return window.location.hostname || '';
};

export const isGlobalHost = (hostname = getRuntimeHostname()) => {
  const host = String(hostname || '').toLowerCase();
  return GLOBAL_HOSTS.has(host) || (host.endsWith('geobooker.com') && !host.endsWith('geobooker.com.mx'));
};

export const isMexicoHost = (hostname = getRuntimeHostname()) => {
  const host = String(hostname || '').toLowerCase();
  return MEXICO_HOSTS.has(host) || host.endsWith('geobooker.com.mx');
};

export const getCanonicalOrigin = (hostname = getRuntimeHostname()) => {
  if (isGlobalHost(hostname)) return GLOBAL_CANONICAL_ORIGIN;
  if (isMexicoHost(hostname)) return MEXICO_CANONICAL_ORIGIN;

  if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
    return window.location.origin;
  }

  return MEXICO_CANONICAL_ORIGIN;
};

export const buildCanonicalUrl = (path = '/', hostname = getRuntimeHostname()) => {
  return getCanonicalOrigin(hostname) + cleanPath(path);
};

export const getAlternateUrls = (path = '/') => {
  const p = cleanPath(path);
  const global = GLOBAL_CANONICAL_ORIGIN;
  const mx = MEXICO_CANONICAL_ORIGIN;

  return {
    'en':      global + p,
    'en-US':   global + p,
    'en-CA':   global + p,
    'es':      mx + p,
    'es-MX':   mx + p,
    'x-default': global + p,
  };
};

export const getMarketLanguage = (hostname = getRuntimeHostname()) => {
  if (isGlobalHost(hostname)) return 'en';
  if (isMexicoHost(hostname)) return 'es';
  return 'en';
};

export const getDownloadHubUrl = (hostname = getRuntimeHostname()) => {
  return getCanonicalOrigin(hostname) + '/download';
};

export const DOMAIN_STRATEGY = {
  globalOrigin: GLOBAL_CANONICAL_ORIGIN,
  mexicoOrigin: MEXICO_CANONICAL_ORIGIN,
};
