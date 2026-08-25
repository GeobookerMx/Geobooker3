/**
 * Central Meta Pixel client for Geobooker.
 *
 * The base loader is declared once in index.html. This module owns consent,
 * production-host checks, URL/parameter sanitization, SPA PageView deduplication
 * and the public API used by product flows. It intentionally has no CAPI code.
 */

import {
  metaAppTrackCompleteRegistration,
  metaAppTrackLead,
  metaAppTrackSearch,
  metaAppTrackViewContent,
} from '../services/metaAppEvents';

const META_PIXEL_ID = String(import.meta.env.VITE_META_PIXEL_ID || '').trim();

const OFFICIAL_HOSTNAMES = new Set([
  'geobooker.com.mx',
  'www.geobooker.com.mx',
  'geobooker.com',
  'www.geobooker.com',
]);

const SAFE_PAGE_QUERY_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'plan',
  'package',
  'premium',
  'next',
  'lang',
  'category',
  'subcategory',
  'city',
  'country',
  'ref',
  'source',
  'tab',
  'page',
]);

const SENSITIVE_KEY_PATTERN = /(?:^|_)(?:access_?token|refresh_?token|token|jwt|password|passcode|secret|session|code|email|e_?mail|phone|telephone|mobile|curp|rfc|card|account|cookie|authorization|full_?name|contact_?name|owner_?name|address|street|postal|zip|latitude|longitude|lat|lng|coordinates?|gps|medical|financial|bank|message|conversation)(?:$|_)/i;
const SENSITIVE_URL_FRAGMENT_PATTERN = /(?:^|[?#&/])(?:access_?token|refresh_?token|token|jwt|password|passcode|secret|session|code|email|e_?mail|phone|telephone|mobile|curp|rfc|authorization)=/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const BEARER_PATTERN = /\bbearer\s+[A-Za-z0-9._~-]+/i;
const PHONE_PATTERN = /(?:\+?\d[\s().-]*){8,}/;
const PRECISE_COORDINATE_PATTERN = /-?\d{1,3}\.\d{5,}\s*[,/]\s*-?\d{1,3}\.\d{5,}/;
const SAFE_EVENT_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,49}$/;
const STANDARD_EVENTS = new Set([
  'PageView',
  'Search',
  'ViewContent',
  'CompleteRegistration',
  'Lead',
  // Prepared for a backend-confirmed payment flow. Not called in this release.
  'Purchase',
]);

const recentEvents = new Map();

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isNativeApp() {
  return typeof window !== 'undefined'
    && window.Capacitor?.isNativePlatform?.() === true;
}

function hasSensitiveValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  return EMAIL_PATTERN.test(text)
    || JWT_PATTERN.test(text)
    || BEARER_PATTERN.test(text)
    || PHONE_PATTERN.test(text)
    || PRECISE_COORDINATE_PATTERN.test(text);
}

function cleanText(value, maxLength = 120) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return null;
  }

  const text = String(value).replace(/\p{Cc}/gu, ' ').trim().slice(0, maxLength);
  return text && !hasSensitiveValue(text) ? text : null;
}

function sanitizeParams(params = {}) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};

  return Object.entries(params).reduce((safe, [key, value]) => {
    if (!SAFE_EVENT_NAME_PATTERN.test(key) || SENSITIVE_KEY_PATTERN.test(key)) return safe;

    if (Array.isArray(value)) {
      const values = value
        .slice(0, 20)
        .map((item) => cleanText(item, 120))
        .filter(Boolean);
      if (values.length) safe[key] = values;
      return safe;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      safe[key] = value;
      return safe;
    }

    if (typeof value === 'boolean') {
      safe[key] = value;
      return safe;
    }

    const cleanValue = cleanText(value);
    if (cleanValue !== null) safe[key] = cleanValue;
    return safe;
  }, {});
}

function getCurrentUrl() {
  if (!isBrowser()) return null;
  try {
    return new URL(window.location.href);
  } catch {
    return null;
  }
}

function getSafeRouteKey() {
  const url = getCurrentUrl();
  if (!url || !OFFICIAL_HOSTNAMES.has(url.hostname.toLowerCase())) return null;

  const safeSearch = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    const normalizedKey = key.toLowerCase();
    if (
      !SAFE_PAGE_QUERY_KEYS.has(normalizedKey)
      || SENSITIVE_KEY_PATTERN.test(normalizedKey)
      || hasSensitiveValue(value)
    ) {
      return null;
    }
    safeSearch.append(normalizedKey, value.slice(0, 160));
  }

  const hash = decodeURIComponent(url.hash || '');
  if (SENSITIVE_URL_FRAGMENT_PATTERN.test(hash) || hasSensitiveValue(hash)) return null;

  const query = safeSearch.toString();
  return `${url.pathname || '/'}${query ? `?${query}` : ''}`;
}

function getSavedMarketingConsent() {
  if (!isBrowser()) return false;
  try {
    const savedConsent = window.localStorage.getItem('gb_cookie_consent');
    if (!savedConsent) return false;
    return JSON.parse(savedConsent)?.marketing === true;
  } catch {
    return false;
  }
}

function canUseMetaPixel() {
  if (!isBrowser() || !META_PIXEL_ID || !OFFICIAL_HOSTNAMES.has(window.location.hostname.toLowerCase())) {
    return false;
  }
  return getSavedMarketingConsent();
}

