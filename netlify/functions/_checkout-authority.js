const { createClient } = require('@supabase/supabase-js');
const { getTrustedPremiumCheckout } = require('./_premium-policy');

const CONNECT_PACKAGES = Object.freeze({
  connect_launch_1000: { name: 'Piloto Connect 1000', priceMxn: 500, batchSize: 1000 },
  industrial_local: { name: 'Industrial Local', priceMxn: 1500, batchSize: 1000 },
  logistics_corridor: { name: 'Corredor Logistico', priceMxn: 2500, batchSize: 1000 }
});

const LOCAL_AD_PROMO = Object.freeze({
  discountPercent: 50,
  endsAt: '2026-08-02T05:59:59.000Z'
});

function checkoutError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function requireUuid(value, label) {
  const normalized = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw checkoutError(`${label} is invalid`);
  }
  return normalized;
}

function createServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw checkoutError('Checkout authority is not configured', 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function loadRecord(supabase, table, select, id) {
  const { data, error } = await supabase.from(table).select(select).eq('id', id).single();
  if (error || !data) {
    console.error(`[checkout-authority] ${table} lookup failed:`, error?.message);
    throw checkoutError('Payment source record was not found', 404);
  }
  return data;
}

function getTrustedLocalAdPrice(priceMonthly, now = new Date()) {
  const basePrice = Number(priceMonthly);
  if (!Number.isFinite(basePrice) || basePrice <= 0) throw checkoutError('Ad space price is invalid', 409);
  if (now < new Date(LOCAL_AD_PROMO.endsAt)) {
    return Math.round(basePrice * (1 - LOCAL_AD_PROMO.discountPercent / 100));
  }
  return basePrice;
}

function requirePending(record) {
  if (record.payment_status && !['pending', 'pending_payment'].includes(record.payment_status)) {
    throw checkoutError('This payment record is no longer pending', 409);
  }
}

async function resolveCheckoutAuthority({ paymentType, metadata = {}, requestUser, supabaseClient, now = new Date() }) {
  if (paymentType === 'premium_subscription') {
    if (!requestUser) throw checkoutError('Authentication required for Premium checkout', 401);
    const premium = getTrustedPremiumCheckout();
    return {
      amountMinor: premium.amountMinor,
      currency: premium.currency,
      productName: 'Geobooker Premium - oferta de lanzamiento',
      customerEmail: requestUser.email,
      userId: requestUser.id,
      allowOxxo: true,
      metadata: {
        type: 'premium_subscription',
        userId: requestUser.id,
        user_id: requestUser.id,
        trial_months: premium.trialMonths
      }
    };
  }

  const supabase = supabaseClient || createServiceClient();

  if (paymentType === 'connect_launch_payment') {
    const campaignId = requireUuid(metadata.connect_campaign_id, 'Connect campaign');
    const campaign = await loadRecord(
      supabase,
      'connect_campaigns',
      'id, enterprise_lead_id, package_code, package_name, billing_email, payment_status, fulfillment_status',
      campaignId
    );
    requirePending(campaign);
    const selectedPackage = CONNECT_PACKAGES[campaign.package_code];
    if (!selectedPackage) throw checkoutError('Connect package is not available', 409);

    let lead = null;
    if (campaign.enterprise_lead_id) {
      lead = await loadRecord(
        supabase,
        'enterprise_leads',
        'id, company_name, contact_name, contact_phone, company_website, country, contact_email',
        campaign.enterprise_lead_id
      );
    }

    return {
      amountMinor: selectedPackage.priceMxn * 100,
      currency: 'mxn',
      productName: `${selectedPackage.name} - Reserva de lanzamiento`,
      customerEmail: campaign.billing_email,
      allowOxxo: false,
      metadata: {
        type: 'connect_launch_payment',
        connect_campaign_id: campaign.id,
        enterprise_lead_id: campaign.enterprise_lead_id || '',
        package_code: campaign.package_code,
        package_name: selectedPackage.name,
        reservation_price_mxn: selectedPackage.priceMxn,
        batch_size: selectedPackage.batchSize,
        billing_email: campaign.billing_email,
        billing_country: lead?.country || 'Mexico',
        company_name: lead?.company_name || '',
        contact_name: lead?.contact_name || '',
        contact_phone: lead?.contact_phone || '',
        company_website: lead?.company_website || ''
      }
    };
  }

  if (paymentType === 'enterprise_campaign') {
    const campaignId = requireUuid(metadata.campaign_id, 'Enterprise campaign');
    const campaign = await loadRecord(
      supabase,
      'ad_campaigns',
      'id, advertiser_name, advertiser_email, billing_country, currency, total_budget, total_with_iva, iva_amount, payment_status, status, notes',
      campaignId
    );
    requirePending(campaign);
    if (!String(campaign.notes || '').startsWith('Enterprise self-service draft.')) {
      throw checkoutError('Campaign is not a trusted Enterprise draft', 409);
    }

    const total = Number(campaign.total_with_iva)
      || (Number(campaign.total_budget || 0) + Number(campaign.iva_amount || 0));
    if (!Number.isFinite(total) || total < 50) throw checkoutError('Enterprise campaign price is invalid', 409);

    return {
      amountMinor: Math.round(total * 100),
      currency: 'usd',
      productName: `Geobooker Enterprise - ${campaign.advertiser_name}`,
      customerEmail: campaign.advertiser_email,
      allowOxxo: false,
      metadata: {
        type: 'enterprise_campaign',
        campaign_id: campaign.id,
        company: campaign.advertiser_name,
        advertiser_email: campaign.advertiser_email,
        billing_country: campaign.billing_country || 'US',
        total_budget: Number(campaign.total_budget || 0),
        iva_amount_usd: Number(campaign.iva_amount || 0),
        total_amount_usd: total
      }
    };
  }

  if (paymentType === 'ad_payment') {
    const campaignId = requireUuid(metadata.campaign_id || metadata.product_id, 'Ad campaign');
    const campaign = await loadRecord(
      supabase,
      'ad_campaigns',
      'id, ad_space_id, user_id, advertiser_name, advertiser_email, billing_country, payment_status, status, ad_spaces(id, name, display_name, price_monthly)',
      campaignId
    );
    requirePending(campaign);
    if (campaign.user_id && (!requestUser || requestUser.id !== campaign.user_id)) {
      throw checkoutError('Campaign does not belong to the authenticated user', 403);
    }

    const adSpace = Array.isArray(campaign.ad_spaces) ? campaign.ad_spaces[0] : campaign.ad_spaces;
    if (!adSpace || adSpace.id !== campaign.ad_space_id) throw checkoutError('Ad space could not be validated', 409);
    const subtotal = getTrustedLocalAdPrice(adSpace.price_monthly, now);
    const isMexico = String(campaign.billing_country || 'MX').toUpperCase() === 'MX';
    const iva = isMexico ? subtotal * 0.16 : 0;
    const total = subtotal + iva;

    return {
      amountMinor: Math.round(total * 100),
      currency: isMexico ? 'mxn' : 'usd',
      productName: `Geobooker Ads - ${adSpace.display_name || adSpace.name}`,
      customerEmail: campaign.advertiser_email,
      userId: requestUser?.id || null,
      allowOxxo: isMexico,
      metadata: {
        type: 'ad_payment',
        campaign_id: campaign.id,
        product_id: campaign.id,
        ad_space_id: adSpace.id,
        ad_space_name: adSpace.name,
        advertiser_email: campaign.advertiser_email,
        advertiser_name: campaign.advertiser_name,
        billing_country: isMexico ? 'MX' : campaign.billing_country,
        tax_status: isMexico ? 'domestic_mx' : 'export_0_iva',
        subtotal_mxn: isMexico ? subtotal : 0,
        iva_amount_mxn: isMexico ? iva : 0,
        total_amount_mxn: isMexico ? total : 0,
        total_amount_usd: isMexico ? 0 : total
      }
    };
  }

  throw checkoutError('Unsupported payment type');
}

module.exports = {
  CONNECT_PACKAGES,
  LOCAL_AD_PROMO,
  getTrustedLocalAdPrice,
  resolveCheckoutAuthority
};
