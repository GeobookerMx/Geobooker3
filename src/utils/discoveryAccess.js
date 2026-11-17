const DESTINATION_KEY = 'geobooker_auth_destination';
const DESTINATION_TTL = 30 * 60 * 1000;
const DISCOVERY_PATHS = ['/c', '/ciudad', '/cities', '/categories', '/business', '/place', '/geoscore', '/estudio-mercado', '/emprende', '/biblioteca', '/space'];

export function requiresDiscoveryAccount({ hostname = '', isNative = false, platform = 'web' } = {}) {
  if (isNative) return platform === 'android';
  const host = String(hostname).toLowerCase();
  return ['geobooker.com.mx', 'www.geobooker.com.mx', 'geobooker3.netlify.app'].includes(host)
    || host.endsWith('--geobooker3.netlify.app');
}

export function isDiscoveryPath(pathname = '/') {
  return pathname === '/' || DISCOVERY_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'));
}

export function safeAuthDestination(value, fallback = '/dashboard') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some(character => character.charCodeAt(0) < 32)) return fallback;
  try {
    const url = new URL(value, 'https://geobooker.invalid');
    if (url.origin !== 'https://geobooker.invalid') return fallback;
    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.startsWith('//') || decodedPath.includes('\\')) return fallback;
    if (/^\/(?:login|signup|welcome|auth|forgot-password|reset-password)(?:\/|$)/.test(decodedPath)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}

export function rememberAuthDestination(path) {
  const safe = safeAuthDestination(path);
  try { sessionStorage.setItem(DESTINATION_KEY, JSON.stringify({ path: safe, expires: Date.now() + DESTINATION_TTL })); } catch { /* Access still works without optional return navigation. */ }
  return safe;
}

export function getAuthDestination(requested) {
  if (requested) return safeAuthDestination(requested);
  try {
    const stored = JSON.parse(sessionStorage.getItem(DESTINATION_KEY) || 'null');
    if (stored?.expires > Date.now()) return safeAuthDestination(stored.path);
    sessionStorage.removeItem(DESTINATION_KEY);
  } catch { /* Storage can be unavailable in private browsing. */ }
  return '/dashboard';
}

export function consumeAuthDestination(requested) {
  const destination = getAuthDestination(requested);
  try { sessionStorage.removeItem(DESTINATION_KEY); } catch { /* Optional storage. */ }
  return destination;
}
