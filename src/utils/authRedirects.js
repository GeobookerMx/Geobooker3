import { getCanonicalOrigin } from '../config/domainStrategy.js';

export const NATIVE_PASSWORD_RECOVERY_URL = 'https://geobooker.com.mx/reset-password';

export function getPasswordRecoveryRedirect({ isNative = false, hostname } = {}) {
  if (isNative) return NATIVE_PASSWORD_RECOVERY_URL;
  return `${getCanonicalOrigin(hostname)}/reset-password`;
}
