const { createClient } = require('@supabase/supabase-js');
const { bearerToken } = require('./_email-request-auth');

const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function json(statusCode, body) {
  return { statusCode, headers: responseHeaders, body: JSON.stringify(body) };
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeBreakdown(target, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  Object.entries(value).forEach(([key, count]) => {
    const normalizedKey = String(key || 'unknown').slice(0, 120);
    target[normalizedKey] = (target[normalizedKey] || 0) + number(count);
  });
}

function summarizeMetrics(rows = []) {
  const summary = {
    totalImpressions: 0,
    totalClicks: 0,
    ctr: 0,
    activeDays: 0,
    avgDailyImpressions: 0,
    byCountry: {},
    byCity: {},
    byDevice: {},
    byHour: {}
  };

  rows.forEach((row) => {
    summary.totalImpressions += number(row.impressions);
    summary.totalClicks += number(row.clicks);
    if (number(row.impressions) > 0 || number(row.clicks) > 0) summary.activeDays += 1;
    mergeBreakdown(summary.byCountry, row.views_by_country);
    mergeBreakdown(summary.byCity, row.views_by_city);
    mergeBreakdown(summary.byDevice, row.views_by_device);
    mergeBreakdown(summary.byHour, row.views_by_hour);
  });

  summary.ctr = summary.totalImpressions > 0
    ? Number(((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2))
    : 0;
  summary.avgDailyImpressions = summary.activeDays > 0
    ? Math.round(summary.totalImpressions / summary.activeDays)
    : 0;
  return summary;
}

function sanitizeCampaign(campaign) {
  const allowed = [
    'id', 'advertiser_name', 'headline', 'description', 'status', 'ad_level',
    'campaign_type', 'geographic_scope', 'target_location', 'target_country',
    'target_city', 'target_countries', 'target_cities', 'target_regions',
    'start_date', 'end_date', 'budget', 'total_budget', 'currency',
    'payment_method', 'payment_status', 'contract_number', 'promised_impressions',
    'created_at', 'updated_at'
  ];
  return Object.fromEntries(allowed.map((key) => [key, campaign?.[key] ?? null]));
}

async function authorize(event) {
  const token = bearerToken(event);
  if (!token) return { error: json(401, { error: 'authentication_required' }) };

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { error: json(503, { error: 'server_not_configured' }) };

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.email) return { error: json(401, { error: 'invalid_session' }) };

  const { data: adminUser } = await admin.from('admin_users').select('id').eq('id', data.user.id).maybeSingle();
  return { admin, user: data.user, isAdmin: Boolean(adminUser) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  const auth = await authorize(event);
  if (auth.error) return auth.error;

  let body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { error: 'invalid_json' }); }

  try {
    let campaignQuery = auth.admin.from('ad_campaigns').select('*').order('created_at', { ascending: false });
    if (body.campaignId) campaignQuery = campaignQuery.eq('id', body.campaignId).limit(1);
    else campaignQuery = campaignQuery.eq('advertiser_email', String(auth.user.email).toLowerCase());

    const { data: campaignRows, error: campaignError } = await campaignQuery;
    if (campaignError) throw campaignError;

    let campaigns = campaignRows || [];
    if (body.campaignId && campaigns.length > 0 && !auth.isAdmin) {
      campaigns = campaigns.filter((campaign) => String(campaign.advertiser_email || '').toLowerCase() === String(auth.user.email).toLowerCase());
    }
    if (body.campaignId && campaigns.length === 0) return json(404, { error: 'campaign_not_found' });

    const campaignIds = campaigns.map((campaign) => campaign.id).filter(Boolean);
    let metricRows = [];
    if (campaignIds.length > 0) {
      const { data, error } = await auth.admin
        .from('ad_campaign_metrics')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('date', { ascending: true });
      if (error) throw error;
      metricRows = data || [];
    }

    const items = campaigns.map((campaign) => {
      const daily = metricRows
        .filter((row) => row.campaign_id === campaign.id)
        .map((row) => ({
          date: row.date,
          impressions: number(row.impressions),
          clicks: number(row.clicks),
          ctr: number(row.impressions) > 0 ? Number(((number(row.clicks) / number(row.impressions)) * 100).toFixed(2)) : 0,
          viewsByCountry: row.views_by_country || {},
          viewsByCity: row.views_by_city || {},
          viewsByDevice: row.views_by_device || {},
          viewsByHour: row.views_by_hour || {}
        }));
      return { campaign: sanitizeCampaign(campaign), metrics: summarizeMetrics(metricRows.filter((row) => row.campaign_id === campaign.id)), daily };
    });

    return json(200, {
      success: true,
      generatedAt: new Date().toISOString(),
      timezone: 'UTC',
      methodology: 'Impresiones visibles y clics registrados por la plataforma. No representan ventas, personas únicas ni conversiones fuera de Geobooker.',
      ...(body.campaignId ? { report: items[0] } : { campaigns: items })
    });
  } catch (error) {
    console.error('[Advertiser report] Failed:', error.message);
    return json(500, { error: 'report_generation_failed' });
  }
};
