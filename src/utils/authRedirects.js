import { getCanonicalOrigin } from '../config/domainStrategy.js';

export const NATIVE_PASSWORD_RECOVERY_URL = 'https://geobooker.com.mx/reset-password';
const PASSWORD_RECOVERY_MARKER = 'geobooker_password_recovery_verified';
const PASSWORD_RECOVERY_MARKER_TTL_MS = 15 * 60 * 1000;

export function getPasswordRecoveryRedirect({ isNative = false, hostname } = {}) {
  if (isNative) return NATIVE_PASSWORD_RECOVERY_URL;
  return `${getCanonicalOrigin(hostname)}/reset-password`;
}

export function hasPasswordRecoverySignal(url) {
  try {
    const parsed = new URL(url, 'https://geobooker.com.mx');
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const isResetRoute = parsed.pathname === '/reset-password'
      || parsed.pathname.startsWith('/reset-password/');
    return (isResetRoute && parsed.searchParams.has('code'))
      || parsed.searchParams.get('type') === 'recovery'
      || hash.get('type') === 'recovery';
  } catch {
    return false;
  }
}

export function markPasswordRecoveryVerified() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(PASSWORD_RECOVERY_MARKER, String(Date.now()));
  }
}

export function isPasswordRecoveryVerified() {
  if (typeof sessionStorage === 'undefined') return false;
  const verifiedAt = Number(sessionStorage.getItem(PASSWORD_RECOVERY_MARKER));
  const isCurrent = Number.isFinite(verifiedAt)
    && verifiedAt > 0
    && Date.now() - verifiedAt <= PASSWORD_RECOVERY_MARKER_TTL_MS;
  if (!isCurrent) clearPasswordRecoveryVerification();
  return isCurrent;
}

export function clearPasswordRecoveryVerification() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(PASSWORD_RECOVERY_MARKER);
  }
}