function ensureMetaReady() {
  if (!canUseMetaPixel()) return false;

  try {
    const bootstrap = window.__geobookerMetaPixelBootstrap;
    if (typeof bootstrap !== 'function') return false;
    return bootstrap({
      pixelId: META_PIXEL_ID,
      initialPagePath: getSafeRouteKey(),
    }) === true && typeof window.fbq === 'function';
  } catch (error) {
    console.warn('[Meta Pixel] Initialization unavailable:', error);
    return false;
  }
}

function isDuplicate(dedupeKey, dedupeWindowMs) {
  if (!dedupeKey || !dedupeWindowMs) return false;
  const now = Date.now();
  const lastSentAt = recentEvents.get(dedupeKey) || 0;
  if (now - lastSentAt < dedupeWindowMs) return true;

  recentEvents.set(dedupeKey, now);
  if (recentEvents.size > 100) {
    for (const [key, sentAt] of recentEvents) {
      if (now - sentAt > 60000) recentEvents.delete(key);
    }
  }
  return false;
}

function sendMetaCommand(command, eventName, params = {}, options = {}) {
  if (!ensureMetaReady() || typeof window.fbq !== 'function') return false;
  if (!SAFE_EVENT_NAME_PATTERN.test(eventName)) return false;

  const dedupeKey = options.dedupeKey ? `${command}:${eventName}:${options.dedupeKey}` : null;
  if (isDuplicate(dedupeKey, options.dedupeWindowMs || 0)) return false;

  const safeParams = sanitizeParams(params);
  const eventId = cleanText(options.eventId, 100);

  try {
    if (eventId) {
      window.fbq(command, eventName, safeParams, { eventID: eventId });
    } else {
      window.fbq(command, eventName, safeParams);
    }
    return true;
  } catch (error) {
    console.warn(`[Meta Pixel] ${eventName} was not sent:`, error);
    return false;
  }
}

export function enableMetaPixel() {
  return ensureMetaReady();
}

export function disableMetaPixel() {
  if (!isBrowser()) return;
  try {
    window.__geobookerMetaPixelRevoke?.();
  } catch (error) {
    console.warn('[Meta Pixel] Consent revoke unavailable:', error);
  }
}

export function metaPageView() {
  if (!ensureMetaReady()) return false;
  const routeKey = getSafeRouteKey();
  if (!routeKey || window.__geobookerMetaLastPageView === routeKey) return false;

  const sent = sendMetaCommand('track', 'PageView', { page_path: routeKey });
  if (sent) window.__geobookerMetaLastPageView = routeKey;
  return sent;
}

export function metaTrack(eventName, params = {}, options = {}) {
  if (!STANDARD_EVENTS.has(eventName) || eventName === 'PageView') return false;
  return sendMetaCommand('track', eventName, params, options);
}

export function metaTrackCustom(eventName, params = {}, options = {}) {
  return sendMetaCommand('trackCustom', eventName, params, options);
}

export function metaTrackSearch(searchString) {
  const safeSearch = cleanText(searchString, 100);
  if (!safeSearch) return false;
  if (isNativeApp()) return metaAppTrackSearch(safeSearch);
  return metaTrack('Search', { search_string: safeSearch }, {
    dedupeKey: safeSearch.toLocaleLowerCase(),
    dedupeWindowMs: 1500,
  });
}

export function metaTrackViewContent({ contentId, category = 'business' } = {}) {
  const safeId = cleanText(contentId, 120);
  const safeCategory = cleanText(category, 80) || 'business';
  if (!safeId) return false;
  if (isNativeApp()) return metaAppTrackViewContent({ contentId: safeId, category: safeCategory });

  return metaTrack('ViewContent', {
    content_type: 'business',
    content_name: safeCategory,
    content_ids: [safeId],
  }, {
    dedupeKey: safeId,
    dedupeWindowMs: 5000,
  });
}

export function metaTrackCompleteRegistration({ method = 'email' } = {}) {
  const safeMethod = ['email', 'google', 'apple', 'oauth'].includes(method) ? method : 'other';
  if (isNativeApp()) return metaAppTrackCompleteRegistration({ method: safeMethod });
  return metaTrack('CompleteRegistration', {
    content_name: 'user_registration',
    status: true,
    registration_method: safeMethod,
  }, {
    dedupeKey: `user_registration:${safeMethod}`,
    dedupeWindowMs: 30000,
  });
}

export function metaTrackLead(leadType) {
  const safeLeadTypes = new Set(['advertising_lead', 'enterprise_lead', 'b2b_lead']);
  const safeLeadType = safeLeadTypes.has(leadType) ? leadType : null;
  if (!safeLeadType) return false;
  if (isNativeApp()) return metaAppTrackLead(safeLeadType);

  return metaTrack('Lead', { content_name: safeLeadType }, {
    dedupeKey: safeLeadType,
    dedupeWindowMs: 30000,
  });
}

/** Future Browser + CAPI deduplication helper. No server event is sent today. */
export function createMetaEventId(prefix = 'web') {
  const safePrefix = cleanText(prefix, 20) || 'web';
  const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${safePrefix}-${randomPart}`;
}

export const metaPixelConfig = Object.freeze({
  pixelId: META_PIXEL_ID,
  officialHostnames: [...OFFICIAL_HOSTNAMES],
});
