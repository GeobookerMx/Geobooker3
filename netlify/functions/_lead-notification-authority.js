const { createClient } = require('@supabase/supabase-js');

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(String(value || ''));
}

async function loadEnterpriseLead(leadId, dependencies = {}) {
  if (!validUuid(leadId)) {
    const error = new Error('invalid_lead_id');
    error.statusCode = 400;
    throw error;
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const error = new Error('server_not_configured');
    error.statusCode = 503;
    throw error;
  }
  const makeClient = dependencies.createClient || createClient;
  const client = makeClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client
    .from('enterprise_leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();
  if (error || !data) {
    const lookupError = new Error('lead_not_found');
    lookupError.statusCode = 404;
    throw lookupError;
  }
  return data;
}

module.exports = { loadEnterpriseLead, validUuid };
