const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { PhoneNumberFormat, PhoneNumberUtil } = require('google-libphonenumber');
const { getCorsHeaders, handlePreflight, rejectUnauthorizedOrigin } = require('./_cors');
const { enforceRateLimit } = require('./_rate-limit');

const CONSENT_TEXT_VERSION = 'whatsapp-public-double-opt-in-v1-2026-09-18';
const CONSENT_TEXT = 'Solicito iniciar una conversación con Geobooker por WhatsApp y recibir respuestas relacionadas con mi solicitud. El consentimiento de marketing es opcional y puede retirarse en cualquier momento.';
const ALLOWED_COUNTRIES = new Set(['MX', 'US', 'GB', 'ES', 'DE', 'FR', 'NL', 'CO']);
const ALLOWED_LANGUAGES = new Set(['es_MX', 'es_ES', 'en_US', 'en_GB']);
const phoneUtil = PhoneNumberUtil.getInstance();

function response(statusCode, headers, body) {
  return { statusCode, headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

function cleanText(value, maximumLength) {
  return Array.from(String(value || ''), (character) => {
    const codePoint = character.charCodeAt(0);
    return character === '<' || character === '>' || codePoint < 32 ? ' ' : character;
  }).join('').replace(/\s+/g, ' ').trim().slice(0, maximumLength);
}

function normalizePhone(value, countryCode) {
  let raw = String(value || '').trim();
  const inputDigits = raw.replace(/\D/g, '');
  if (countryCode === 'MX' && /^521\d{10}$/.test(inputDigits)) raw = `+52${inputDigits.slice(3)}`;
  const parsed = phoneUtil.parseAndKeepRawInput(raw, countryCode);
  if (!phoneUtil.isValidNumber(parsed)) throw new Error('invalid_phone');
  const region = phoneUtil.getRegionCodeForNumber(parsed);
  if (!region || region !== countryCode) throw new Error('phone_country_mismatch');
  return phoneUtil.format(parsed, PhoneNumberFormat.E164);
}

function newConfirmationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

exports.handler = async (event) => {
  const headers = getCorsHeaders(event);
  const preflight = handlePreflight(event, { 'Cache-Control': 'no-store' });
  if (preflight) return preflight;
  const originRejection = rejectUnauthorizedOrigin(event, { 'Cache-Control': 'no-store' });
  if (originRejection) return originRejection;
  if (event.httpMethod !== 'POST') return response(405, headers, { error: 'method_not_allowed' });
  if ((event.body || '').length > 20_000) return response(413, headers, { error: 'payload_too_large' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return response(503, headers, { error: 'security_control_unavailable' });
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const rateLimit = await enforceRateLimit(event, {
    action: 'whatsapp_consent_request',
    maxCalls: 5,
    windowSeconds: 3600,
    headers,
    supabaseClient: supabase,
  });
  if (rateLimit) return rateLimit;

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return response(400, headers, { error: 'invalid_json' }); }
  if (cleanText(body.website, 200)) return response(200, headers, { accepted: true });

  const fullName = cleanText(body.fullName, 120);
  const companyName = cleanText(body.companyName, 160) || null;
  const countryCode = cleanText(body.countryCode, 2).toUpperCase();
  const languageCode = ALLOWED_LANGUAGES.has(body.languageCode) ? body.languageCode : countryCode === 'MX' ? 'es_MX' : 'en_US';
  const requestedService = body.requestedService === true;
  const requestedMarketing = body.requestedMarketing === true;
  const acceptedPrivacy = body.acceptedPrivacy === true;
  if (fullName.length < 2 || !ALLOWED_COUNTRIES.has(countryCode) || !requestedService || !acceptedPrivacy) {
    return response(400, headers, { error: 'required_consent_fields_missing' });
  }

  let normalizedPhone;
  try { normalizedPhone = normalizePhone(body.phone, countryCode); } catch (error) {
    return response(400, headers, { error: error.message === 'phone_country_mismatch' ? 'phone_country_mismatch' : 'invalid_phone' });
  }

  const code = newConfirmationCode();
  const codeHash = sha256(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60_000).toISOString();
  const sourcePath = cleanText(body.sourcePath, 300) || '/whatsapp-consent';
  const campaignCode = cleanText(body.campaignCode, 80) || null;
  const consentTextHash = sha256(`${CONSENT_TEXT_VERSION}|${CONSENT_TEXT}|service:${requestedService}|marketing:${requestedMarketing}`);
  const crm = supabase.schema('crm');

  const { data: existing, error: lookupError } = await crm.from('whatsapp_consent_requests')
    .select('id')
    .eq('normalized_phone', normalizedPhone)
    .eq('status', 'pending_inbound')
    .gt('expires_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) return response(503, headers, { error: 'consent_storage_unavailable' });

  const requestData = {
    normalized_phone: normalizedPhone,
    country_code: countryCode,
    full_name: fullName,
    company_name: companyName,
    language_code: languageCode,
    requested_service: requestedService,
    requested_marketing: requestedMarketing,
    status: 'pending_inbound',
    confirmation_code_hash: codeHash,
    consent_text_version: CONSENT_TEXT_VERSION,
    consent_text_sha256: consentTextHash,
    source_type: campaignCode ? 'advertising_landing' : 'public_form',
    source_path: sourcePath,
    campaign_code: campaignCode,
    source_metadata: {
      double_opt_in_required: true,
      marketing_separate: true,
      confirmation_method: 'whatsapp_qr_or_deep_link',
      same_number_confirmation_required: true,
      form_submitted_at: now.toISOString(),
    },
    expires_at: expiresAt,
  };
  const storageResult = existing
    ? await crm.from('whatsapp_consent_requests').update(requestData).eq('id', existing.id).select('id').single()
    : await crm.from('whatsapp_consent_requests').insert(requestData).select('id').single();
  if (storageResult.error) return response(503, headers, { error: 'consent_storage_unavailable' });

  const cloudNumber = String(process.env.WHATSAPP_PUBLIC_CLOUD_NUMBER || '525574057295').replace(/\D/g, '');
  const confirmationText = `CONFIRMAR GEOBOOKER ${code}`;
  const waLink = `https://wa.me/${cloudNumber}?text=${encodeURIComponent(confirmationText)}`;
  return response(201, headers, {
    accepted: true,
    status: 'pending_inbound',
    expiresAt,
    confirmationCode: code,
    confirmationText,
    waLink,
    marketingRequested: requestedMarketing,
  });
};
