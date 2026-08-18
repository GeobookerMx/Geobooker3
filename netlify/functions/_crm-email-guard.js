const BLOCKED_EMAIL_STATUSES = new Set(['bounced', 'unsubscribed', 'complained', 'suppressed']);

function enabled(name) {
    return process.env[name] === 'true';
}

function isValidEmail(value = '') {
    const email = String(value || '').trim().toLowerCase();
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function contactEligibility(contact = {}) {
    const reasons = [];
    if (!isValidEmail(contact.email)) reasons.push('invalid_email');
    if (contact.is_active !== true) reasons.push('inactive_contact');
    if (contact.email_unsubscribed === true) reasons.push('unsubscribed');
    if (BLOCKED_EMAIL_STATUSES.has(String(contact.email_status || '').toLowerCase())) {
        reasons.push('suppressed_status');
    }
    if (contact.email_marketing_allowed !== true) reasons.push('marketing_not_allowed');
    if (!contact.email_contact_basis || !contact.email_contact_basis_verified_at) {
        reasons.push('contact_basis_unverified');
    }
    if (String(contact.compliance_risk || '').toLowerCase() !== 'low') {
        reasons.push('compliance_not_approved');
    }
    const readiness = Number(contact.crm_readiness_score);
    if (!Number.isFinite(readiness) || readiness < 70) reasons.push('readiness_below_threshold');
    if (!String(contact.company_name || '').trim()) reasons.push('missing_company');
    if (!String(contact.contact_name || '').trim()) reasons.push('missing_contact_name');
    return { eligible: reasons.length === 0, reasons };
}

function configuredDailyLimit(requestedLimit, databaseLimit) {
    const environmentLimit = Number(process.env.CRM_EMAIL_MAX_DAILY || 25);
    const safeEnvironmentLimit = Number.isFinite(environmentLimit)
        ? Math.min(Math.max(Math.floor(environmentLimit), 1), 50)
        : 25;
    const candidates = [requestedLimit, databaseLimit, safeEnvironmentLimit]
        .map(Number)
        .filter(Number.isFinite)
        .map((value) => Math.max(Math.floor(value), 1));
    return Math.min(...candidates, safeEnvironmentLimit);
}

function configuredBatchLimit(requestedLimit, remaining) {
    const environmentLimit = Number(process.env.CRM_EMAIL_MAX_BATCH || 10);
    const safeEnvironmentLimit = Number.isFinite(environmentLimit)
        ? Math.min(Math.max(Math.floor(environmentLimit), 1), 10)
        : 10;
    return Math.min(requestedLimit || safeEnvironmentLimit, remaining, safeEnvironmentLimit);
}

function retryDelaySeconds(attemptCount) {
    return Math.min(60 * (2 ** Math.max(attemptCount, 0)), 3600);
}

module.exports = {
    contactEligibility,
    configuredBatchLimit,
    configuredDailyLimit,
    enabled,
    isValidEmail,
    retryDelaySeconds
};
