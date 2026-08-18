import { getCanonicalOrigin } from '../config/domainStrategy.js';

export const NATIVE_PASSWORD_RECOVERY_URL = 'geobooker://auth/callback?type=recovery';

export function getPasswordRecoveryRedirect({ isNative = false, hostname } = {}) {
  if (isNative) return NATIVE_PASSWORD_RECOVERY_URL;
  return `${getCanonicalOrigin(hostname)}/reset-password`;
}
