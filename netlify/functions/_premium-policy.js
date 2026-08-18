const PREMIUM_PROMO_UNTIL = process.env.PREMIUM_FREE_UNTIL || '2027-01-01T00:00:00.000Z';
const PREMIUM_TRIAL_CHARGE_MXN = Number(process.env.PREMIUM_TRIAL_CHARGE_MXN || 10);
const PREMIUM_TRIAL_MONTHS = Number(process.env.PREMIUM_TRIAL_MONTHS || 3);

function isPremiumPromoActive(now = new Date()) {
  const deadline = new Date(PREMIUM_PROMO_UNTIL);
  return !Number.isNaN(deadline.getTime()) && now.getTime() < deadline.getTime();
}

function getTrustedPremiumCheckout() {
  if (!Number.isFinite(PREMIUM_TRIAL_CHARGE_MXN) || PREMIUM_TRIAL_CHARGE_MXN < 10) {
    throw new Error('Premium checkout policy is invalid');
  }

  return {
    amountMinor: Math.round(PREMIUM_TRIAL_CHARGE_MXN * 100),
    currency: 'mxn',
    trialMonths: Math.max(1, Math.min(12, Math.round(PREMIUM_TRIAL_MONTHS)))
  };
}

function normalizeTrialMonths(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(12, Math.round(parsed))) : 1;
}

function getPremiumUntil(start = new Date(), months = PREMIUM_TRIAL_MONTHS) {
  const result = new Date(start);
  if (Number.isNaN(result.getTime())) throw new Error('Invalid Premium start date');
  result.setUTCMonth(result.getUTCMonth() + normalizeTrialMonths(months));
  return result.toISOString();
}

module.exports = {
  PREMIUM_PROMO_UNTIL,
  getPremiumUntil,
  getTrustedPremiumCheckout,
  isPremiumPromoActive,
  normalizeTrialMonths
};
