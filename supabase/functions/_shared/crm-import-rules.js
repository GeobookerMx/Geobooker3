const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const PUBLIC_DISCOVERY_SOURCES = /(?:apify|scrap|inegi|denue|overture|open[_ -]?data|public)/i;

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

export function normalizeDomain(value) {
  const candidate = String(value || '').trim().toLowerCase();
  if (!candidate) return null;
  try {
    const url = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
    const hostname = url.hostname.replace(/^www\./, '');
    return hostname.includes('.') ? hostname : null;
  } catch {
    return null;
  }
}

export function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('+')) return null;
  let digits = raw.slice(1).replace(/\D/g, '');
  // Meta can expose historic Mexican mobile identities as +52 1 even though
  // the canonical E.164 representation now uses +52 plus ten national digits.
  if (/^521\d{10}$/.test(digits)) digits = `52${digits.slice(3)}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}

export function normalizeConsent(value) {
  const consent = normalizeText(value).replace(/[\s-]+/g, '_');
  if (['explicit_opt_in', 'opted_in', 'yes', 'true'].includes(consent)) return 'explicit_opt_in';
  if (['opted_out', 'unsubscribe', 'no', 'false'].includes(consent)) return 'opted_out';
  if (['suppressed', 'blocked', 'complaint', 'hard_bounce'].includes(consent)) return 'suppressed';
  return 'unknown';
}

function normalizeTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function assessImportedContactability(row, normalized) {
  const sourceType = String(row.source_type || row.source || row.data_source || '').trim();
  const consentSource = String(row.consent_source || '').trim();
  const consentTextVersion = String(row.consent_text_version || '').trim();
  const consentedAt = normalizeTimestamp(row.consented_at || row.opt_in_at || row.consent_timestamp);
  const reasons = [];

  if (['opted_out', 'suppressed'].includes(normalized.consent_status)) {
    reasons.push('contact_blocked_by_source_status');
    return { status: 'blocked', reasons };
  }
  if (!normalized.normalized_phone) {
    reasons.push('valid_e164_whatsapp_number_required');
    return { status: 'not_contactable', reasons };
  }
  if (PUBLIC_DISCOVERY_SOURCES.test(sourceType)) {
    reasons.push('public_or_scraped_source_is_not_consent');
    return { status: 'research_only', reasons };
  }
  if (normalized.consent_status !== 'explicit_opt_in') {
    reasons.push('explicit_whatsapp_opt_in_required');
    return { status: 'consent_required', reasons };
  }
  if (!consentSource) reasons.push('consent_source_required');
  if (!consentTextVersion) reasons.push('consent_text_version_required');
  if (!consentedAt) reasons.push('consent_timestamp_required');
  if (!normalized.country_code) reasons.push('country_code_required');

  return {
    status: reasons.length ? 'evidence_incomplete' : 'evidence_review_required',
    reasons
  };
}

function validationResult(normalized, errors, warnings = []) {
  return {
    normalized,
    errors,
    warnings,
    status: errors.length ? 'invalid' : warnings.length ? 'needs_review' : 'valid'
  };
}

export function validateAccountRow(row) {
  const name = String(row.company_name || row.account_name || row.name || '').trim();
  const country = String(row.country_code || '').trim().toUpperCase();
  const domainInput = row.website_domain || row.domain || row.website || '';
  const normalized = {
    external_account_id: String(row.account_id || row.external_account_id || '').trim() || null,
    display_name: name || null,
    normalized_name: normalizeText(name) || null,
    normalized_domain: normalizeDomain(domainInput),
    country_code: country || null,
    city: String(row.city || '').trim() || null
  };
  const errors = [];
  const warnings = [];
  if (!normalized.display_name) errors.push('account_name_required');
  if (country && !COUNTRY_PATTERN.test(country)) errors.push('country_code_invalid');
  if (domainInput && !normalized.normalized_domain) warnings.push('domain_needs_review');
  return validationResult(normalized, errors, warnings);
}

export function validateContactRow(row) {
  const fullName = String(row.contact_name || row.full_name || row.name || '').trim();
  const emailInput = row.primary_email || row.email || '';
  const phoneInput = row.phone || row.mobile || row.whatsapp || row.phone_1_digits || row.phone_1_raw || '';
  const normalized = {
    external_contact_id: String(row.contact_id || row.external_contact_id || '').trim() || null,
    external_account_id: String(row.account_id || row.external_account_id || '').trim() || null,
    full_name: fullName || null,
    normalized_name: normalizeText(fullName) || null,
    normalized_email: normalizeEmail(emailInput),
    normalized_phone: normalizePhone(phoneInput),
    country_code: String(row.country_code || '').trim().toUpperCase() || null,
    source_type: String(row.source_type || row.source || row.data_source || '').trim() || null,
    source_url: String(row.source_url || row.public_contact_source || '').trim() || null,
    source_verified_at: normalizeTimestamp(row.source_verified_at || row.verified_at),
    consent_status: normalizeConsent(row.whatsapp_opt_in || row.email_marketing_opt_in || row.consent_status || row.consent),
    consent_source: String(row.consent_source || '').trim() || null,
    consent_text_version: String(row.consent_text_version || '').trim() || null,
    consented_at: normalizeTimestamp(row.consented_at || row.opt_in_at || row.consent_timestamp)
  };
  const errors = [];
  const warnings = [];
  if (!normalized.full_name && !normalized.normalized_email && !normalized.normalized_phone) {
    errors.push('contact_identity_required');
  }
  if (emailInput && !normalized.normalized_email) errors.push('email_invalid');
  if (phoneInput && !normalized.normalized_phone) warnings.push('phone_needs_country_review');
  if (normalized.country_code && !COUNTRY_PATTERN.test(normalized.country_code)) errors.push('country_code_invalid');
  if (normalized.consent_status === 'unknown') warnings.push('consent_unknown');
  const contactability = assessImportedContactability(row, normalized);
  normalized.contactability_status = contactability.status;
  normalized.contactability_reasons = contactability.reasons;
  return validationResult(normalized, errors, warnings);
}

export function validateSuppressionRow(row) {
  const email = normalizeEmail(row.email || row.identifier);
  const phone = normalizePhone(row.phone || row.whatsapp || row.identifier);
  const identifierType = email ? 'email' : phone ? (row.whatsapp ? 'whatsapp' : 'phone') : null;
  const normalized = {
    identifier_type: identifierType,
    normalized_identifier: email || phone,
    reason: normalizeText(row.status || row.reason).replace(/\s+/g, '_') || 'manual_block',
    occurred_at: row.event_at || row.occurred_at || row.created_at || null
  };
  const errors = normalized.normalized_identifier ? [] : ['suppression_identifier_invalid'];
  return validationResult(normalized, errors);
}

export function classifyAccountDuplicate(incoming, candidate) {
  if (incoming.normalized_domain && incoming.normalized_domain === candidate.normalized_domain) {
    return { classification: 'exact', rule: 'account_domain_exact' };
  }
  if (incoming.normalized_name && incoming.normalized_name === candidate.normalized_name
    && incoming.country_code && incoming.country_code === candidate.country_code) {
    return { classification: 'exact', rule: 'account_name_country_exact' };
  }
  if (incoming.normalized_name && incoming.normalized_name === candidate.normalized_name) {
    return { classification: 'possible', rule: 'account_name_review' };
  }
  return { classification: 'none', rule: null };
}

export function classifyContactDuplicate(incoming, candidate) {
  if (incoming.normalized_email && incoming.normalized_email === candidate.normalized_email) {
    return { classification: 'exact', rule: 'contact_email_exact' };
  }
  if (incoming.normalized_phone && incoming.normalized_phone === candidate.normalized_phone) {
    return { classification: 'exact', rule: 'contact_phone_exact' };
  }
  if (incoming.external_account_id && incoming.external_account_id === candidate.external_account_id
    && incoming.normalized_name && incoming.normalized_name === candidate.normalized_name) {
    return { classification: 'possible', rule: 'contact_account_name_review' };
  }
  return { classification: 'none', rule: null };
}

export function determineImportStatus({ validation, duplicate, suppressed = false }) {
  if (suppressed) return 'suppressed';
  if (validation.errors.length) return 'invalid';
  if (duplicate?.classification === 'exact') return 'duplicate';
  const reviewWarnings = validation.warnings.filter(warning => ![
    'consent_unknown',
    'phone_needs_country_review'
  ].includes(warning));
  if (duplicate?.classification === 'possible' || reviewWarnings.length) return 'needs_review';
  return 'valid';
}
