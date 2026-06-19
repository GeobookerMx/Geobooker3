const FIRST_TOUCH_KEY = 'gb_first_touch_attribution_v1';
const LAST_TOUCH_KEY = 'gb_last_touch_attribution_v1';

const UTM_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'platform_hint',
  'qr_target',
  'lang',
  'country',
  'city',
  'category',
  'subcategory',
  'placement'
];

const normalizeValue = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const readStorage = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[Attribution] Unable to persist attribution:', error.message);
  }
};

const resolveChannelGroup = (source, medium) => {
  const normalizedSource = normalizeValue(source)?.toLowerCase() || '';
  const normalizedMedium = normalizeValue(medium)?.toLowerCase() || '';

  if (!normalizedSource && !normalizedMedium) return 'direct';
  if (normalizedMedium.includes('paid') || normalizedMedium.includes('cpc') || normalizedMedium.includes('ads')) return 'paid';
  if (normalizedMedium.includes('organic') || normalizedMedium.includes('seo')) return 'organic';
  if (normalizedMedium.includes('email')) return 'email';
  if (normalizedMedium.includes('qr') || normalizedMedium.includes('scan')) return 'qr';
  if (normalizedMedium.includes('referral') || normalizedSource.includes('referral')) return 'referral';
  if (normalizedMedium.includes('social') || ['tiktok', 'instagram', 'facebook', 'youtube', 'whatsapp', 'linkedin', 'x'].includes(normalizedSource)) {
    return normalizedMedium.includes('paid') ? 'paid_social' : 'organic_social';
  }
  return 'other';
};

const parseAttributionFromUrl = (url = window.location.href) => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    const searchParams = parsedUrl.searchParams;

    const payload = UTM_FIELDS.reduce((acc, field) => {
      acc[field] = normalizeValue(searchParams.get(field));
      return acc;
    }, {});

    payload.landing_path = normalizeValue(parsedUrl.pathname);
    payload.landing_url = normalizeValue(parsedUrl.toString());
    payload.referrer = normalizeValue(document.referrer);
    payload.language = normalizeValue(localStorage.getItem('language') || document.documentElement.lang || navigator.language || 'es');
    payload.captured_at = new Date().toISOString();
    payload.channel_group = resolveChannelGroup(payload.utm_source, payload.utm_medium);

    const hasSignal = UTM_FIELDS.some((field) => Boolean(payload[field]));
    return hasSignal ? payload : null;
  } catch (error) {
    console.warn('[Attribution] Failed to parse URL:', error.message);
    return null;
  }
};

export const captureAttribution = (url = window.location.href) => {
  const parsed = parseAttributionFromUrl(url);
  if (!parsed) return getCurrentAttribution();

  const firstTouch = readStorage(FIRST_TOUCH_KEY);
  if (!firstTouch) {
    writeStorage(FIRST_TOUCH_KEY, parsed);
  }

  writeStorage(LAST_TOUCH_KEY, parsed);
  window.dispatchEvent(new CustomEvent('geobooker:attribution-captured', { detail: parsed }));
  return parsed;
};

export const getCurrentAttribution = () => readStorage(LAST_TOUCH_KEY) || readStorage(FIRST_TOUCH_KEY);

export const getFirstTouchAttribution = () => readStorage(FIRST_TOUCH_KEY);

export const getAttributionSummary = () => {
  const current = getCurrentAttribution();
  if (!current) return null;

  return [
    current.utm_source || 'direct',
    current.utm_medium || 'none',
    current.utm_campaign || 'none'
  ].join(':');
};

export const appendAttributionToEvent = (params = {}) => {
  const current = getCurrentAttribution();
  const firstTouch = getFirstTouchAttribution();
  const language = normalizeValue(localStorage.getItem('language') || document.documentElement.lang || navigator.language || 'es');

  if (!current && !firstTouch) {
    return {
      ...params,
      language
    };
  }

  return {
    ...params,
    language,
    channel_group: current?.channel_group || firstTouch?.channel_group || 'direct',
    utm_source: current?.utm_source || null,
    utm_medium: current?.utm_medium || null,
    utm_campaign: current?.utm_campaign || null,
    utm_content: current?.utm_content || null,
    utm_term: current?.utm_term || null,
    landing_path: current?.landing_path || firstTouch?.landing_path || null,
    first_touch_source: firstTouch?.utm_source || null,
    first_touch_medium: firstTouch?.utm_medium || null,
    first_touch_campaign: firstTouch?.utm_campaign || null
  };
};

export const buildMarketingUrl = (baseUrl, params = {}) => {
  const url = new URL(baseUrl, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    const normalized = normalizeValue(value);
    if (normalized) {
      url.searchParams.set(key, normalized);
    }
  });

  return url.toString();
};

export const getCampaignNamingExamples = () => ([
  'geobooker_launch_mx',
  'geobooker_business_free_listing',
  'geobooker_tiktok_english_leads',
  'geobooker_michelin_map',
  'geobooker_top5_city',
  'geobooker_qr_restaurants'
]);
