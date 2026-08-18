const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { getCorsHeaders, handlePreflight, rejectUnauthorizedOrigin } = require('./_cors');
const { enforceRateLimit } = require('./_rate-limit');
const { CONNECT_PACKAGES } = require('./_checkout-authority');

function cleanText(value, max) {
  return String(value || '').trim().slice(0, max);
}

function cleanWebsite(value) {
  const input = cleanText(value, 300);
  if (!input) return null;
  try {
    const url = new URL(input);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

exports.handler = async (event) => {
  const preflight = handlePreflight(event);
  if (preflight) return preflight;

  const headers = getCorsHeaders(event);
  const originError = rejectUnauthorizedOrigin(event);
  if (originError) return originError;
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const rateLimitError = await enforceRateLimit(event, {
    action: 'create_connect_reservation',
    maxCalls: 3,
    windowSeconds: 600,
    headers
  });
  if (rateLimitError) return rateLimitError;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Reservation service not configured' }) };
  }

  let leadId = null;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const payload = JSON.parse(event.body || '{}');
    const selectedPackage = CONNECT_PACKAGES[String(payload.packageCode || '')];
    const companyName = cleanText(payload.companyName, 120);
    const contactName = cleanText(payload.contactName, 120);
    const contactEmail = cleanText(payload.contactEmail, 180).toLowerCase();
    const contactPhone = cleanText(payload.contactPhone, 40);
    const targetAudience = cleanText(payload.targetAudience, 1000);
    const objective = cleanText(payload.objective, 1000);
    const country = cleanText(payload.country || 'Mexico', 80) || 'Mexico';
    const website = cleanWebsite(payload.companyWebsite);
    const termsVersion = cleanText(payload.termsVersion, 120);

    if (!selectedPackage) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Connect package is invalid' }) };
    }
    if (!companyName || !isEmail(contactEmail) || !targetAudience || !objective) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Company, email, audience and objective are required' }) };
    }
    if (payload.companyWebsite && !website) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Company website must use HTTPS' }) };
    }
    if (payload.termsAccepted !== true || !termsVersion) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Commercial terms must be accepted' }) };
    }

    leadId = crypto.randomUUID();
    const campaignId = crypto.randomUUID();
    const acceptedAt = new Date().toISOString();
    const packageCode = String(payload.packageCode);
    const metadata = {
      service_line: 'geobooker_connect',
      lead_type: 'connect_launch_checkout',
      package_code: packageCode,
      package_name: selectedPackage.name,
      target_audience: targetAudience,
      objective,
      company_website: website,
      reservation_price_mxn: selectedPackage.priceMxn,
      batch_size: selectedPackage.batchSize,
      terms_version: termsVersion,
      terms_accepted_at: acceptedAt,
      invoice_required: true
    };

    const { error: leadError } = await supabase.from('enterprise_leads').insert({
      id: leadId,
      company_name: companyName,
      contact_name: contactName || null,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      country,
      industry: 'Geobooker Connect',
      company_website: website,
      selected_plan: selectedPackage.name,
      target_cities: targetAudience,
      budget_range: `${selectedPackage.priceMxn} MXN launch reservation`,
      service_line: 'geobooker_connect',
      intake_source: 'connect_checkout',
      launch_offer_code: packageCode,
      pricing_snapshot: {
        reservation_price_mxn: selectedPackage.priceMxn,
        package_code: packageCode,
        package_name: selectedPackage.name
      },
      message: JSON.stringify(metadata),
      status: 'new'
    });
    if (leadError) throw leadError;

    const { error: campaignError } = await supabase.from('connect_campaigns').insert({
      id: campaignId,
      enterprise_lead_id: leadId,
      package_code: packageCode,
      package_name: selectedPackage.name,
      campaign_objective: objective,
      target_audience: targetAudience,
      batch_size: selectedPackage.batchSize,
      launch_price_mxn: selectedPackage.priceMxn,
      billing_email: contactEmail,
      payment_status: 'pending',
      fulfillment_status: 'intake',
      metadata
    });
    if (campaignError) throw campaignError;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ success: true, leadId, campaignId, packageCode })
    };
  } catch (error) {
    console.error('[create-connect-reservation] Error:', error.message);
    if (leadId) {
      const { error: cleanupError } = await supabase.from('enterprise_leads').delete().eq('id', leadId);
      if (cleanupError) console.error('[create-connect-reservation] Lead cleanup failed:', cleanupError.message);
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Connect reservation could not be created' })
    };
  }
};
