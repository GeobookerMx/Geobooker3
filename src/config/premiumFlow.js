export const PREMIUM_AFTER_LOGIN_KEY = 'geobooker_activate_premium_after_login';

export const rememberPremiumIntent = (enabled = true) => {
  try {
    localStorage.setItem(PREMIUM_AFTER_LOGIN_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
};

export const clearPremiumIntent = () => {
  try {
    localStorage.removeItem(PREMIUM_AFTER_LOGIN_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
};

export const hasPremiumIntent = () => {
  try {
    return localStorage.getItem(PREMIUM_AFTER_LOGIN_KEY) === 'true';
  } catch {
    return false;
  }
};

export const getPremiumIntentPreference = () => {
  try {
    return localStorage.getItem(PREMIUM_AFTER_LOGIN_KEY);
  } catch {
    return null;
  }
};
