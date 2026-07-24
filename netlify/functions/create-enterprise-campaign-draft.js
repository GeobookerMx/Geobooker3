const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function cleanUrl(value) {
  const text = String(value || '').trim();
  if (!text || text === 'https://') return null;
  return text;
}

function toMoney(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { message: 'OK' });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json(500, { error: 'Campaign service is not configured' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const companyName = String(payload.companyName || '').trim();
    const contactEmail = String(payload.contactEmail || '').trim().toLowerCase();
    const selectedPlan = String(payload.selectedPlan || '').trim();
    const billingCountry = String(payload.billingCountry || 'US').trim().toUpperCase();
    const targetCountries = normalizeArray(payload.targetCountries);
    const targetCities = normalizeArray(payload.targetCities);
    const startDate = payload.startDate || new Date().toISOString().split('T')[0];
    const endDate = payload.endDate || startDate;
    const subtotalUsd = toMoney(payload.subtotalUsd);
    const ivaUsd = toMoney(payload.ivaUsd);
    const totalUsd = toMoney(payload.totalUsd) || subtotalUsd + ivaUsd;
    const headline = String(payload.headline || '').trim();
    const description = String(payload.description || '').trim();
    const creativeUrl = cleanUrl(payload.creativeUrl);
    const creativeLanguage = String(payload.creativeLanguage || 'en').trim() || 'en';
    const ctaText = String(payload.ctaText || 'Learn More').trim() || 'Learn More';
    const ctaUrl = cleanUrl(payload.ctaUrl);
    const creativeFit = ['cover', 'contain'].includes(payload.creativeFit) ? payload.creativeFit : 'cover';
    const creativePosition = ['center', 'top', 'bottom', 'left', 'right'].includes(payload.creativePosition) ? payload.creativePosition : 'center';
    const termsVersion = String(payload.termsVersion || 'geobooker_commercial_terms_2026_v1').trim();
    const termsAcceptedAt = String(payload.termsAcceptedAt || '').trim();
    const reviewNotice = String(payload.reviewNotice || 'Review SLA: 12-72h.').trim();

    if (!companyName || !contactEmail || !selectedPlan) {
      return json(400, { error: 'Company, email and plan are required' });
    }

    if (!targetCountries.length || !targetCities.length) {
      return json(400, { error: 'Please select at least one target country and city' });
    }

    if (!headline || !creativeUrl) {
      return json(400, { error: 'Headline and creative asset are required before payment' });
    }

    if (!subtotalUsd || !totalUsd) {
      return json(400, { error: 'Invalid campaign amount' });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
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
      total_budget: subtotalUsd,
      total_with_iva: totalUsd,
      iva_amount: ivaUsd,
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
      notes: `Enterprise self-service draft. Plan: ${payload.selectedPlanName || selectedPlan}. ${reviewNotice} Terms: ${termsVersion}${termsAcceptedAt ? ` accepted_at=${termsAcceptedAt}` : ''}. No guaranteed commercial results. Fiscal documentation subject to billing country.`
    };

    const { data: campaign, error: campaignError } = await supabase
      .from('ad_campaigns')
      .insert(campaignInsert)
      .select()
      .single();

    if (campaignError) {
      console.error('[create-enterprise-campaign-draft] campaign insert error:', campaignError);
      return json(500, { error: campaignError.message || 'Campaign draft could not be created' });
    }

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

    return json(200, { success: true, campaign });
  } catch (error) {
    console.error('[create-enterprise-campaign-draft] error:', error);
    return json(500, { error: error.message || 'Unexpected campaign draft error' });
  }
};
