const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const ALLOWED_ORIGINS = new Set([
  'https://geobooker.com.mx',
  'https://www.geobooker.com.mx',
  'https://geobooker.com',
  'https://www.geobooker.com',
  'http://localhost:5173',
  'http://localhost:8888'
]);

const ENTERPRISE_PLANS = {
  city_launch: { name: 'City Launch', current_price_usd: 200, duration_months: 1, cities_included: 1, countries_included: 1 },
  regional: { name: 'Regional Pack', current_price_usd: 450, duration_months: 3, cities_included: 5, countries_included: 2 },
  country: { name: 'Country Select', current_price_usd: 600, duration_months: 3, cities_included: 12, countries_included: 1 },
  crossborder: { name: 'Cross-Border Event', current_price_usd: 750, duration_months: 3, cities_included: 30, countries_included: 3 },
  global_custom: { name: 'Global Custom', current_price_usd: 1000, duration_months: 3, cities_included: 999, countries_included: 999 }
};

const OPTIONAL_CAMPAIGN_COLUMNS = new Set([
  'notes',
  'campaign_type',
  'ad_level',
  'category_code',
  'target_cities',
  'target_countries',
  'billing_country',
  'client_tax_id',
  'tax_status',
  'total_with_iva',
  'iva_amount',
  'invoice_required',
  'invoice_status',
  'headline',
  'description',
  'cta_text',
  'cta_url',
  'creative_url',
  'multi_language_creatives'
]);

function getRequestOrigin(event) {
  return event.headers?.origin || event.headers?.Origin || '';
}

function getIpHash(event) {
  const ip = event.headers?.['x-nf-client-connection-ip'] || event.headers?.['client-ip'] || event.headers?.['x-forwarded-for'] || '';
  if (!ip) return null;
  return crypto.createHash('sha256').update(String(ip).split(',')[0].trim()).digest('hex');
}

async function recordSecurityEvent(supabase, event, payload = {}) {
  try {
    await supabase.from('security_events').insert({
      event_type: payload.event_type || 'enterprise_checkout_security_event',
      severity: payload.severity || 'warning',
      source: 'create-enterprise-campaign-draft',
      route: '/.netlify/functions/create-enterprise-campaign-draft',
      ip_hash: getIpHash(event),
      user_agent: event.headers?.['user-agent'] || event.headers?.['User-Agent'] || null,
      message: payload.message || null,
      metadata: {
        origin: getRequestOrigin(event) || null,
        ...payload.metadata
      }
    });
  } catch (error) {
    console.warn('[create-enterprise-campaign-draft] security event skipped:', error.message);
  }
}

function buildHeaders(event) {
  const origin = getRequestOrigin(event);
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://geobooker.com.mx';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(event, statusCode, body) {
  return { statusCode, headers: buildHeaders(event), body: JSON.stringify(body) };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeCountryCodes(value) {
  return normalizeArray(value)
    .map((code) => String(code || '').trim().toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code));
}

function cleanUrl(value) {
  const text = String(value || '').trim();
  if (!text || text === 'https://') return null;

  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function limitText(value, max = 160) {
  return String(value || '').trim().slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function calculatePricing(selectedPlan, durationMonths, billingCountry) {
  const plan = ENTERPRISE_PLANS[selectedPlan];
  if (!plan) return null;

  const months = Math.max(1, Math.min(12, Number(durationMonths || plan.duration_months || 1)));
  const planMonths = Math.max(1, Number(plan.duration_months || 1));
  const subtotalUsd = Math.round((Number(plan.current_price_usd || 0) / planMonths) * months);
  const ivaUsd = billingCountry === 'MX' ? Math.round(subtotalUsd * 0.16) : 0;

  return {
    plan,
    durationMonths: months,
    subtotalUsd,
    ivaUsd,
    totalUsd: subtotalUsd + ivaUsd
  };
}

function extractMissingColumn(error) {
  const message = String(error?.message || '');
  const schemaCacheMatch = message.match(/Could not find the '([^']+)' column/i);
  if (schemaCacheMatch?.[1]) return schemaCacheMatch[1];

  const postgresMatch = message.match(/column "([^"]+)" .*does not exist/i);
  return postgresMatch?.[1] || null;
}

