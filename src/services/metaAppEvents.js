import { Capacitor, registerPlugin } from '@capacitor/core';

const META_APP_ID = '3176918089184321';
const META_CLIENT_TOKEN = String(import.meta.env.VITE_META_APP_CLIENT_TOKEN || '').trim();

const SAFE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,49}$/;
const SENSITIVE_KEY_PATTERN = /(?:^|_)(?:access_?token|refresh_?token|token|jwt|password|passcode|secret|session|code|email|e_?mail|phone|telephone|mobile|curp|rfc|card|account|cookie|authorization|full_?name|contact_?name|owner_?name|address|street|postal|zip|latitude|longitude|lat|lng|coordinates?|gps|medical|financial|bank|message|conversation)(?:$|_)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const BEARER_PATTERN = /\bbearer\s+[A-Za-z0-9._~-]+/i;
const PHONE_PATTERN = /(?:\+?\d[\s().-]*){8,}/;
const PRECISE_COORDINATE_PATTERN = /-?\d{1,3}\.\d{5,}\s*[,/]\s*-?\d{1,3}\.\d{5,}/;

const STANDARD_EVENTS = new Set([
  'ActivateApp',
  'Search',
  'ViewContent',
  'CompleteRegistration',
  'Lead',
]);

const eventNameMap = {
  ActivateApp: 'fb_mobile_activate_app',
  Search: 'fb_mobile_search',
  ViewContent: 'fb_mobile_content_view',
  CompleteRegistration: 'fb_mobile_complete_registration',
  Lead: 'fb_mobile_lead',
};

const nativeMetaAppEvents = registerPlugin('MetaAppEvents');
const recentEvents = new Map();

let nativeStatusPromise = null;
let enabled = false;
let activationSent = false;

function isNativeMobile() {
  return Capacitor.isNativePlatform()
    && ['android', 'ios'].includes(Capacitor.getPlatform())
    && import.meta.env.PROD;
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
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return null;
  const text = String(value).replace(/\p{Cc}/gu, ' ').trim().slice(0, maxLength);
  return text && !hasSensitiveValue(text) ? text : null;
}

function sanitizeParams(params = {}) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};

  return Object.entries(params).reduce((safe, [key, value]) => {
    if (!SAFE_KEY_PATTERN.test(key) || SENSITIVE_KEY_PATTERN.test(key)) return safe;

    if (Array.isArray(value)) {
      const values = value.slice(0, 20).map((item) => cleanText(item, 120)).filter(Boolean);
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

async function getNativeStatus() {
  if (!isNativeMobile()) return { available: false, reason: 'not_native_production' };
  if (!nativeStatusPromise) {
    nativeStatusPromise = nativeMetaAppEvents.getStatus()
      .catch((error) => ({ available: false, reason: error?.message || 'native_unavailable' }));
  }
  return nativeStatusPromise;
}

async function configureNative() {
  const status = await getNativeStatus();
  if (!status?.available || status?.debugBuild) return false;
  if (!META_CLIENT_TOKEN) return false;

  try {
    const result = await nativeMetaAppEvents.configure({
      appId: META_APP_ID,
      clientToken: META_CLIENT_TOKEN,
      autoLogAppEvents: false,
      advertiserIdCollection: false,
    });
    return result?.configured === true;
  } catch {
    return false;
  }
}

export async function enableMetaAppEvents() {
  if (!isNativeMobile()) return false;
  const configured = await configureNative();
  if (!configured) return false;

  try {
    const result = await nativeMetaAppEvents.enable({
      advertiserIdCollection: false,
    });
    enabled = result?.enabled === true;
    if (enabled && !activationSent) {
      activationSent = true;
    }
    return enabled;
  } catch {
    return false;
  }
}

export async function disableMetaAppEvents() {
  enabled = false;
  try {
    if (isNativeMobile()) await nativeMetaAppEvents.disable();
  } catch {
    // Native tracking failures must never affect the UI.
  }
}

export async function trackMetaAppEvent(eventName, params = {}, options = {}) {
  if (!STANDARD_EVENTS.has(eventName) || !enabled || !isNativeMobile()) return false;

  const mappedName = eventNameMap[eventName];
  if (!mappedName) return false;

  const dedupeKey = options.dedupeKey ? `${eventName}:${options.dedupeKey}` : null;
  if (isDuplicate(dedupeKey, options.dedupeWindowMs || 0)) return false;

  try {
    const result = await nativeMetaAppEvents.logEvent({
      name: mappedName,
      params: sanitizeParams(params),
    });
    return result?.sent === true;
  } catch {
    return false;
  }
}

export function metaAppTrackSearch(searchString) {
  const safeSearch = cleanText(searchString, 100);
  if (!safeSearch) return false;
  void trackMetaAppEvent('Search', { search_string: safeSearch }, {
    dedupeKey: safeSearch.toLocaleLowerCase(),
    dedupeWindowMs: 1500,
  });
  return true;
}

export function metaAppTrackViewContent({ contentId, category = 'business' } = {}) {
  const safeId = cleanText(contentId, 120);
  const safeCategory = cleanText(category, 80) || 'business';
  if (!safeId) return false;

  void trackMetaAppEvent('ViewContent', {
    content_type: 'business',
    content_category: safeCategory,
    content_id: safeId,
  }, {
    dedupeKey: safeId,
    dedupeWindowMs: 5000,
  });
  return true;
}

export function metaAppTrackCompleteRegistration({ method = 'email' } = {}) {
  const safeMethod = ['email', 'google', 'apple', 'oauth'].includes(method) ? method : 'other';
  void trackMetaAppEvent('CompleteRegistration', {
    registration_method: safeMethod,
    status: true,
  }, {
    dedupeKey: `user_registration:${safeMethod}`,
    dedupeWindowMs: 30000,
  });
  return true;
}

export function metaAppTrackLead(leadType) {
  const safeLeadTypes = new Set(['advertising_lead', 'enterprise_lead', 'b2b_lead']);
  const safeLeadType = safeLeadTypes.has(leadType) ? leadType : null;
  if (!safeLeadType) return false;

  void trackMetaAppEvent('Lead', { content_name: safeLeadType }, {
    dedupeKey: safeLeadType,
    dedupeWindowMs: 30000,
  });
  return true;
}

export const metaAppEventsConfig = Object.freeze({
  appId: META_APP_ID,
  requiresClientToken: true,
});
