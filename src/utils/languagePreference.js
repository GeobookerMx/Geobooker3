const SUPPORTED_LANGUAGES = ['es', 'en', 'fr', 'zh', 'ja', 'ko'];
const SPANISH_COUNTRIES = ['ES', 'MX', 'CO', 'AR', 'CL', 'PE', 'EC', 'VE', 'GT', 'PR'];
const ENGLISH_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'IT', 'NL', 'BE', 'SE', 'NO', 'FI', 'DK'];
const CHINESE_COUNTRIES = ['CN', 'HK', 'TW'];

export const LANGUAGE_PREFERENCE_SOURCE_KEY = 'languagePreferenceSource';
export const LANGUAGE_STORAGE_KEY = 'language';
export const SUPPORTED_GEOBOOKER_LANGUAGES = SUPPORTED_LANGUAGES;

export const normalizeLanguage = (language) => {
  const normalized = String(language || '').split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : null;
};

export const getLanguageForCountry = (countryCode) => {
  const country = String(countryCode || '').toUpperCase();

  if (country === 'FR') return 'fr';
  if (country === 'JP') return 'ja';
  if (country === 'KR') return 'ko';
  if (CHINESE_COUNTRIES.includes(country)) return 'zh';
  if (SPANISH_COUNTRIES.includes(country)) return 'es';
  if (ENGLISH_COUNTRIES.includes(country)) return 'en';

  // Geobooker Global: fuera de mercados traducidos o hispanos, abrir en ingles.
  return country ? 'en' : null;
};

export const getCachedCountryCode = () => {
  try {
    const geoCache = localStorage.getItem('geo_country_cache');
    if (!geoCache) return null;

    const parsed = JSON.parse(geoCache);
    return parsed.data?.country || parsed.country || null;
  } catch (error) {
    console.warn('Error parsing geo cache:', error);
    return null;
  }
};

export const getStoredManualLanguage = () => {
  try {
    const source = localStorage.getItem(LANGUAGE_PREFERENCE_SOURCE_KEY);
    const saved = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    return source === 'manual' ? saved : null;
  } catch (error) {
    return null;
  }
};

export const markManualLanguage = (language) => {
  const normalized = normalizeLanguage(language);
  if (!normalized) return;

  localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  localStorage.setItem(LANGUAGE_PREFERENCE_SOURCE_KEY, 'manual');
};

export const markAutoLanguage = (language) => {
  const normalized = normalizeLanguage(language);
  if (!normalized) return;

  localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  localStorage.setItem(LANGUAGE_PREFERENCE_SOURCE_KEY, 'auto');
};

export const shouldRespectManualLanguage = () => {
  try {
    return Boolean(getStoredManualLanguage());
  } catch (error) {
    return false;
  }
};

export const getInitialLanguage = () => {
  const params = new URLSearchParams(window.location.search);
  const forceLang = normalizeLanguage(params.get('lng'));
  if (forceLang) return forceLang;

  const manualLang = getStoredManualLanguage();
  if (manualLang) return manualLang;

  const cachedCountryLang = getLanguageForCountry(getCachedCountryCode());
  if (cachedCountryLang) return cachedCountryLang;

  const browserLang = normalizeLanguage(navigator.language);
  if (browserLang) return browserLang;

  const hostname = window.location.hostname;
  if (hostname.endsWith('geobooker.com')) return 'en';
  if (hostname.endsWith('geobooker.com.mx')) return 'es';

  return 'en';
};