async function insertCampaignWithSchemaFallback(supabase, initialPayload) {
  let payload = { ...initialPayload };
  const removedColumns = [];

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .insert(payload)
      .select()
      .single();

    if (!error) {
      return { campaign: data, removedColumns };
    }

    const missingColumn = extractMissingColumn(error);
    if (!missingColumn || !OPTIONAL_CAMPAIGN_COLUMNS.has(missingColumn) || !(missingColumn in payload)) {
      throw error;
    }

    console.warn('[create-enterprise-campaign-draft] Optional ad_campaigns column missing, retrying without:', missingColumn);
    const { [missingColumn]: _removed, ...nextPayload } = payload;
    payload = nextPayload;
    removedColumns.push(missingColumn);
  }

  throw new Error('Campaign draft could not be created after schema fallback attempts');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(event, 200, { message: 'OK' });
  if (event.httpMethod !== 'POST') return json(event, 405, { error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json(event, 500, { error: 'Campaign service is not configured' });
  }

  const supabaseForSecurity = createClient(SUPABASE_URL, SERVICE_KEY);
  const requestOrigin = getRequestOrigin(event);
  if (requestOrigin && !ALLOWED_ORIGINS.has(requestOrigin)) {
    await recordSecurityEvent(supabaseForSecurity, event, {
      event_type: 'blocked_enterprise_checkout_origin',
      severity: 'high',
      message: 'Blocked Enterprise checkout request from an unauthorized origin',
      metadata: { requestOrigin }
    });
    return json(event, 403, { error: 'Origin not allowed' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const companyName = limitText(payload.companyName, 120);
    const contactEmail = limitText(payload.contactEmail, 180).toLowerCase();
    const selectedPlan = String(payload.selectedPlan || '').trim();
    const billingCountry = String(payload.billingCountry || 'US').trim().toUpperCase();
    const targetCountries = normalizeCountryCodes(payload.targetCountries);
    const targetCities = normalizeArray(payload.targetCities).map((city) => limitText(city, 80)).slice(0, 999);
    const startDate = payload.startDate || new Date().toISOString().split('T')[0];
    const endDate = payload.endDate || startDate;
    const headline = limitText(payload.headline, 90);
    const description = limitText(payload.description, 260);
    const creativeUrl = cleanUrl(payload.creativeUrl);
    const creativeLanguage = String(payload.creativeLanguage || 'en').trim() || 'en';
    const ctaText = limitText(payload.ctaText || 'Learn More', 36) || 'Learn More';
    const ctaUrl = cleanUrl(payload.ctaUrl);
    const creativeFit = ['cover', 'contain'].includes(payload.creativeFit) ? payload.creativeFit : 'cover';
    const creativePosition = ['center', 'top', 'bottom', 'left', 'right'].includes(payload.creativePosition) ? payload.creativePosition : 'center';
    const termsVersion = String(payload.termsVersion || 'geobooker_commercial_terms_2026_v1').trim();
    const termsAcceptedAt = String(payload.termsAcceptedAt || '').trim();
    const reviewNotice = String(payload.reviewNotice || 'Review SLA: 12-72h.').trim();
    const pricing = calculatePricing(selectedPlan, payload.durationMonths, billingCountry);

    if (!companyName || !isEmail(contactEmail) || !selectedPlan) {
      return json(event, 400, { error: 'Company, valid email and plan are required' });
    }

    if (!pricing) {
      await recordSecurityEvent(supabaseForSecurity, event, {
        event_type: 'invalid_enterprise_plan_attempt',
        severity: 'warning',
        message: 'Enterprise checkout received an invalid plan code',
        metadata: { selectedPlan }
      });
      return json(event, 400, { error: 'Invalid Enterprise plan' });
    }

    if (!targetCountries.length || !targetCities.length) {
      return json(event, 400, { error: 'Please select at least one target country and city' });
    }

    if (pricing.plan.countries_included !== 999 && targetCountries.length > pricing.plan.countries_included) {
      return json(event, 400, { error: `This plan allows max ${pricing.plan.countries_included} target country/countries` });
    }

    if (pricing.plan.cities_included !== 999 && targetCities.length > pricing.plan.cities_included) {
      return json(event, 400, { error: `This plan allows max ${pricing.plan.cities_included} target city/cities` });
    }

    if (!headline || !creativeUrl) {
      return json(event, 400, { error: 'Headline and creative asset are required before payment' });
    }

    const parsedStart = new Date(`${startDate}T00:00:00Z`);
    const parsedEnd = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime()) || parsedEnd < parsedStart) {
      return json(event, 400, { error: 'Invalid campaign dates' });
    }

    const supabase = supabaseForSecurity;
    const taxStatus = billingCountry === 'MX' ? 'domestic_mx' : 'export_0_iva';
    const invoiceRequired = billingCountry === 'MX';

    const campaignInsert = {
      advertiser_name: companyName,
      advertiser_email: contactEmail,
      campaign_type: payload.campaignType || (payload.adLevel === 'global' ? 'global' : 'regional'),
      ad_level: payload.adLevel || 'city',
      category_code: payload.categoryCode || 'other',
      target_cities: targetCities,
      target_countries: targetCountries,
      billing_country: billingCountry,
      client_tax_id: payload.taxId || null,
      tax_status: taxStatus,
      total_budget: pricing.subtotalUsd,
      total_with_iva: pricing.totalUsd,
      iva_amount: pricing.ivaUsd,
      invoice_required: invoiceRequired,
      invoice_status: invoiceRequired ? 'pending' : 'not_required',
      currency: 'USD',
      status: 'draft',
      payment_status: 'pending',
      start_date: startDate,
      end_date: endDate,
      headline,
      description,
      cta_text: ctaText,
      cta_url: ctaUrl,
      creative_url: creativeUrl,
      multi_language_creatives: {
        [creativeLanguage]: {
          headline,
          description,
          cta_text: ctaText,
          cta_url: ctaUrl,
          image_url: creativeUrl,
          is_video: Boolean(payload.isVideo),
          display_fit: creativeFit,
          display_position: creativePosition
        }
      },
      notes: `Enterprise self-service draft. Plan: ${payload.selectedPlanName || pricing.plan.name || selectedPlan}. ${reviewNotice} Terms: ${termsVersion}${termsAcceptedAt ? ` accepted_at=${termsAcceptedAt}` : ''}. No guaranteed commercial results. Fiscal documentation subject to billing country.`
    };

    const { campaign, removedColumns } = await insertCampaignWithSchemaFallback(supabase, campaignInsert);

    const { error: creativeError } = await supabase.from('ad_creatives').insert({
      campaign_id: campaign.id,
      title: headline,
      description,
      image_url: creativeUrl,
      cta_text: ctaText,
      cta_url: ctaUrl,
      is_active: true
    });

    if (creativeError) {
      console.warn('[create-enterprise-campaign-draft] creative insert skipped:', creativeError.message);
    }

    if (payload.linkedLeadId) {
      const { error: leadError } = await supabase
        .from('enterprise_leads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', payload.linkedLeadId);

      if (leadError) {
        console.warn('[create-enterprise-campaign-draft] lead update skipped:', leadError.message);
      }
    }

    return json(event, 200, {
      success: true,
      campaign,
      trustedPricing: {
        subtotalUsd: pricing.subtotalUsd,
        ivaUsd: pricing.ivaUsd,
        totalUsd: pricing.totalUsd,
        durationMonths: pricing.durationMonths,
        currency: 'usd'
      },
      schemaFallback: removedColumns
    });
  } catch (error) {
    console.error('[create-enterprise-campaign-draft] error:', error);
    return json(event, 500, { error: error.message || 'Unexpected campaign draft error' });
  }
};
