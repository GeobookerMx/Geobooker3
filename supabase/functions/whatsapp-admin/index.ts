import { createClient } from 'npm:@supabase/supabase-js@2.83.0';

const ALLOWED_ORIGINS = new Set([
  'https://www.geobooker.com.mx',
  'https://geobooker.com.mx',
  'http://localhost:5173'
]);

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

function cors(origin: string | null) {
  const configured = (Deno.env.get('WHATSAPP_ALLOWED_ORIGINS') || '')
    .split(',').map((value) => value.trim()).filter(Boolean);
  const allowed = new Set([...ALLOWED_ORIGINS, ...configured]);
  if (!origin || !allowed.has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(status: number, body: Record<string, unknown>, headers: Record<string, string> | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(headers || {}) }
  });
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

const WHATSAPP_CAMPAIGN_GOALS = new Set([
  'business_registration',
  'geobooker_ads',
  'enterprise_ads',
  'strategic_partnership',
  'meeting_request',
  'proposal_followup',
  'app_growth'
]);

function safeFailureDetail(value: unknown) {
  if (!value) return null;
  return String(value).replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]').slice(0, 500);
}

function maskPhone(value: unknown) {
  const normalized = String(value || '').replace(/\s+/g, '');
  if (normalized.length < 6) return '***';
  return `${normalized.slice(0, 3)}${'*'.repeat(Math.min(8, normalized.length - 7))}${normalized.slice(-4)}`;
}

function safeMetaResponseDetail(value: unknown) {
  if (!value) return null;
  try {
    return JSON.stringify(value)
      .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
      .replace(/"value"\s*:\s*"[^"]+"/gi, '"value":"[redacted]"')
      .replace(/"api_key"\s*:\s*"[^"]+"/gi, '"api_key":"[redacted]"')
      .replace(/"access_token"\s*:\s*"[^"]+"/gi, '"access_token":"[redacted]"')
      .slice(0, 1200);
  } catch {
    return safeFailureDetail(value);
  }
}

function requiredMetaEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Meta configuration missing: ${name}`);
  return value;
}

function humanMetaError(code: string | number | null, message: string | null) {
  const normalized = String(code || '').toUpperCase();
  if (['190', 'TOKEN_INVALID', 'INVALID_OAUTH_ACCESS_TOKEN'].includes(normalized)) {
    return 'WhatsApp necesita volver a autorizarse con Meta.';
  }
  if (normalized === '10' || normalized === '200') {
    return 'El System User Token no tiene los permisos necesarios para esta operación.';
  }
  if (normalized === '100') return 'Meta rechazó un identificador o parámetro de configuración.';
  return safeFailureDetail(message) || 'No fue posible validar la conexión con Meta.';
}

async function metaGet(path: string, accessToken: string, graphVersion: string) {
  const normalizedPath = path.replace(/^\/+/, '');
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${normalizedPath}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    const error = new Error(humanMetaError(data?.error?.code, data?.error?.message));
    Object.assign(error, { providerCode: data?.error?.code || response.status, httpStatus: response.status });
    throw error;
  }
  return data;
}

async function metaPost(path: string, body: Record<string, unknown>, accessToken: string, graphVersion: string) {
  const normalizedPath = path.replace(/^\/+/, '');
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${normalizedPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    const error = new Error(humanMetaError(data?.error?.code, data?.error?.message));
    Object.assign(error, {
      providerCode: data?.error?.code || response.status,
      providerSubcode: data?.error?.error_subcode || null,
      providerMessage: data?.error?.message || null,
      providerResponse: data,
      httpStatus: response.status
    });
    throw error;
  }
  return data;
}

async function metaAgentRequest(method: 'GET' | 'POST' | 'DELETE', path: string, accessToken: string, body?: Record<string, unknown>) {
  const normalizedPath = path.replace(/^\/+/, '');
  const response = await fetch(`https://api.facebook.com/${normalizedPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Version': '2.0.0'
    },
    body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
    signal: AbortSignal.timeout(20_000)
  });
  const responseText = await response.text();
  let data: Record<string, any> = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw_text: responseText };
    }
  }
  if (!response.ok || data?.error) {
    const error = new Error(humanMetaError(data?.error?.code, data?.error?.message));
    Object.assign(error, {
      providerCode: data?.error?.code || response.status,
      providerSubcode: data?.error?.error_subcode || null,
      providerMessage: data?.error?.message || null,
      providerResponse: data,
      providerStatusText: response.statusText || null,
      httpStatus: response.status
    });
    throw error;
  }
  return data;
}

async function metaAgentUploadFile(path: string, accessToken: string, file: File, fileName: string) {
  const normalizedPath = path.replace(/^\/+/, '');
  const form = new FormData();
  form.append('file_name', fileName);
  form.append('file', file, fileName);
  const response = await fetch(`https://api.facebook.com/${normalizedPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'X-API-Version': '2.0.0'
    },
    body: form,
    signal: AbortSignal.timeout(30_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    const error = new Error(humanMetaError(data?.error?.code, data?.error?.message));
    Object.assign(error, {
      providerCode: data?.error?.code || response.status,
      providerSubcode: data?.error?.error_subcode || null,
      httpStatus: response.status
    });
    throw error;
  }
  return data;
}

async function checkMetaConnection() {
  const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
  const graphVersion = requiredMetaEnv('META_GRAPH_API_VERSION');
  const wabaId = requiredMetaEnv('WHATSAPP_BUSINESS_ACCOUNT_ID');
  const phoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
  const results = await Promise.allSettled([
    metaGet('me?fields=id,name', accessToken, graphVersion),
    metaGet('me/permissions?limit=100', accessToken, graphVersion),
    metaGet(`${encodeURIComponent(wabaId)}?fields=id,name,currency,timezone_id`, accessToken, graphVersion),
    metaGet(`${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type`, accessToken, graphVersion),
    metaGet(`${encodeURIComponent(wabaId)}/subscribed_apps?fields=id,name,link`, accessToken, graphVersion),
    metaGet(`${encodeURIComponent(wabaId)}/subscribed_apps`, accessToken, graphVersion),
    metaGet(`${encodeURIComponent(wabaId)}?fields=account_review_status,business_verification_status,health_status,whatsapp_business_manager_messaging_limit,primary_funding_id`, accessToken, graphVersion)
  ]);
  const [identityResult, permissionsResult, wabaResult, phoneResult, subscriptionResult, subscriptionFallbackResult, wabaReadinessResult] = results;
  const identity = identityResult.status === 'fulfilled' ? identityResult.value : null;
  const permissionsResponse = permissionsResult.status === 'fulfilled' ? permissionsResult.value : null;
  const waba = wabaResult.status === 'fulfilled' ? wabaResult.value : null;
  const wabaReadiness = wabaReadinessResult.status === 'fulfilled' ? wabaReadinessResult.value : null;
  const phone = phoneResult.status === 'fulfilled' ? phoneResult.value : null;
  const subscriptions = [
    ...(subscriptionResult.status === 'fulfilled' && Array.isArray(subscriptionResult.value?.data) ? subscriptionResult.value.data : []),
    ...(subscriptionFallbackResult.status === 'fulfilled' && Array.isArray(subscriptionFallbackResult.value?.data) ? subscriptionFallbackResult.value.data : [])
  ];
  const subscribedApps = normalizeSubscribedApps(subscriptions);
  const geobookerApp = subscribedApps.find((app: Record<string, any>) => /^geobooker$/i.test(String(app?.name || '').trim())) || null;
  const webhookApp = geobookerApp || subscribedApps[0] || null;
  const anySubscribedApp = subscribedApps.length > 0;
  let webhookFields = {
    accessible: false,
    active: false,
    messages: false,
    callbackMatches: false
  };
  let webhookFieldsError = null;
  if (webhookApp?.id && Deno.env.get('META_APP_SECRET')) {
    try {
      const appAccessToken = `${webhookApp.id}|${requiredMetaEnv('META_APP_SECRET')}`;
      const appSubscriptions = await metaGet(
        `${encodeURIComponent(webhookApp.id)}/subscriptions?fields=object,callback_url,fields,active`,
        appAccessToken,
        graphVersion
      );
      const whatsappSubscription = (appSubscriptions?.data || []).find(
        (subscription: Record<string, any>) => subscription?.object === 'whatsapp_business_account'
      );
      const fieldNames = (whatsappSubscription?.fields || []).map(
        (field: string | Record<string, any>) => typeof field === 'string' ? field : field?.name
      );
      const expectedCallback = `${requiredEnv('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
      webhookFields = {
        accessible: true,
        active: whatsappSubscription?.active !== false && Boolean(whatsappSubscription),
        messages: fieldNames.includes('messages'),
        callbackMatches: String(whatsappSubscription?.callback_url || '').replace(/\/$/, '') === expectedCallback.replace(/\/$/, '')
      };
    } catch (error) {
      webhookFieldsError = {
        component: 'webhook_fields',
        code: String(error?.providerCode || error?.name || 'META_WEBHOOK_CHECK_FAILED'),
        message: humanMetaError(error?.providerCode || null, error?.message || null)
      };
    }
  }
  const permissionMap = Object.fromEntries((permissionsResponse?.data || []).map((permission: { permission: string; status: string }) => [permission.permission, permission.status]));
  const requiredPermissions = ['business_management', 'whatsapp_business_messaging', 'whatsapp_business_management'];
  const errors = results.flatMap((result, index) => result.status === 'rejected' ? [{
    component: ['token', 'permissions', 'waba', 'phone', 'subscription', 'subscription_fallback', 'waba_readiness'][index],
    code: String(result.reason?.providerCode || result.reason?.name || 'META_CHECK_FAILED'),
    message: humanMetaError(result.reason?.providerCode || null, result.reason?.message || null)
  }] : []);
  if (webhookFieldsError) errors.push(webhookFieldsError);
  return {
    graphVersion,
    token: { valid: Boolean(identity?.id), subjectType: 'system_user' },
    permissions: Object.fromEntries(requiredPermissions.map((permission) => [permission, permissionMap[permission] === 'granted'])),
    waba: {
      id: waba?.id || null,
      accessible: Boolean(waba?.id),
      name: waba?.name || null,
      currency: waba?.currency || null,
      timezoneId: waba?.timezone_id ?? null,
      accountReviewStatus: wabaReadiness?.account_review_status || null,
      businessVerificationStatus: wabaReadiness?.business_verification_status || null,
      healthStatus: wabaReadiness?.health_status || null,
      messagingLimit: wabaReadiness?.whatsapp_business_manager_messaging_limit || null,
      fundingConfigured: Boolean(wabaReadiness?.primary_funding_id),
      commercialReadinessAccessible: wabaReadinessResult.status === 'fulfilled'
    },
    phone: {
      id: phone?.id || null,
      accessible: Boolean(phone?.id),
      displayPhoneNumber: phone?.display_phone_number || null,
      verifiedName: phone?.verified_name || null,
      qualityRating: phone?.quality_rating || null,
      verificationStatus: phone?.code_verification_status || null,
      platformType: phone?.platform_type || null
    },
    subscription: {
      accessible: subscriptionResult.status === 'fulfilled' || subscriptionFallbackResult.status === 'fulfilled',
      subscribed: anySubscribedApp,
      appCount: subscribedApps.length,
      appName: geobookerApp?.name || subscribedApps[0]?.name || null,
      geobookerNameMatched: Boolean(geobookerApp),
      apps: subscribedApps.map((app: Record<string, any>) => ({
        id: app.id || null,
        name: app.name || null,
        callbackOverrideConfigured: Boolean(app.overrideCallbackUri),
        callbackOverrideMatches: String(app.overrideCallbackUri || '').replace(/\/$/, '') === `${requiredEnv('SUPABASE_URL')}/functions/v1/whatsapp-webhook`.replace(/\/$/, ''),
        isGeobooker: app.isGeobooker === true,
        isMetaBusinessAgent: app.isMetaBusinessAgent === true,
        expectedRole: app.isGeobooker === true
          ? 'cloud_api'
          : app.isMetaBusinessAgent === true ? 'meta_business_agent' : 'unknown'
      })),
      messagesSubscribed: webhookFields.messages,
      webhookConfigurationAccessible: webhookFields.accessible,
      webhookActive: webhookFields.active,
      callbackMatches: webhookFields.callbackMatches
    },
    errors,
    checkedAt: new Date().toISOString()
  };
}

function normalizeTemplateStatus(providerStatus: unknown) {
  const normalized = String(providerStatus || 'PENDING').toLowerCase();
  return ['pending', 'approved', 'rejected', 'paused', 'disabled', 'deleted'].includes(normalized) ? normalized : 'pending';
}

function templateVariables(components: unknown) {
  const matches = JSON.stringify(components || []).match(/{{\s*\d+\s*}}/g) || [];
  return [...new Set(matches.map((value) => value.replace(/\s/g, '')))];
}

const CORE_TEMPLATE_NAMES = new Set([
  'gb_optin_confirm_es_mx',
  'gb_business_registration_help_es_mx',
  'gb_ads_requested_info_es_mx',
  'gb_business_invitation_es_mx',
  'gb_ads_followup_es_mx',
  'gb_app_download_es_mx',
  'gb_optin_confirm_en_us',
  'gb_business_registration_help_en_us',
  'gb_ads_requested_info_en_us',
  'gb_business_invitation_en_us',
  'gb_ads_followup_en_us',
  'gb_app_download_en_us'
]);

function templateGovernance(nameValue: unknown, languageValue: unknown, statusValue: unknown, qualityValue: unknown) {
  const name = String(nameValue || '').trim().toLowerCase();
  const language = String(languageValue || '').trim().replace('-', '_').toLowerCase();
  const approved = String(statusValue || '').toLowerCase() === 'approved';
  const notes: string[] = [];
  let reconciliationStatus = 'unreviewed';

  if (!approved) notes.push('STATUS_NOT_APPROVED');
  if (!qualityValue) notes.push('QUALITY_PENDING');

  const localeMismatch = (name.endsWith('_es_mx') && language !== 'es_mx')
    || (name.endsWith('_en_us') && !['en', 'en_us'].includes(language));
  if (localeMismatch) notes.push('LOCALE_MISMATCH');

  const nameMismatch = name === 'gb_ads_requested_info_en_u' || /_en_u$/.test(name);
  if (nameMismatch) notes.push('NAME_MISMATCH');

  const legacy = name === 'gb_ads_requested_info' || name === 'hello_world';
  if (legacy) notes.push('LEGACY');

  let templateFamily = 'GLOBAL';
  if (name.includes('registration') || name.includes('business_invitation')) templateFamily = 'BUSINESS_ACQUISITION';
  else if (name.includes('app_download')) templateFamily = 'APP_GROWTH';
  else if (name.includes('ads_')) templateFamily = 'ADS_ENTERPRISE';
  else if (name.includes('account') || name.includes('optin')) templateFamily = 'ACCOUNT';
  else if (name.includes('premium')) templateFamily = 'PREMIUM';
  else if (name.includes('b2b')) templateFamily = 'B2B';
  else if (name.includes('library')) templateFamily = 'LIBRARY';
  else if (name.includes('spaces')) templateFamily = 'SPACES';
  else if (name.includes('recommend')) templateFamily = 'RECOMMENDATION';
  else if (name.includes('reactivation')) templateFamily = 'REACTIVATION';

  let campaignRole = 'extended';
  if (name.includes('optin_confirm')) campaignRole = 'consent_confirmation';
  else if (name.includes('registration_help')) campaignRole = 'registration_help';
  else if (name.includes('ads_requested_info')) campaignRole = 'requested_ads_info';
  else if (name.includes('business_invitation')) campaignRole = 'business_invitation';
  else if (name.includes('ads_followup') || name.includes('ads_intro')) campaignRole = 'ads_nurture';
  else if (name.includes('app_download')) campaignRole = 'app_download';

  if (!approved) reconciliationStatus = 'status_not_approved';
  else if (localeMismatch) reconciliationStatus = 'locale_mismatch';
  else if (nameMismatch) reconciliationStatus = 'name_mismatch';
  else if (legacy) reconciliationStatus = 'legacy';
  else if (CORE_TEMPLATE_NAMES.has(name)) {
    reconciliationStatus = 'ready_for_campaign';
    notes.push('READY_FOR_CAMPAIGN');
  } else reconciliationStatus = 'pass';

  return {
    template_family: templateFamily,
    campaign_role: campaignRole,
    reconciliation_status: reconciliationStatus,
    reconciliation_notes: [...new Set(notes)]
  };
}

function templateComponentMetadata(componentsValue: unknown) {
  const components = Array.isArray(componentsValue) ? componentsValue : [];
  const component = (type: string) => components.find((entry: any) => String(entry?.type || '').toUpperCase() === type);
  const header = component('HEADER');
  const body = component('BODY');
  const footer = component('FOOTER');
  const buttons = component('BUTTONS');
  const examples = components.reduce((result: Record<string, unknown>, entry: any) => {
    if (entry?.example) result[String(entry?.type || 'UNKNOWN').toLowerCase()] = entry.example;
    return result;
  }, {});
  return {
    header_text: typeof header?.text === 'string' ? header.text : null,
    body_text: typeof body?.text === 'string' ? body.text : null,
    footer_text: typeof footer?.text === 'string' ? footer.text : null,
    buttons_json: Array.isArray(buttons?.buttons) ? buttons.buttons : [],
    variable_count: templateVariables(components).length,
    variable_examples: examples
  };
}

async function templateSnapshotHash(template: Record<string, any>) {
  const snapshot = JSON.stringify({
    id: template?.id || null,
    name: template?.name || null,
    language: template?.language || null,
    status: template?.status || null,
    category: template?.category || null,
    quality_score: template?.quality_score || null,
    components: template?.components || []
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshot));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function metaErrorResult(error: any) {
  return {
    accessible: false,
    httpStatus: error?.httpStatus || null,
    code: String(error?.providerCode || error?.name || 'META_CHECK_FAILED'),
    subcode: error?.providerSubcode || null,
    message: humanMetaError(error?.providerCode || null, error?.providerMessage || error?.message || null),
    rawMessage: safeFailureDetail(error?.providerMessage || error?.message || null),
    rawResponse: safeMetaResponseDetail(error?.providerResponse || null)
  };
}

function normalizeSubscribedApps(rows: any[] = []) {
  const apps = rows.map((entry: Record<string, any>) => ({
    ...(entry?.whatsapp_business_api_data || entry),
    overrideCallbackUri: entry?.override_callback_uri || null
  }))
    .filter(Boolean)
    .map((app: Record<string, any>) => ({
      id: app?.id ? String(app.id) : null,
      name: app?.name || null,
      link: app?.link || null,
      overrideCallbackUri: app?.overrideCallbackUri || null,
      isGeobooker: /^geobooker$/i.test(String(app?.name || '').trim()),
      isMetaBusinessAgent: /^business agent$/i.test(String(app?.name || '').trim())
    }))
    .filter((app) => app.id || app.name);
  return [...new Map(apps.map((app) => [app.id || `name:${String(app.name).toLowerCase()}`, app])).values()];
}

const AGENT_ALLOWED_WEBSITE_URLS = [
  'https://geobooker.com.mx/',
  'https://geobooker.com.mx/advertise',
  'https://geobooker.com.mx/download'
];

const AGENT_INCLUDED_URL_PATTERNS = [
  'https://geobooker.com.mx/',
  'https://geobooker.com.mx/advertise*',
  'https://geobooker.com.mx/download*'
];

const AGENT_EXCLUDED_URL_PATTERNS = [
  'https://geobooker.com.mx/admin*',
  'https://geobooker.com.mx/auth*',
  'https://geobooker.com.mx/auth/callback*',
  'https://geobooker.com.mx/api*',
  'https://geobooker.com.mx/dashboard*',
  'https://geobooker.com.mx/business/dashboard*',
  'https://geobooker.com.mx/reset-password*'
];

const AGENT_FILE_DOCUMENT_TYPES = new Set([
  'institutional_one_pager',
  'ads_media_kit',
  'business_registration_guide',
  'features_benefits',
  'official_faq',
  'premium_confirmed',
  'support_escalation_policy',
  'geobooker_leads_official'
]);

const AGENT_FILE_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const AGENT_FILE_FORBIDDEN_NAME_PATTERNS = [
  /crm2?_contacts/i,
  /lead/i,
  /prospect/i,
  /secret/i,
  /token/i,
  /password/i,
  /contrase/i,
  /pin/i,
  /supabase/i,
  /meta_app_secret/i,
  /\.csv$/i,
  /\.xlsx?$/i
];

const AGENT_CONNECTOR_ACTIONS = [
  { action: 'create_lead', mutation: true, initialStatus: 'blocked', permission: 'lead.write.scoped' },
  { action: 'update_lead', mutation: true, initialStatus: 'blocked', permission: 'lead.update.scoped' },
  { action: 'request_human_handoff', mutation: true, initialStatus: 'prepared', permission: 'handoff.create.scoped' },
  { action: 'register_advertising_interest', mutation: true, initialStatus: 'blocked', permission: 'interest.advertising.write.scoped' },
  { action: 'register_business_interest', mutation: true, initialStatus: 'blocked', permission: 'interest.business.write.scoped' },
  { action: 'register_strategic_partner_interest', mutation: true, initialStatus: 'blocked', permission: 'interest.partner.write.scoped' },
  { action: 'record_opt_out', mutation: true, initialStatus: 'prepared', permission: 'consent.opt_out.write.scoped' },
  { action: 'get_business_registration_status', mutation: false, initialStatus: 'prepared', permission: 'business.status.read.scoped' }
];

function connectorFlags() {
  return {
    connectorEnabled: Deno.env.get('META_BUSINESS_AGENT_CONNECTOR_ENABLED') === 'true',
    mutationsEnabled: Deno.env.get('META_BUSINESS_AGENT_MUTATIONS_ENABLED') === 'true',
    safetyActionsEnabled: Deno.env.get('META_BUSINESS_AGENT_SAFETY_ACTIONS_ENABLED') === 'true',
    sendingEnabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true',
    connectorSecretPresent: Boolean(Deno.env.get('META_BUSINESS_AGENT_CONNECTOR_SECRET')),
    entityId: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || null
  };
}

function sanitizeMetaBusinessAgentConnector(connector: Record<string, any>) {
  const sync = connector?.mcp_tool_sync || connector?.mcpToolSync || {};
  const tools = Array.isArray(connector?.tools) ? connector.tools : Array.isArray(sync?.tools) ? sync.tools : [];
  return {
    connectorId: connector?.id || connector?.connector_id || null,
    name: connector?.name || connector?.display_name || null,
    baseUrl: connector?.base_url || connector?.baseUrl || connector?.url || null,
    connectorProtocol: connector?.connector_protocol || connector?.connectorProtocol || null,
    authType: connector?.auth_type || connector?.authType || connector?.authentication?.type || null,
    connectionStatus: {
      status: connector?.connection_status?.status || connector?.connectionStatus?.status || connector?.status || null,
      errorMessage: safeFailureDetail(connector?.connection_status?.error_message || connector?.connectionStatus?.errorMessage || connector?.error_message)
    },
    mcpToolSync: {
      status: sync?.status || null,
      lastAttemptedAt: sync?.last_attempted_at || sync?.lastAttemptedAt || null,
      lastSuccessfulAt: sync?.last_successful_at || sync?.lastSuccessfulAt || null,
      fingerprint: sync?.fingerprint || null,
      toolCount: sync?.tool_count ?? sync?.toolCount ?? tools.length ?? null
    },
    tools: tools.map((tool: Record<string, any>) => ({
      name: tool?.name || tool?.tool_name || null,
      title: tool?.title || tool?.display_name || null,
      description: safeFailureDetail(tool?.description)
    })).filter((tool: Record<string, any>) => tool.name || tool.title)
  };
}

function extractMetaBusinessAgentConnectors(response: any) {
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.root)
      ? response.root
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.connectors)
          ? response.connectors
          : [];
  return rows.map(sanitizeMetaBusinessAgentConnector);
}

function sanitizeAgentWebsiteSource(source: Record<string, any>) {
  return {
    id: source?.id ? String(source.id) : null,
    url: source?.url || source?.website_url || null,
    crawlStatus: source?.crawl_status || source?.status || null,
    pagesCrawled: source?.pages_crawled ?? source?.pages_count ?? null,
    crawlError: safeFailureDetail(source?.crawl_error || source?.error || source?.last_error),
    robotsBlocked: Boolean(source?.robots_blocked || source?.blocked_by_robots_txt),
    lastCrawledAt: source?.last_crawled_at || source?.updated_time || source?.updated_at || null
  };
}

function sanitizeAgentFileSource(source: Record<string, any>) {
  return {
    providerFileId: source?.id || source?.file_id || source?.provider_file_id || null,
    fileName: source?.file_name || source?.name || null,
    status: source?.status || source?.processing_status || null,
    uploadedAt: source?.uploaded_at || source?.created_time || source?.created_at || null,
    updatedAt: source?.updated_at || source?.updated_time || null,
    error: safeFailureDetail(source?.error || source?.last_error || source?.processing_error)
  };
}

function hasForbiddenAgentFileName(fileName: string) {
  return AGENT_FILE_FORBIDDEN_NAME_PATTERNS.some((pattern) => pattern.test(fileName));
}

async function sha256Hex(file: File) {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function readRobotsStatus() {
  try {
    const response = await fetch('https://geobooker.com.mx/robots.txt', {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(8_000)
    });
    const text = await response.text();
    return {
      accessible: response.ok,
      httpStatus: response.status,
      blocksAdmin: /Disallow:\s*\/admin/i.test(text),
      blocksAuth: /Disallow:\s*\/auth/i.test(text),
      blocksApi: /Disallow:\s*\/api/i.test(text),
      blocksRoot: /Disallow:\s*\/\s*$/im.test(text)
    };
  } catch (error) {
    return {
      accessible: false,
      httpStatus: null,
      error: safeFailureDetail(error?.message || error)
    };
  }
}

function normalizePhoneNumber(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function sanitizeTemplate(template: Record<string, any>) {
  return {
    id: template?.id ? String(template.id) : null,
    name: template?.name || null,
    language: template?.language || null,
    status: template?.status || null,
    category: template?.category || null,
    qualityScore: typeof template?.quality_score === 'object'
      ? template.quality_score?.score || null
      : template?.quality_score || null
  };
}

function sanitizePhoneNumber(phone: Record<string, any>, targetPhoneNumberId: string, targetDisplayDigits: string) {
  const displayDigits = normalizePhoneNumber(phone?.display_phone_number);
  return {
    id: phone?.id ? String(phone.id) : null,
    displayPhoneNumber: phone?.display_phone_number || null,
    verifiedName: phone?.verified_name || null,
    qualityRating: phone?.quality_rating || null,
    codeVerificationStatus: phone?.code_verification_status || null,
    platformType: phone?.platform_type || null,
    idMatch: String(phone?.id || '') === targetPhoneNumberId,
    displayMatch: Boolean(targetDisplayDigits && displayDigits.endsWith(targetDisplayDigits.slice(-10))),
    verifiedNameMatch: /^geobooker$/i.test(String(phone?.verified_name || '').trim())
  };
}

async function inspectWaba(
  wabaId: string,
  accessToken: string,
  graphVersion: string,
  targetPhoneNumberId: string,
  targetDisplayPhone: string
) {
  const targetDisplayDigits = normalizePhoneNumber(targetDisplayPhone);
  const baseFields = 'id,name,currency,timezone_id,account_review_status,business_verification_status,health_status,whatsapp_business_manager_messaging_limit,primary_funding_id';
  const results = await Promise.allSettled([
    metaGet(`${encodeURIComponent(wabaId)}?fields=${baseFields}`, accessToken, graphVersion),
    metaGet(`${encodeURIComponent(wabaId)}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type&limit=100`, accessToken, graphVersion),
    metaGet(`${encodeURIComponent(wabaId)}/message_templates?fields=id,name,language,status,category,quality_score&limit=100`, accessToken, graphVersion),
    metaGet(`${encodeURIComponent(wabaId)}/subscribed_apps?fields=id,name,link`, accessToken, graphVersion),
    metaGet(`${encodeURIComponent(wabaId)}/subscribed_apps`, accessToken, graphVersion)
  ]);
  const [wabaResult, phoneResult, templatesResult, subscriptionResult, subscriptionFallbackResult] = results;
  const waba = wabaResult.status === 'fulfilled' ? wabaResult.value : null;
  const phoneNumbers = phoneResult.status === 'fulfilled' && Array.isArray(phoneResult.value?.data)
    ? phoneResult.value.data.map((phone: Record<string, any>) => sanitizePhoneNumber(phone, targetPhoneNumberId, targetDisplayDigits))
    : [];
  const templates = templatesResult.status === 'fulfilled' && Array.isArray(templatesResult.value?.data)
    ? templatesResult.value.data.map(sanitizeTemplate)
    : [];
  const subscribedApps = normalizeSubscribedApps([
    ...(subscriptionResult.status === 'fulfilled' && Array.isArray(subscriptionResult.value?.data) ? subscriptionResult.value.data : []),
    ...(subscriptionFallbackResult.status === 'fulfilled' && Array.isArray(subscriptionFallbackResult.value?.data) ? subscriptionFallbackResult.value.data : [])
  ]);
  const matchingPhone = phoneNumbers.find((phone: Record<string, any>) => phone.idMatch) || null;
  return {
    wabaId,
    accessible: wabaResult.status === 'fulfilled' && Boolean(waba?.id),
    waba: waba ? {
      id: waba.id || null,
      name: waba.name || null,
      currency: waba.currency || null,
      timezoneId: waba.timezone_id ?? null,
      accountReviewStatus: waba.account_review_status || null,
      businessVerificationStatus: waba.business_verification_status || null,
      healthStatus: waba.health_status || null,
      messagingLimit: waba.whatsapp_business_manager_messaging_limit || null,
      fundingConfigured: Boolean(waba.primary_funding_id)
    } : null,
    phoneNumbersAccessible: phoneResult.status === 'fulfilled',
    phoneNumberCount: phoneNumbers.length,
    phoneNumbers,
    targetPhoneFound: Boolean(matchingPhone),
    targetPhone: matchingPhone,
    templatesAccessible: templatesResult.status === 'fulfilled',
    templateCount: templates.length,
    templates,
    subscribedAppsAccessible: subscriptionResult.status === 'fulfilled' || subscriptionFallbackResult.status === 'fulfilled',
    subscribedAppsCount: subscribedApps.length,
    appSubscribed: subscribedApps.length > 0,
    geobookerSubscribed: subscribedApps.some((app: Record<string, any>) => app.isGeobooker),
    subscribedApps,
    errors: [
      wabaResult.status === 'rejected' ? { component: 'waba', ...metaErrorResult(wabaResult.reason) } : null,
      phoneResult.status === 'rejected' ? { component: 'phone_numbers', ...metaErrorResult(phoneResult.reason) } : null,
      templatesResult.status === 'rejected' ? { component: 'message_templates', ...metaErrorResult(templatesResult.reason) } : null,
      subscriptionResult.status === 'rejected' ? { component: 'subscribed_apps', ...metaErrorResult(subscriptionResult.reason) } : null,
      subscriptionFallbackResult.status === 'rejected' ? { component: 'subscribed_apps_fallback', ...metaErrorResult(subscriptionFallbackResult.reason) } : null
    ].filter(Boolean)
  };
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  const corsHeaders = cors(origin);
  if (origin && !corsHeaders) return json(403, { error: 'origin_not_allowed' }, null);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders || {} });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, corsHeaders);

  try {
    const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearer) return json(401, { error: 'authentication_required' }, corsHeaders);

    const admin = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: authData, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !authData.user) return json(401, { error: 'invalid_session' }, corsHeaders);
    const { data: adminUser } = await admin.from('admin_users').select('id,role').eq('id', authData.user.id).maybeSingle();
    if (!adminUser) return json(403, { error: 'admin_required' }, corsHeaders);

    let body: Record<string, unknown> = {};
    let uploadedFile: File | null = null;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      for (const [key, value] of form.entries()) {
        if (key === 'file' && value instanceof File) {
          uploadedFile = value;
        } else if (typeof value === 'string') {
          body[key] = value;
        }
      }
    } else {
      const rawBody = await request.text();
      if (rawBody.length > 20_000) return json(413, { error: 'payload_too_large' }, corsHeaders);
      try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { return json(400, { error: 'invalid_json' }, corsHeaders); }
    }
    const action = String(body.action || 'health');
    const crm = admin.schema('crm');

    if (action === 'health') {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const [
        webhook, incoming, outgoing, openConversations, messageMetrics,
        dueFollowups, templates, failedMessage, waba, phone, templateSync, outboundJobs, oldestDueJob, dbProbe,
        pilotBudget, marketingFrequency, rateCards
      ] = await Promise.all([
        crm.from('webhook_events').select('received_at,processing_status,last_error,signature_verified').order('received_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('messages').select('provider_timestamp,created_at,provider_metadata').eq('direction', 'inbound').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('messages').select('provider_timestamp,created_at').eq('direction', 'outbound').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('conversations').select('*', { count: 'exact', head: true }).in('status', ['open', 'snoozed']),
        crm.rpc('whatsapp_health_message_metrics', { p_since: today.toISOString() }),
        crm.from('tasks').select('*', { count: 'exact', head: true }).eq('task_type', 'whatsapp').in('status', ['pending', 'in_progress']).lte('due_at', new Date().toISOString()),
        crm.from('whatsapp_templates').select('approval_status,enabled_for_campaigns'),
        crm.from('messages').select('failure_code,failure_detail,updated_at').eq('current_status', 'failed').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('whatsapp_business_accounts')
          .select('status,display_name,provider_business_account_id')
          .eq('provider_business_account_id', Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID') || '')
          .maybeSingle(),
        crm.from('whatsapp_phone_numbers')
          .select('status,provider_phone_number_id,display_phone_number,verified_name,quality_rating')
          .eq('provider_phone_number_id', Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '')
          .maybeSingle(),
        crm.from('audit_log').select('new_values,occurred_at').eq('action', 'whatsapp.templates.sync').order('occurred_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('outbound_jobs').select('status'),
        crm.from('outbound_jobs').select('id,status,scheduled_at,next_attempt_at,attempt_count,max_attempts').in('status', ['pending', 'retry']).order('next_attempt_at', { ascending: true, nullsFirst: false }).order('scheduled_at', { ascending: true }).limit(1).maybeSingle(),
        crm.from('conversations').select('id').limit(1),
        crm.from('budget_policies')
          .select('policy_name,currency,daily_limit,monthly_limit,daily_message_limit,warning_percent,high_warning_percent,hard_block_percent,timezone_name,is_active,kill_switch,updated_at')
          .eq('policy_name', 'geobooker_whatsapp_pilot_mx_v1')
          .maybeSingle(),
        crm.from('messaging_frequency_policies')
          .select('policy_name,minimum_interval_minutes,max_messages_24h,max_messages_7d,max_messages_30d,is_active,kill_switch,updated_at')
          .eq('channel', 'whatsapp')
          .eq('purpose', 'marketing')
          .eq('policy_name', 'geobooker_whatsapp_marketing_v1')
          .maybeSingle(),
        crm.from('whatsapp_rate_cards').select('status,country_code,category')
      ]);
      if (dbProbe.error) throw dbProbe.error;
      const safetyReadError = pilotBudget.error || marketingFrequency.error || rateCards.error || messageMetrics.error;
      if (safetyReadError) throw safetyReadError;
      const templateCounts = (templates.data || []).reduce((result: Record<string, number>, row: { approval_status: string }) => {
        result[row.approval_status] = (result[row.approval_status] || 0) + 1;
        return result;
      }, {});
      const queueCounts = (outboundJobs.data || []).reduce((result: Record<string, number>, row: { status: string }) => {
        result[row.status] = (result[row.status] || 0) + 1;
        return result;
      }, {});
      const rateCardCounts = (rateCards.data || []).reduce((result: Record<string, number>, row: { status: string }) => {
        result[row.status] = (result[row.status] || 0) + 1;
        return result;
      }, {});
      const enabledTemplateCount = (templates.data || []).filter((row: { enabled_for_campaigns?: boolean }) =>
        row.enabled_for_campaigns === true
      ).length;
      const samplePayloadsAllowed = Deno.env.get('WHATSAPP_ALLOW_META_TEST_PAYLOADS') === 'true';
      let metaConnection = null;
      let metaError = null;
      try {
        metaConnection = await checkMetaConnection();
        if (metaConnection.errors?.length) {
          metaError = { code: metaConnection.errors[0].code, message: metaConnection.errors[0].message };
        }
      } catch (error) {
        metaError = {
          code: String(error?.providerCode || error?.name || 'META_CONNECTION_FAILED'),
          message: humanMetaError(error?.providerCode || null, error?.message || null)
        };
      }
      const metaDiagnostic = metaConnection ? {
        result: metaConnection.token?.valid ? 'checked' : 'failed',
        waba_id_match: String(metaConnection.waba?.id || '') === String(Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID') || ''),
        phone_number_id_match: String(metaConnection.phone?.id || '') === String(Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || ''),
        geobooker_app_subscribed: metaConnection.subscription?.subscribed === true,
        messages_subscribed: metaConnection.subscription?.messagesSubscribed === true,
        webhook_active: metaConnection.subscription?.webhookActive === true,
        callback_matches: metaConnection.subscription?.callbackMatches === true,
        account_review_status: metaConnection.waba?.accountReviewStatus || null,
        business_verification_status: metaConnection.waba?.businessVerificationStatus || null,
        funding_configured: metaConnection.waba?.fundingConfigured === true,
        commercial_readiness_accessible: metaConnection.waba?.commercialReadinessAccessible === true,
        messaging_limit: metaConnection.waba?.messagingLimit || null,
        sending_enabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true',
        checked_at: metaConnection.checkedAt
      } : {
        result: 'failed',
        sending_enabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true',
        checked_at: new Date().toISOString()
      };
      await crm.from('audit_log').insert({
        actor_user_id: authData.user.id,
        actor_type: 'user',
        action: 'whatsapp.health.check',
        entity_type: 'whatsapp_integration',
        new_values: metaDiagnostic
      });
      return json(200, {
        mode: phone.data?.status === 'active' && metaConnection?.phone?.platformType === 'CLOUD_API'
          ? 'production'
          : phone.data?.status === 'test' ? 'test' : 'production_unverified',
        configured: {
          metaAppSecret: Boolean(Deno.env.get('META_APP_SECRET')),
          wabaId: Boolean(Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID')),
          phoneNumberId: Boolean(Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')),
          verifyToken: Boolean(Deno.env.get('WHATSAPP_VERIFY_TOKEN')),
          accessToken: Boolean(Deno.env.get('WHATSAPP_ACCESS_TOKEN')),
          twoStepPin: /^\d{6}$/.test(Deno.env.get('WHATSAPP_TWO_STEP_PIN') || ''),
          graphApiVersion: Boolean(Deno.env.get('META_GRAPH_API_VERSION')),
          sendingEnabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true',
          testSendingEnabled: Deno.env.get('WHATSAPP_TEST_SEND_ENABLED') === 'true',
          samplePayloadsAllowed
        },
        graphApiVersion: Deno.env.get('META_GRAPH_API_VERSION') || null,
        meta: metaConnection,
        metaError,
        database: { operational: true },
        commercialSafety: {
          pilotBudget: pilotBudget.data || null,
          marketingFrequency: marketingFrequency.data || null,
          rateCards: {
            total: (rateCards.data || []).length,
            active: rateCardCounts.active || 0,
            draft: rateCardCounts.draft || 0,
            inactive: rateCardCounts.inactive || 0
          },
          campaignTemplates: {
            approved: templateCounts.approved || 0,
            enabled: enabledTemplateCount
          }
        },
        waba: waba.data || null,
        phone: phone.data || null,
        webhook: webhook.data ? {
          lastReceivedAt: webhook.data.received_at,
          status: webhook.data.processing_status,
          signatureVerified: webhook.data.signature_verified,
          lastError: safeFailureDetail(webhook.data.last_error)
        } : null,
        metrics: {
          messagesToday: messageMetrics.data?.[0]?.real_messages || 0,
          sampleMessagesToday: messageMetrics.data?.[0]?.sample_messages || 0,
          realInboundToday: messageMetrics.data?.[0]?.real_inbound || 0,
          realOutboundToday: messageMetrics.data?.[0]?.real_outbound || 0,
          sampleInboundToday: messageMetrics.data?.[0]?.sample_inbound || 0,
          sampleOutboundToday: messageMetrics.data?.[0]?.sample_outbound || 0,
          openConversations: openConversations.count || 0,
          followupsDue: dueFollowups.count || 0,
          outboundQueue: {
            pending: queueCounts.pending || 0,
            processing: queueCounts.processing || 0,
            retry: queueCounts.retry || 0,
            accepted: queueCounts.accepted || 0,
            unknown: queueCounts.unknown || 0,
            failed: queueCounts.failed || 0,
            deadLetter: queueCounts.dead_letter || 0,
            oldestDueAt: oldestDueJob.data?.next_attempt_at || oldestDueJob.data?.scheduled_at || null
          },
          lastIncomingAt: incoming.data?.provider_timestamp || incoming.data?.created_at || null,
          lastIncomingIsTest: incoming.data?.provider_metadata?.is_test === true,
          lastOutgoingAt: outgoing.data?.provider_timestamp || outgoing.data?.created_at || null,
          templates: templateCounts
        },
        templatesSync: templateSync.data ? {
          lastSyncedAt: templateSync.data.occurred_at,
          result: templateSync.data.new_values?.result || 'unknown',
          count: templateSync.data.new_values?.template_count || 0,
          error: safeFailureDetail(templateSync.data.new_values?.error)
        } : null,
        lastMessageError: failedMessage.data ? {
          code: failedMessage.data.failure_code,
          detail: safeFailureDetail(failedMessage.data.failure_detail),
          occurredAt: failedMessage.data.updated_at
        } : null
      }, corsHeaders);
    }

    if (action === 'subscribe_waba') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'subscription_requires_sending_disabled' }, corsHeaders);
      }

      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const graphVersion = requiredMetaEnv('META_GRAPH_API_VERSION');
      const wabaId = requiredMetaEnv('WHATSAPP_BUSINESS_ACCOUNT_ID');
      if (String(body.confirmWabaId || '') !== wabaId) {
        return json(409, { error: 'subscription_scope_confirmation_mismatch' }, corsHeaders);
      }

      try {
        const permissionsResponse = await metaGet('me/permissions?limit=100', accessToken, graphVersion);
        const permissionMap = Object.fromEntries((permissionsResponse?.data || []).map(
          (permission: { permission: string; status: string }) => [permission.permission, permission.status]
        ));
        if (permissionMap.whatsapp_business_management !== 'granted') {
          return json(409, { error: 'whatsapp_business_management_permission_required' }, corsHeaders);
        }

        const before = await metaGet(`${encodeURIComponent(wabaId)}/subscribed_apps`, accessToken, graphVersion);
        const alreadySubscribed = Array.isArray(before?.data) && before.data.length > 0;
        if (!alreadySubscribed) {
          const subscribeResponse = await metaPost(
            `${encodeURIComponent(wabaId)}/subscribed_apps`,
            {},
            accessToken,
            graphVersion
          );
          if (subscribeResponse?.success !== true) throw new Error('meta_waba_subscription_not_confirmed');
        }

        const after = await metaGet(`${encodeURIComponent(wabaId)}/subscribed_apps`, accessToken, graphVersion);
        const appCount = Array.isArray(after?.data) ? after.data.length : 0;
        if (appCount < 1) throw new Error('meta_waba_subscription_missing_after_update');

        await crm.from('audit_log').insert({
          actor_user_id: authData.user.id,
          actor_type: 'user',
          action: 'whatsapp.waba.subscribe',
          entity_type: 'whatsapp_business_account',
          new_values: {
            result: 'success',
            provider_business_account_id: wabaId,
            app_count: appCount,
            already_subscribed: alreadySubscribed,
            sending_enabled: false
          }
        });

        return json(200, {
          success: true,
          subscribed: true,
          alreadySubscribed,
          appCount,
          wabaId,
          sendingEnabled: false
        }, corsHeaders);
      } catch (error) {
        await crm.from('audit_log').insert({
          actor_user_id: authData.user.id,
          actor_type: 'user',
          action: 'whatsapp.waba.subscribe',
          entity_type: 'whatsapp_business_account',
          new_values: {
            result: 'failed',
            provider_business_account_id: wabaId,
            error_code: String(error?.providerCode || error?.name || 'SUBSCRIPTION_FAILED'),
            error: safeFailureDetail(error?.message),
            sending_enabled: false
          }
        });
        return json(409, {
          error: 'waba_subscription_failed',
          providerCode: String(error?.providerCode || error?.name || 'SUBSCRIPTION_FAILED'),
          httpStatus: Number(error?.httpStatus || 0) || null,
          message: safeFailureDetail(error?.message)
        }, corsHeaders);
      }
    }

    if (action === 'configure_webhook_override') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'webhook_override_requires_sending_disabled' }, corsHeaders);
      }

      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const graphVersion = requiredMetaEnv('META_GRAPH_API_VERSION');
      const wabaId = requiredMetaEnv('WHATSAPP_BUSINESS_ACCOUNT_ID');
      const verifyToken = requiredMetaEnv('WHATSAPP_VERIFY_TOKEN');
      const callbackUrl = `${requiredEnv('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
      if (String(body.confirmWabaId || '') !== wabaId) {
        return json(409, { error: 'webhook_override_scope_confirmation_mismatch' }, corsHeaders);
      }

      try {
        const permissionsResponse = await metaGet('me/permissions?limit=100', accessToken, graphVersion);
        const permissionMap = Object.fromEntries((permissionsResponse?.data || []).map(
          (permission: { permission: string; status: string }) => [permission.permission, permission.status]
        ));
        if (permissionMap.whatsapp_business_management !== 'granted') {
          return json(409, { error: 'whatsapp_business_management_permission_required' }, corsHeaders);
        }

        const result = await metaPost(
          `${encodeURIComponent(wabaId)}/subscribed_apps`,
          { override_callback_uri: callbackUrl, verify_token: verifyToken },
          accessToken,
          graphVersion
        );
        const after = await metaGet(`${encodeURIComponent(wabaId)}/subscribed_apps`, accessToken, graphVersion);
        const rows = Array.isArray(after?.data) ? after.data : [];
        const expected = callbackUrl.replace(/\/$/, '');
        const callbackConfirmed = rows.some(
          (entry: Record<string, any>) => String(entry?.override_callback_uri || '').replace(/\/$/, '') === expected
        );
        const providerAccepted = result?.success === true || Array.isArray(result?.data);
        if (!providerAccepted || !callbackConfirmed) throw new Error('meta_webhook_override_not_confirmed');

        await crm.from('audit_log').insert({
          actor_user_id: authData.user.id,
          actor_type: 'user',
          action: 'whatsapp.webhook.override.configure',
          entity_type: 'whatsapp_business_account',
          new_values: {
            result: 'success',
            provider_business_account_id: wabaId,
            callback_host: new URL(callbackUrl).host,
            callback_path: new URL(callbackUrl).pathname,
            sending_enabled: false
          }
        });

        return json(200, {
          success: true,
          callbackConfirmed: true,
          callbackUrl,
          wabaId,
          sendingEnabled: false
        }, corsHeaders);
      } catch (error) {
        await crm.from('audit_log').insert({
          actor_user_id: authData.user.id,
          actor_type: 'user',
          action: 'whatsapp.webhook.override.configure',
          entity_type: 'whatsapp_business_account',
          new_values: {
            result: 'failed',
            provider_business_account_id: wabaId,
            error_code: String(error?.providerCode || error?.name || 'WEBHOOK_OVERRIDE_FAILED'),
            error: safeFailureDetail(error?.message),
            sending_enabled: false
          }
        });
        return json(409, {
          error: 'webhook_override_failed',
          providerCode: String(error?.providerCode || error?.name || 'WEBHOOK_OVERRIDE_FAILED'),
          providerSubcode: error?.providerSubcode || null,
          httpStatus: Number(error?.httpStatus || 0) || null,
          message: safeFailureDetail(error?.message),
          providerMessage: safeFailureDetail(error?.providerMessage)
        }, corsHeaders);
      }
    }

    if (action === 'register_phone') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'registration_requires_sending_disabled' }, corsHeaders);
      }

      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const graphVersion = requiredMetaEnv('META_GRAPH_API_VERSION');
      const wabaId = requiredMetaEnv('WHATSAPP_BUSINESS_ACCOUNT_ID');
      const phoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const twoStepPin = requiredMetaEnv('WHATSAPP_TWO_STEP_PIN');
      const confirmedWabaId = String(body.confirmWabaId || '');
      const confirmedPhoneNumberId = String(body.confirmPhoneNumberId || '');

      if (!/^\d{6}$/.test(twoStepPin)) {
        return json(409, { error: 'two_step_pin_not_configured' }, corsHeaders);
      }
      if (confirmedWabaId !== wabaId || confirmedPhoneNumberId !== phoneNumberId) {
        return json(409, { error: 'registration_scope_confirmation_mismatch' }, corsHeaders);
      }

      let localPhoneId: string | null = null;
      try {
        const [permissionsResponse, waba, wabaPhonesBefore] = await Promise.all([
          metaGet('me/permissions?limit=100', accessToken, graphVersion),
          metaGet(`${encodeURIComponent(wabaId)}?fields=id,name,currency,timezone_id`, accessToken, graphVersion),
          metaGet(`${encodeURIComponent(wabaId)}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type`, accessToken, graphVersion)
        ]);
        const permissionMap = Object.fromEntries((permissionsResponse?.data || []).map(
          (permission: { permission: string; status: string }) => [permission.permission, permission.status]
        ));
        if (permissionMap.whatsapp_business_messaging !== 'granted') {
          return json(409, { error: 'whatsapp_business_messaging_permission_required' }, corsHeaders);
        }
        if (String(waba?.id || '') !== wabaId) {
          return json(409, { error: 'waba_scope_mismatch' }, corsHeaders);
        }
        const phoneBefore = (wabaPhonesBefore?.data || []).find(
          (phone: { id?: string }) => String(phone.id || '') === phoneNumberId
        );
        if (!phoneBefore) {
          return json(409, { error: 'phone_not_associated_with_configured_waba' }, corsHeaders);
        }

        const registerResponse = await metaPost(
          `${encodeURIComponent(phoneNumberId)}/register`,
          { messaging_product: 'whatsapp', pin: twoStepPin },
          accessToken,
          graphVersion
        );
        if (registerResponse?.success !== true) {
          throw new Error('meta_registration_not_confirmed');
        }

        const [phoneAfter, wabaAfter, wabaPhonesAfter] = await Promise.all([
          metaGet(`${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type`, accessToken, graphVersion),
          metaGet(`${encodeURIComponent(wabaId)}?fields=id,name,currency,timezone_id`, accessToken, graphVersion),
          metaGet(`${encodeURIComponent(wabaId)}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type`, accessToken, graphVersion)
        ]);
        const phoneInWaba = (wabaPhonesAfter?.data || []).some(
          (phone: { id?: string }) => String(phone.id || '') === phoneNumberId
        );
        if (String(phoneAfter?.id || '') !== phoneNumberId || String(wabaAfter?.id || '') !== wabaId || !phoneInWaba) {
          throw new Error('post_registration_scope_verification_failed');
        }

        const { data: localWaba, error: localWabaError } = await crm
          .from('whatsapp_business_accounts')
          .upsert({
            provider: 'meta_cloud',
            provider_business_account_id: wabaId,
            display_name: wabaAfter?.name || 'Geobooker',
            status: 'active'
          }, { onConflict: 'provider_business_account_id' })
          .select('id')
          .single();
        if (localWabaError || !localWaba) throw new Error('crm_waba_update_failed');

        const normalizedPhone = String(phoneAfter?.display_phone_number || '').replace(/[^\d+]/g, '') || null;
        const { data: localPhone, error: localPhoneError } = await crm
          .from('whatsapp_phone_numbers')
          .upsert({
            business_account_id: localWaba.id,
            provider_phone_number_id: phoneNumberId,
            display_phone_number: phoneAfter?.display_phone_number || null,
            normalized_phone: normalizedPhone,
            verified_name: phoneAfter?.verified_name || null,
            quality_rating: phoneAfter?.quality_rating || null,
            status: 'active'
          }, { onConflict: 'provider_phone_number_id' })
          .select('id')
          .single();
        if (localPhoneError || !localPhone) throw new Error('crm_phone_update_failed');
        localPhoneId = localPhone.id;

        await crm.from('audit_log').insert({
          actor_user_id: authData.user.id,
          actor_type: 'user',
          action: 'whatsapp.phone.register',
          entity_type: 'whatsapp_phone_number',
          entity_id: localPhone.id,
          new_values: {
            result: 'success',
            provider_phone_number_id: phoneNumberId,
            provider_business_account_id: wabaId,
            platform_type: phoneAfter?.platform_type || null,
            code_verification_status: phoneAfter?.code_verification_status || null,
            sending_enabled: false
          }
        });

        return json(200, {
          success: true,
          meta: { success: true },
          phone: {
            id: phoneAfter.id,
            displayPhoneNumber: phoneAfter.display_phone_number || null,
            verifiedName: phoneAfter.verified_name || null,
            qualityRating: phoneAfter.quality_rating || null,
            verificationStatus: phoneAfter.code_verification_status || null,
            platformType: phoneAfter.platform_type || null,
            registeredInCloudApi: true
          },
          waba: { id: wabaAfter.id, name: wabaAfter.name || null },
          crm: { phoneStatus: 'active', environment: 'production' },
          sendingEnabled: false
        }, corsHeaders);
      } catch (error) {
        await crm.from('audit_log').insert({
          actor_user_id: authData.user.id,
          actor_type: 'user',
          action: 'whatsapp.phone.register',
          entity_type: 'whatsapp_phone_number',
          entity_id: localPhoneId,
          new_values: {
            result: 'failed',
            provider_phone_number_id: phoneNumberId,
            provider_business_account_id: wabaId,
            error_code: String(error?.providerCode || error?.name || 'REGISTRATION_FAILED'),
            error: safeFailureDetail(error?.message),
            sending_enabled: false
          }
        });
        return json(409, {
          error: 'phone_registration_failed',
          providerCode: String(error?.providerCode || error?.name || 'REGISTRATION_FAILED'),
          httpStatus: Number(error?.httpStatus || 0) || null,
          message: safeFailureDetail(error?.message)
        }, corsHeaders);
      }
    }

    if (action === 'inbox') {
      const page = clampInteger(body.page, 0, 0, 10_000);
      const pageSize = clampInteger(body.pageSize, 25, 1, 50);
      const status = ['open', 'snoozed', 'closed', 'blocked'].includes(String(body.status)) ? String(body.status) : null;
      let query = crm.from('conversations')
        .select('id,contact_id,contact_point_id,account_id,status,priority,assigned_agent_id,last_inbound_at,last_outbound_at,last_message_at,service_window_expires_at,provider_wa_id', { count: 'exact' })
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (status) query = query.eq('status', status);
      const { data: conversations, error, count } = await query;
      if (error) throw error;
      const contactIds = [...new Set((conversations || []).map((row) => row.contact_id))];
      const pointIds = [...new Set((conversations || []).map((row) => row.contact_point_id))];
      const accountIds = [...new Set((conversations || []).map((row) => row.account_id).filter(Boolean))];
      const conversationIds = (conversations || []).map((row) => row.id);
      const [contacts, points, accounts, messages, permissions, suppressions, reads] = await Promise.all([
        contactIds.length ? crm.from('contacts').select('id,full_name,job_title,country_code,contact_status,assigned_owner_id').in('id', contactIds) : { data: [] },
        pointIds.length ? crm.from('contact_points').select('id,normalized_value,validation_status').in('id', pointIds) : { data: [] },
        accountIds.length ? crm.from('accounts').select('id,display_name,industry,country_code,region,city,source_tier,assigned_owner_id').in('id', accountIds) : { data: [] },
        conversationIds.length ? crm.from('messages').select('id,conversation_id,direction,message_type,body_text,current_status,created_at,provider_timestamp').in('conversation_id', conversationIds).order('created_at', { ascending: false }) : { data: [] },
        contactIds.length ? crm.from('channel_permissions').select('contact_id,purpose,status,consent_source,consented_at,opted_out_at').in('contact_id', contactIds).eq('channel', 'whatsapp') : { data: [] },
        pointIds.length ? crm.from('suppressions').select('contact_point_id,reason,status').in('contact_point_id', pointIds).eq('status', 'active') : { data: [] },
        conversationIds.length ? crm.from('conversation_reads').select('conversation_id,last_read_at').eq('user_id', authData.user.id).in('conversation_id', conversationIds) : { data: [] }
      ]);
      const byId = (rows: any[] = []) => Object.fromEntries(rows.map((row) => [row.id, row]));
      const contactMap = byId(contacts.data || []);
      const pointMap = byId(points.data || []);
      const accountMap = byId(accounts.data || []);
      const readMap = Object.fromEntries((reads.data || []).map((row) => [row.conversation_id, row.last_read_at]));
      const latestMessages: Record<string, unknown> = {};
      for (const message of messages.data || []) if (!latestMessages[message.conversation_id]) latestMessages[message.conversation_id] = message;
      const rows = (conversations || []).map((conversation) => ({
        ...conversation,
        contact: contactMap[conversation.contact_id] || null,
        contactPoint: pointMap[conversation.contact_point_id] || null,
        account: conversation.account_id ? accountMap[conversation.account_id] || null : null,
        lastMessage: latestMessages[conversation.id] || null,
        permissions: (permissions.data || []).filter((row) => row.contact_id === conversation.contact_id),
        suppressed: (suppressions.data || []).some((row) => row.contact_point_id === conversation.contact_point_id),
        unread: Boolean(conversation.last_inbound_at && (!readMap[conversation.id] || new Date(conversation.last_inbound_at) > new Date(readMap[conversation.id])))
      }));
      const search = String(body.search || '').trim().toLocaleLowerCase().slice(0, 100);
      const filtered = search ? rows.filter((row) => [row.contact?.full_name, row.account?.display_name, row.contactPoint?.normalized_value]
        .some((value) => String(value || '').toLocaleLowerCase().includes(search))) : rows;
      return json(200, { rows: filtered, total: search ? filtered.length : count || 0, page, pageSize }, corsHeaders);
    }

    if (action === 'conversation') {
      const conversationId = String(body.conversationId || '');
      if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return json(400, { error: 'invalid_conversation_id' }, corsHeaders);
      const limit = clampInteger(body.limit, 50, 1, 100);
      const { data: conversation, error } = await crm.from('conversations').select('*').eq('id', conversationId).single();
      if (error || !conversation) return json(404, { error: 'conversation_not_found' }, corsHeaders);
      const [messages, contact, point, account, permissions, suppressions, activities] = await Promise.all([
        crm.from('messages').select('id,direction,message_type,body_text,content,current_status,provider_timestamp,created_at,updated_at,failure_code,failure_detail,template_id,initiated_by_user_id').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(limit),
        crm.from('contacts').select('id,full_name,first_name,last_name,job_title,country_code,language_code,contact_status,assigned_owner_id').eq('id', conversation.contact_id).single(),
        crm.from('contact_points').select('id,normalized_value,country_code,validation_status,is_primary').eq('id', conversation.contact_point_id).single(),
        conversation.account_id ? crm.from('accounts').select('id,display_name,industry,country_code,region,city,source_tier,assigned_owner_id').eq('id', conversation.account_id).maybeSingle() : { data: null },
        crm.from('channel_permissions').select('purpose,status,legal_basis,consent_source,consented_at,opted_out_at').eq('contact_id', conversation.contact_id).eq('channel', 'whatsapp'),
        crm.from('suppressions').select('reason,occurred_at,source').eq('contact_point_id', conversation.contact_point_id).eq('status', 'active'),
        crm.from('activities').select('id,activity_type,summary,occurred_at').eq('conversation_id', conversationId).order('occurred_at', { ascending: false }).limit(20)
      ]);
      const messageRows = messages.data || [];
      const messageIds = messageRows.map((row) => row.id);
      const statuses = messageIds.length
        ? await crm.from('message_status_events').select('message_id,status,provider_timestamp,error_code,error_detail').in('message_id', messageIds).order('provider_timestamp', { ascending: true })
        : { data: [] };
      await crm.from('conversation_reads').upsert({ conversation_id: conversationId, user_id: authData.user.id, last_read_at: new Date().toISOString() });
      return json(200, {
        conversation,
        contact: contact.data || null,
        contactPoint: point.data || null,
        account: account.data || null,
        permissions: permissions.data || [],
        suppressions: suppressions.data || [],
        activities: activities.data || [],
        messages: messageRows.reverse().map((message) => ({
          ...message,
          failure_detail: safeFailureDetail(message.failure_detail),
          statusHistory: (statuses.data || []).filter((event) => event.message_id === message.id).map((event) => ({ ...event, error_detail: safeFailureDetail(event.error_detail) }))
        }))
      }, corsHeaders);
    }

    if (action === 'eligibility') {
      const conversationId = String(body.conversationId || '');
      const templateId = body.templateId ? String(body.templateId) : null;
      const requestedType = body.messageType === 'template' ? 'template' : 'text';
      if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return json(400, { error: 'invalid_conversation_id' }, corsHeaders);
      const { data: conversation, error: conversationError } = await crm.from('conversations')
        .select('id,contact_id,contact_point_id,whatsapp_phone_number_id,status,service_window_expires_at,is_test')
        .eq('id', conversationId).single();
      if (conversationError || !conversation) return json(404, { error: 'conversation_not_found' }, corsHeaders);
      const [point, phone, permissions, suppressions, template] = await Promise.all([
        crm.from('contact_points').select('normalized_value,validation_status,country_code').eq('id', conversation.contact_point_id).single(),
        crm.from('whatsapp_phone_numbers').select('status,provider_phone_number_id').eq('id', conversation.whatsapp_phone_number_id).single(),
        crm.from('channel_permissions').select('purpose,status').eq('contact_id', conversation.contact_id).eq('channel', 'whatsapp'),
        crm.from('suppressions').select('reason,status').eq('contact_point_id', conversation.contact_point_id).eq('status', 'active'),
        templateId ? crm.from('whatsapp_templates').select('id,approval_status,provider_status,category').eq('id', templateId).maybeSingle() : { data: null }
      ]);
      const serviceWindowOpen = Boolean(conversation.service_window_expires_at && new Date(conversation.service_window_expires_at) > new Date());
      const isTest = conversation.is_test === true || phone.data?.status === 'test';
      const switchEnabled = isTest
        ? Deno.env.get('WHATSAPP_TEST_SEND_ENABLED') === 'true'
        : Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true';
      let metaHealthy = false;
      let metaReason = null;
      try { await checkMetaConnection(); metaHealthy = true; } catch (error) { metaReason = humanMetaError(error?.providerCode || null, error?.message || null); }
      const permissionRows = permissions.data || [];
      const permissionAllowed = permissionRows.some((row) => ['allowed', 'opted_in'].includes(row.status));
      const optedOut = permissionRows.some((row) => ['opted_out', 'suppressed'].includes(row.status));
      const e164Valid = /^\+[1-9]\d{7,14}$/.test(point.data?.normalized_value || '');
      const templateApproved = requestedType === 'text' && serviceWindowOpen
        ? true
        : Boolean(template.data && template.data.approval_status === 'approved');
      const checks = {
        conversationAvailable: !['blocked', 'closed'].includes(conversation.status),
        phoneValid: point.data?.validation_status === 'valid' && e164Valid,
        consent: permissionAllowed && !optedOut,
        suppressed: (suppressions.data || []).length > 0,
        environment: isTest ? 'test' : 'production',
        templateApproved,
        serviceWindowOpen,
        metaHealthy,
        phoneConfigured: Boolean(phone.data?.provider_phone_number_id && ['test', 'active'].includes(phone.data.status)),
        globalSwitchEnabled: switchEnabled
      };
      const reasons = [];
      if (!checks.conversationAvailable) reasons.push('La conversación no está abierta para responder.');
      if (!checks.phoneValid) reasons.push('El teléfono no es un número E.164 validado.');
      if (!checks.consent) reasons.push('No existe consentimiento WhatsApp válido para esta finalidad.');
      if (checks.suppressed) reasons.push('El contacto solicitó no recibir mensajes.');
      if (!checks.templateApproved) reasons.push('La ventana de 24 horas está cerrada; selecciona una plantilla aprobada.');
      if (!checks.metaHealthy) reasons.push(metaReason || 'La conexión con Meta no está operativa.');
      if (!checks.phoneConfigured) reasons.push('El número remitente no está activo para este entorno.');
      if (!checks.globalSwitchEnabled) reasons.push(isTest ? 'Los envíos controlados de prueba están desactivados.' : 'Los envíos productivos están desactivados.');
      return json(200, {
        canSend: reasons.length === 0,
        checks,
        reasons,
        serviceWindowExpiresAt: conversation.service_window_expires_at,
        evaluatedAt: new Date().toISOString()
      }, corsHeaders);
    }

    if (action === 'campaign_readiness') {
      const [readinessResult, marketsResult] = await Promise.all([
        admin.rpc('crm_campaign_readiness_overview'),
        admin.rpc('crm_whatsapp_international_readiness')
      ]);
      if (readinessResult.error) {
        return json(409, {
          error: 'campaign_readiness_unavailable',
          message: safeFailureDetail(readinessResult.error.message)
        }, corsHeaders);
      }
      if (marketsResult.error) {
        return json(409, {
          error: 'international_market_readiness_unavailable',
          message: safeFailureDetail(marketsResult.error.message)
        }, corsHeaders);
      }
      return json(200, {
        readiness: readinessResult.data?.[0] || null,
        markets: marketsResult.data || []
      }, corsHeaders);
    }

    if (action === 'campaign_preview') {
      const countryCode = body.countryCode ? String(body.countryCode).trim().toUpperCase().slice(0, 2) : null;
      const industry = body.industry ? String(body.industry).trim().slice(0, 80) : null;
      const limit = clampInteger(body.limit, 25, 1, 100);
      const { data, error } = await admin.rpc('crm_whatsapp_campaign_preview', {
        p_country_code: countryCode || null,
        p_industry: industry || null,
        p_limit: limit
      });
      if (error) {
        return json(409, {
          error: 'campaign_preview_unavailable',
          message: safeFailureDetail(error.message)
        }, corsHeaders);
      }
      return json(200, { rows: data || [], limit }, corsHeaders);
    }

    if (action === 'campaign_wizard_options') {
      const [templatesResult, marketsResult, ratesResult, frequencyResult, budgetResult] = await Promise.all([
        crm.from('whatsapp_templates')
          .select('id,template_name,language_code,category,approval_status,quality_score,campaign_role,template_family,variable_count,body_text')
          .eq('approval_status', 'approved')
          .eq('enabled_for_campaigns', true)
          .eq('reconciliation_status', 'ready_for_campaign')
          .order('language_code')
          .order('template_name'),
        crm.from('market_policies')
          .select('country_code,market_name,region,market_status,whatsapp_marketing_enabled,daily_recipient_cap,primary_language_code,primary_timezone,reviewed_at')
          .order('market_name'),
        crm.from('whatsapp_rate_cards')
          .select('country_code,category,currency,unit_cost,rate_card_version,effective_from,effective_to,status,source_checked_at')
          .in('status', ['active', 'draft'])
          .order('country_code')
          .order('category'),
        crm.from('messaging_frequency_policies')
          .select('purpose,policy_name,minimum_interval_minutes,max_messages_24h,max_messages_7d,max_messages_30d,is_active,kill_switch,reviewed_at')
          .eq('channel', 'whatsapp')
          .order('purpose'),
        crm.from('budget_policies')
          .select('policy_name,currency,daily_limit,monthly_limit,daily_message_limit,is_active,kill_switch,updated_at')
          .eq('provider', 'meta_cloud')
          .order('updated_at', { ascending: false })
          .limit(5)
      ]);
      for (const result of [templatesResult, marketsResult, ratesResult, frequencyResult, budgetResult]) {
        if (result.error) throw result.error;
      }
      return json(200, {
        goals: Array.from(WHATSAPP_CAMPAIGN_GOALS),
        templates: templatesResult.data || [],
        markets: marketsResult.data || [],
        rates: ratesResult.data || [],
        frequencyPolicies: frequencyResult.data || [],
        budgetPolicies: budgetResult.data || [],
        limits: { maximumRecipientsPerDraft: 500, defaultBatchSize: 50 },
        sendingEnabled: false,
        checkedAt: new Date().toISOString()
      }, corsHeaders);
    }

    if (action === 'campaign_create_draft_v2') {
      // Wizard only creates dry-run drafts; never dispatches. No send-flag gate needed.
      const name = String(body.name || '').trim().slice(0, 120);
      const goal = String(body.goal || '').trim().toLowerCase();
      const purpose = ['marketing', 'transactional'].includes(String(body.purpose)) ? String(body.purpose) : 'marketing';
      const templateId = String(body.templateId || '');
      if (!WHATSAPP_CAMPAIGN_GOALS.has(goal)) return json(400, { error: 'invalid_campaign_goal' }, corsHeaders);
      if (!/^[0-9a-f-]{36}$/i.test(templateId)) return json(400, { error: 'invalid_template_id' }, corsHeaders);
      const sourceTier = body.sourceTier ? String(body.sourceTier).trim().toUpperCase() : null;
      if (sourceTier && !['AAA', 'AA', 'A', 'B'].includes(sourceTier)) return json(400, { error: 'invalid_source_tier' }, corsHeaders);
      const audienceRule = {
        country_code: String(body.countryCode || '').trim().toUpperCase().slice(0, 2),
        region: body.region ? String(body.region).trim().slice(0, 120) : null,
        city: body.city ? String(body.city).trim().slice(0, 120) : null,
        industry: body.industry ? String(body.industry).trim().slice(0, 120) : null,
        source_tier: sourceTier,
        language_code: String(body.languageCode || '').trim().replace('-', '_').slice(0, 16),
        timezone: String(body.timezone || '').trim().slice(0, 80),
        min_score: Math.min(100, Math.max(0, Number(body.minScore) || 0)),
        max_recipients: clampInteger(body.maxRecipients, 100, 1, 500),
        scheduled_local_time: body.scheduledLocalTime ? String(body.scheduledLocalTime).trim().slice(0, 5) : null,
        dry_run_required: true,
        sending_enabled: false,
        wizard_version: '2.0'
      };
      const { data, error } = await admin.rpc('crm_create_whatsapp_campaign_draft_v2', {
        p_name: name,
        p_goal: goal,
        p_purpose: purpose,
        p_template_id: templateId,
        p_audience_rule: audienceRule,
        p_actor_user_id: authData.user.id
      });
      if (error) return json(409, { error: 'campaign_wizard_draft_blocked', message: safeFailureDetail(error.message) }, corsHeaders);
      return json(200, { campaignId: data, status: 'draft', wizardVersion: '2.0', sendingEnabled: false }, corsHeaders);
    }

    if (action === 'campaign_prepare_review_v2') {
      // Wizard review materialises audience only; never dispatches. No send-flag gate needed.
      const campaignId = String(body.campaignId || '');
      if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return json(400, { error: 'invalid_campaign_id' }, corsHeaders);
      const { data, error } = await admin.rpc('crm_prepare_whatsapp_campaign_review_v2', {
        p_campaign_id: campaignId,
        p_actor_user_id: authData.user.id
      });
      if (error) return json(409, { error: 'campaign_wizard_review_blocked', message: safeFailureDetail(error.message) }, corsHeaders);
      return json(200, { result: data?.[0] || null, status: 'review_ready', sendingEnabled: false }, corsHeaders);
    }

    if (action === 'campaign_report_v2') {
      const campaignId = String(body.campaignId || '');
      if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return json(400, { error: 'invalid_campaign_id' }, corsHeaders);
      const { data, error } = await admin.rpc('crm_whatsapp_campaign_report_v2', { p_campaign_id: campaignId });
      if (error) return json(409, { error: 'campaign_report_unavailable', message: safeFailureDetail(error.message) }, corsHeaders);
      return json(200, { report: data || null, sendingEnabled: false }, corsHeaders);
    }

    if (action === 'campaign_create_draft') {
      const name = String(body.name || '').trim().slice(0, 120);
      const purpose = ['marketing', 'transactional', 'service'].includes(String(body.purpose)) ? String(body.purpose) : 'marketing';
      const templateId = body.templateId ? String(body.templateId) : null;
      const countryCode = body.countryCode ? String(body.countryCode).trim().toUpperCase().slice(0, 2) : null;
      const industry = body.industry ? String(body.industry).trim().slice(0, 80) : null;
      const limit = clampInteger(body.limit, 100, 1, 500);
      const { data, error } = await admin.rpc('crm_create_whatsapp_campaign_draft', {
        p_name: name,
        p_purpose: purpose,
        p_template_id: templateId,
        p_country_code: countryCode || null,
        p_industry: industry || null,
        p_limit: limit,
        p_actor_user_id: authData.user.id
      });
      if (error) {
        return json(409, {
          error: 'campaign_draft_unavailable',
          message: safeFailureDetail(error.message)
        }, corsHeaders);
      }
      return json(200, { campaignId: data, status: 'draft', sendingEnabled: false }, corsHeaders);
    }

    if (action === 'campaign_prepare_review') {
      const campaignId = String(body.campaignId || '');
      if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return json(400, { error: 'invalid_campaign_id' }, corsHeaders);
      const limit = clampInteger(body.limit, 100, 1, 500);
      const { data, error } = await admin.rpc('crm_prepare_whatsapp_campaign_review', {
        p_campaign_id: campaignId,
        p_limit: limit,
        p_actor_user_id: authData.user.id
      });
      if (error) {
        return json(409, {
          error: 'campaign_review_unavailable',
          message: safeFailureDetail(error.message)
        }, corsHeaders);
      }
      return json(200, { result: data?.[0] || null, status: 'review_ready', sendingEnabled: false }, corsHeaders);
    }

    if (action === 'campaign_approval_check') {
      const campaignId = String(body.campaignId || '');
      if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return json(400, { error: 'invalid_campaign_id' }, corsHeaders);
      const [approvalResult, marketResult] = await Promise.all([
        admin.rpc('crm_whatsapp_campaign_approval_check', { p_campaign_id: campaignId }),
        admin.rpc('crm_whatsapp_campaign_market_check', { p_campaign_id: campaignId })
      ]);
      if (approvalResult.error) {
        return json(409, {
          error: 'campaign_approval_check_unavailable',
          message: safeFailureDetail(approvalResult.error.message)
        }, corsHeaders);
      }
      if (marketResult.error) {
        return json(409, {
          error: 'campaign_market_check_unavailable',
          message: safeFailureDetail(marketResult.error.message)
        }, corsHeaders);
      }
      const approval = approvalResult.data?.[0] || null;
      const market = marketResult.data?.[0] || null;
      const check = approval ? {
        ...approval,
        is_approvable: Boolean(approval.is_approvable && market?.is_market_ready),
        market_ready: Boolean(market?.is_market_ready),
        market_count: market?.market_count || 0,
        missing_country_members: market?.missing_country_members || 0,
        unapproved_market_members: market?.unapproved_market_members || 0,
        missing_evidence_members: market?.missing_evidence_members || 0,
        markets: market?.markets || [],
        reasons: [...(approval.reasons || []), ...(market?.reasons || [])]
      } : null;
      return json(200, { check, sendingEnabled: false }, corsHeaders);
    }

    if (action === 'campaign_approve_no_send') {
      const campaignId = String(body.campaignId || '');
      if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return json(400, { error: 'invalid_campaign_id' }, corsHeaders);
      const { data, error } = await admin.rpc('crm_approve_whatsapp_campaign', {
        p_campaign_id: campaignId,
        p_actor_user_id: authData.user.id,
        p_confirm_no_send: true
      });
      if (error) {
        return json(409, {
          error: 'campaign_approval_blocked',
          message: safeFailureDetail(error.message)
        }, corsHeaders);
      }
      return json(200, { result: data?.[0] || null, sendingEnabled: false }, corsHeaders);
    }

    if (action === 'campaign_dispatch_preflight') {
      const campaignId = String(body.campaignId || '');
      if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return json(400, { error: 'invalid_campaign_id' }, corsHeaders);
      const batchSize = clampInteger(body.batchSize, 50, 1, 500);
      const { data, error } = await admin.rpc('crm_whatsapp_campaign_dispatch_preflight', {
        p_campaign_id: campaignId,
        p_batch_size: batchSize,
        p_actor_user_id: authData.user.id
      });
      if (error) {
        return json(409, {
          error: 'campaign_dispatch_preflight_blocked',
          message: safeFailureDetail(error.message)
        }, corsHeaders);
      }
      return json(200, {
        preflight: data?.[0] || null,
        sendingEnabled: false,
        productionSendEnabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true'
      }, corsHeaders);
    }

    if (action === 'campaign_dispatch_gate_status') {
      const { data, error } = await crm.from('whatsapp_campaign_dispatch_controls')
        .select('provider,queue_enabled,single_use,max_members_per_dispatch,authorization_expires_at,authorized_by_user_id,updated_at')
        .eq('provider', 'meta_cloud')
        .maybeSingle();
      if (error) {
        return json(200, {
          gate: null,
          warning: 'campaign_dispatch_gate_status_unavailable',
          message: safeFailureDetail(error.message),
          sendingEnabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true'
        }, corsHeaders);
      }
      return json(200, {
        gate: data || null,
        sendingEnabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true'
      }, corsHeaders);
    }

    if (action === 'campaign_authorize_queue_pilot') {
      if (adminUser.role !== 'super_admin') return json(403, { error: 'super_admin_required' }, corsHeaders);
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'queue_authorization_requires_global_sending_disabled' }, corsHeaders);
      }
      if (String(body.confirmation || '').trim() !== 'AUTORIZAR COLA PILOTO 1') {
        return json(409, { error: 'queue_authorization_confirmation_required' }, corsHeaders);
      }
      const campaignId = String(body.campaignId || '');
      const preflightRunId = String(body.preflightRunId || '');
      if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return json(400, { error: 'invalid_campaign_id' }, corsHeaders);
      if (!/^[0-9a-f-]{36}$/i.test(preflightRunId)) return json(400, { error: 'invalid_preflight_run_id' }, corsHeaders);

      const { data: campaign, error: campaignError } = await crm.from('campaigns')
        .select('id,status,channel,purpose')
        .eq('id', campaignId)
        .maybeSingle();
      if (campaignError) throw campaignError;
      if (!campaign || campaign.channel !== 'whatsapp' || campaign.status !== 'approved') {
        return json(409, { error: 'campaign_must_be_approved_whatsapp' }, corsHeaders);
      }

      const { data: preflight, error: preflightError } = await crm.from('campaign_dispatch_runs')
        .select('id,campaign_id,status,can_schedule,created_at')
        .eq('id', preflightRunId)
        .eq('campaign_id', campaignId)
        .maybeSingle();
      if (preflightError) throw preflightError;
      const preflightCreatedAt = preflight?.created_at ? new Date(preflight.created_at).getTime() : 0;
      if (!preflight || preflight.status !== 'ready' || preflight.can_schedule !== true || Date.now() - preflightCreatedAt > 15 * 60 * 1000) {
        return json(409, { error: 'fresh_ready_preflight_required' }, corsHeaders);
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { data, error } = await crm.from('whatsapp_campaign_dispatch_controls')
        .update({
          queue_enabled: true,
          single_use: true,
          max_members_per_dispatch: 1,
          authorization_expires_at: expiresAt,
          authorized_by_user_id: authData.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('provider', 'meta_cloud')
        .select('provider,queue_enabled,single_use,max_members_per_dispatch,authorization_expires_at,authorized_by_user_id,updated_at')
        .maybeSingle();
      if (error) throw error;
      await crm.from('audit_log').insert({
        actor_user_id: authData.user.id,
        actor_type: 'user',
        action: 'whatsapp.campaign.queue_authorize_pilot',
        entity_type: 'whatsapp_campaign',
        entity_id: campaignId,
        new_values: {
          result: 'authorized',
          preflight_run_id: preflightRunId,
          max_members_per_dispatch: 1,
          authorization_expires_at: expiresAt,
          sending_enabled: false
        }
      });
      return json(200, { gate: data || null, sendingEnabled: false }, corsHeaders);
    }

    if (action === 'campaign_dispatch_atomic') {
      if (adminUser.role !== 'super_admin') return json(403, { error: 'super_admin_required' }, corsHeaders);
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'atomic_dispatch_requires_global_sending_disabled' }, corsHeaders);
      }
      if (String(body.confirmation || '').trim() !== 'ENCOLAR 1 MENSAJE') {
        return json(409, { error: 'atomic_dispatch_confirmation_required' }, corsHeaders);
      }
      const campaignId = String(body.campaignId || '');
      const preflightRunId = String(body.preflightRunId || '');
      if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return json(400, { error: 'invalid_campaign_id' }, corsHeaders);
      if (!/^[0-9a-f-]{36}$/i.test(preflightRunId)) return json(400, { error: 'invalid_preflight_run_id' }, corsHeaders);
      const { data, error } = await admin.rpc('crm_dispatch_whatsapp_campaign_atomic', {
        p_campaign_id: campaignId,
        p_preflight_run_id: preflightRunId,
        p_max_members: 1,
        p_actor_user_id: authData.user.id
      });
      if (error) {
        return json(409, {
          error: 'campaign_atomic_dispatch_blocked',
          message: safeFailureDetail(error.message)
        }, corsHeaders);
      }
      const result = data?.[0] || null;
      await crm.from('audit_log').insert({
        actor_user_id: authData.user.id,
        actor_type: 'user',
        action: 'whatsapp.campaign.atomic_dispatch',
        entity_type: 'whatsapp_campaign',
        entity_id: campaignId,
        new_values: {
          result: 'queued',
          preflight_run_id: preflightRunId,
          queued_members: result?.queued_members || 0,
          reserved_cost: result?.reserved_cost || 0,
          currency: result?.currency || null,
          replayed: result?.replayed === true,
          queue_gate_closed: result?.queue_gate_closed === true,
          sending_enabled: false
        }
      });
      return json(200, { result, sendingEnabled: false }, corsHeaders);
    }

    if (action === 'campaign_close_queue_gate') {
      if (adminUser.role !== 'super_admin') return json(403, { error: 'super_admin_required' }, corsHeaders);
      const { data, error } = await crm.from('whatsapp_campaign_dispatch_controls')
        .update({
          queue_enabled: false,
          authorization_expires_at: null,
          authorized_by_user_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('provider', 'meta_cloud')
        .select('provider,queue_enabled,single_use,max_members_per_dispatch,authorization_expires_at,authorized_by_user_id,updated_at')
        .maybeSingle();
      if (error) throw error;
      await crm.from('audit_log').insert({
        actor_user_id: authData.user.id,
        actor_type: 'user',
        action: 'whatsapp.campaign.queue_gate_close',
        entity_type: 'whatsapp_campaign_dispatch_control',
        new_values: { result: 'closed', sending_enabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true' }
      });
      return json(200, { gate: data || null, sendingEnabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true' }, corsHeaders);
    }

    if (action === 'campaign_list') {
      const { data, error } = await crm.from('campaigns')
        .select('id,name,purpose,status,audience_rule,template_id,campaign_goal,language_code,timezone_name,estimated_recipient_count,estimated_cost,cost_currency,created_at,updated_at')
        .eq('channel', 'whatsapp')
        .order('updated_at', { ascending: false })
        .limit(25);
      if (error) throw error;
      const campaignIds = (data || []).map((row) => row.id);
      const members = campaignIds.length
        ? await crm.from('campaign_members').select('campaign_id,eligibility_status').in('campaign_id', campaignIds)
        : { data: [] };
      const rows = (data || []).map((campaign) => {
        const campaignMembers = (members.data || []).filter((member) => member.campaign_id === campaign.id);
        const counts = campaignMembers.reduce((result: Record<string, number>, member: { eligibility_status: string }) => {
          result[member.eligibility_status] = (result[member.eligibility_status] || 0) + 1;
          return result;
        }, {});
        return { ...campaign, memberCounts: counts };
      });
      return json(200, { rows }, corsHeaders);
    }

    if (action === 'templates') {
      const { data, error } = await crm.from('whatsapp_templates')
        .select('id,provider_template_id,template_name,language_code,category,approval_status,provider_status,components,quality_score,provider_updated_at,last_synced_at,updated_at,header_text,body_text,footer_text,buttons_json,variable_count,variable_examples,raw_hash,enabled_for_campaigns,campaign_role,template_family,reconciliation_status,reconciliation_notes')
        .order('template_name').limit(200);
      if (error) throw error;
      return json(200, { rows: (data || []).map((row) => ({ ...row, variables: templateVariables(row.components) })) }, corsHeaders);
    }

    if (action === 'sync_templates') {
      const connection = await checkMetaConnection();
      if (!connection.token.valid || !connection.waba.accessible) {
        return json(409, { error: 'meta_connection_not_ready', details: connection.errors || [] }, corsHeaders);
      }
      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const graphVersion = requiredMetaEnv('META_GRAPH_API_VERSION');
      const wabaProviderId = requiredMetaEnv('WHATSAPP_BUSINESS_ACCOUNT_ID');
      const syncedAt = new Date().toISOString();
      try {
        const { data: localWaba, error: wabaError } = await crm.from('whatsapp_business_accounts')
          .upsert({
            provider: 'meta_cloud', provider_business_account_id: wabaProviderId,
            display_name: connection.waba.name,
            status: connection.waba.id === wabaProviderId ? 'active' : 'test'
          }, { onConflict: 'provider_business_account_id' }).select('id').single();
        if (wabaError || !localWaba) throw wabaError || new Error('WABA cache unavailable');

        const templates: any[] = [];
        let after: string | null = null;
        do {
          const query = new URLSearchParams({ fields: 'id,name,language,status,category,quality_score,components', limit: '100' });
          if (after) query.set('after', after);
          const page = await metaGet(`${encodeURIComponent(wabaProviderId)}/message_templates?${query}`, accessToken, graphVersion);
          templates.push(...(page?.data || []));
          after = page?.paging?.cursors?.after && page?.paging?.next ? String(page.paging.cursors.after) : null;
          if (templates.length >= 1000) after = null;
        } while (after);

        if (templates.length) {
          const rows = await Promise.all(templates.map(async (template) => {
            const qualityScore = typeof template.quality_score === 'object'
              ? String(template.quality_score?.score || '') || null
              : String(template.quality_score || '') || null;
            const components = Array.isArray(template.components) ? template.components : [];
            return {
              business_account_id: localWaba.id,
              provider_template_id: template.id ? String(template.id) : null,
              template_name: String(template.name || ''),
              language_code: String(template.language || ''),
              category: String(template.category || '').toLowerCase(),
              approval_status: normalizeTemplateStatus(template.status),
              provider_status: String(template.status || 'PENDING'),
              components,
              quality_score: qualityScore,
              ...templateComponentMetadata(components),
              ...templateGovernance(template.name, template.language, normalizeTemplateStatus(template.status), qualityScore),
              raw_hash: await templateSnapshotHash(template),
              provider_updated_at: syncedAt,
              last_synced_at: syncedAt
            };
          }));
          const { error: upsertError } = await crm.from('whatsapp_templates').upsert(rows, { onConflict: 'business_account_id,template_name,language_code' });
          if (upsertError) throw upsertError;
        }
        await crm.from('audit_log').insert({
          actor_user_id: authData.user.id, actor_type: 'user', action: 'whatsapp.templates.sync',
          entity_type: 'whatsapp_business_account', entity_id: localWaba.id,
          new_values: { result: 'success', template_count: templates.length, environment: Deno.env.get('WHATSAPP_ALLOW_META_TEST_PAYLOADS') === 'true' ? 'test' : 'production' }
        });
        return json(200, { synced: true, count: templates.length, syncedAt }, corsHeaders);
      } catch (error) {
        await crm.from('audit_log').insert({
          actor_user_id: authData.user.id, actor_type: 'user', action: 'whatsapp.templates.sync',
          entity_type: 'whatsapp_business_account',
          new_values: { result: 'failed', template_count: 0, error: safeFailureDetail(error?.message), environment: Deno.env.get('WHATSAPP_ALLOW_META_TEST_PAYLOADS') === 'true' ? 'test' : 'production' }
        });
        throw error;
      }
    }

    if (action === 'waba_audit') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'audit_requires_sending_disabled' }, corsHeaders);
      }
      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const graphVersion = requiredMetaEnv('META_GRAPH_API_VERSION');
      const configuredWabaId = requiredMetaEnv('WHATSAPP_BUSINESS_ACCOUNT_ID');
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const targetPhoneNumberId = String(body.phoneNumberId || configuredPhoneNumberId).trim();
      const targetDisplayPhone = String(body.displayPhone || '+52 1 55 7405 7295').trim();
      const candidateWabaIds = [
        configuredWabaId,
        '4731600213830930',
        '2713541662435171'
      ].filter((value, index, list) => /^\d{8,20}$/.test(value) && list.indexOf(value) === index);
      if (targetPhoneNumberId !== configuredPhoneNumberId && targetPhoneNumberId !== '1358408147344707') {
        return json(400, { error: 'phone_number_scope_not_allowed' }, corsHeaders);
      }
      const inspected = await Promise.all(candidateWabaIds.map((wabaId) => (
        inspectWaba(wabaId, accessToken, graphVersion, targetPhoneNumberId, targetDisplayPhone)
      )));
      const ownerCandidates = inspected.filter((entry) => entry.targetPhoneFound);
      const billingCandidates = inspected.filter((entry) => entry.waba?.fundingConfigured);
      const configuredEntry = inspected.find((entry) => entry.wabaId === configuredWabaId) || null;
      const likelyOwner = ownerCandidates[0] || null;
      return json(200, {
        readOnly: true,
        sendingEnabled: false,
        graphVersion,
        checkedAt: new Date().toISOString(),
        target: {
          phoneNumberId: targetPhoneNumberId,
          displayPhone: targetDisplayPhone,
          verifiedName: 'Geobooker'
        },
        configured: {
          whatsappBusinessAccountId: configuredWabaId,
          whatsappWabaId: configuredWabaId,
          phoneNumberId: configuredPhoneNumberId,
          configuredWabaContainsPhone: Boolean(configuredEntry?.targetPhoneFound),
          configuredWabaFundingConfigured: Boolean(configuredEntry?.waba?.fundingConfigured)
        },
        inspected,
        conclusion: {
          likelyPhoneOwnerWabaId: likelyOwner?.wabaId || null,
          likelyPhoneOwnerFound: Boolean(likelyOwner),
          billingConfiguredWabaIds: billingCandidates.map((entry) => entry.wabaId),
          recommendedWhatsAppBusinessAccountId: likelyOwner?.wabaId || configuredWabaId,
          recommendedWhatsAppWabaId: likelyOwner?.wabaId || configuredWabaId,
          recommendedTemplateWabaId: likelyOwner?.wabaId || configuredWabaId,
          discrepancyDetected: Boolean(likelyOwner && likelyOwner.wabaId !== configuredWabaId),
          riskNote: 'No eliminar, desvincular ni mover WABA/numeros hasta confirmar propiedad, billing, templates y webhooks desde Meta.'
        }
      }, corsHeaders);
    }

    if (action === 'agent_configure_websites') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'agent_knowledge_requires_sending_disabled' }, corsHeaders);
      }
      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const entityId = String(body.entityId || configuredPhoneNumberId).trim();
      if (entityId !== configuredPhoneNumberId || entityId !== '1358408147344707') {
        return json(409, { error: 'agent_entity_scope_mismatch' }, corsHeaders);
      }

      const endpoint = `${encodeURIComponent(entityId)}/agent_config/websites`;
      const requestBody = {
        single_urls: AGENT_ALLOWED_WEBSITE_URLS,
        included_url_patterns: AGENT_INCLUDED_URL_PATTERNS,
        excluded_url_patterns: AGENT_EXCLUDED_URL_PATTERNS,
        metadata: {
          source: 'geobooker_whatsapp_center',
          scope: 'public_commercial_pages_only',
          crm_send_enabled: false
        }
      };
      const robots = await readRobotsStatus();
      const result: Record<string, unknown> = {
        success: false,
        readOnly: false,
        entityId,
        endpoint: `POST /${endpoint}`,
        urls: AGENT_ALLOWED_WEBSITE_URLS,
        includedUrlPatterns: AGENT_INCLUDED_URL_PATTERNS,
        excludedUrlPatterns: AGENT_EXCLUDED_URL_PATTERNS,
        robots
      };

      try {
        let createResponse: any = null;
        const fallbackAttempts: Record<string, unknown>[] = [];
        try {
          createResponse = await metaAgentRequest('POST', endpoint, accessToken, requestBody);
        } catch (bulkError) {
          fallbackAttempts.push({
            mode: 'bulk_scoped_patterns',
            success: false,
            meta: metaErrorResult(bulkError)
          });
          for (const url of AGENT_ALLOWED_WEBSITE_URLS) {
            try {
              const singleResponse = await metaAgentRequest('POST', endpoint, accessToken, {
                url,
                metadata: {
                  source: 'geobooker_whatsapp_center',
                  scope: 'single_public_commercial_url',
                  crm_send_enabled: false
                }
              });
              fallbackAttempts.push({ mode: 'single_url', url, success: true, responseKeys: Object.keys(singleResponse || {}).slice(0, 20) });
            } catch (singleError) {
              fallbackAttempts.push({ mode: 'single_url', url, success: false, meta: metaErrorResult(singleError) });
            }
          }
          if (!fallbackAttempts.some((attempt) => attempt.mode === 'single_url' && attempt.success)) {
            throw bulkError;
          }
          createResponse = { fallback_attempts: fallbackAttempts };
        }
        let statusResponse: any = null;
        try {
          statusResponse = await metaAgentRequest('GET', endpoint, accessToken);
        } catch (statusError) {
          result.statusError = metaErrorResult(statusError);
        }
        const sources = Array.isArray(statusResponse?.data)
          ? statusResponse.data.map(sanitizeAgentWebsiteSource)
          : Array.isArray(createResponse?.data)
            ? createResponse.data.map(sanitizeAgentWebsiteSource)
            : [];
        return json(200, {
          ...result,
          success: true,
          crawlStatus: statusResponse?.crawl_status || createResponse?.crawl_status || null,
          pagesCrawled: statusResponse?.pages_crawled ?? createResponse?.pages_crawled ?? null,
          crawlError: safeFailureDetail(statusResponse?.crawl_error || createResponse?.crawl_error),
          lastCrawledAt: statusResponse?.last_crawled_at || createResponse?.last_crawled_at || null,
          sources,
          fallbackAttempts,
          rawStatusKeys: statusResponse ? Object.keys(statusResponse).slice(0, 20) : [],
          configuredAt: new Date().toISOString()
        }, corsHeaders);
      } catch (error) {
        return json(200, {
          ...result,
          success: false,
          error: 'agent_website_configuration_failed',
          meta: metaErrorResult(error),
          configuredAt: new Date().toISOString()
        }, corsHeaders);
      }
    }

    if (action === 'agent_files_list') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const endpoint = `${encodeURIComponent(configuredPhoneNumberId)}/agent_config/files`;
      const [localResult, metaResult] = await Promise.allSettled([
        crm.from('agent_knowledge_files').select('id,provider_file_id,file_name,document_type,version,effective_from,effective_to,status,uploaded_at,reviewed_at,source_file,is_current,mime_type,byte_size,audit_notes').eq('entity_id', configuredPhoneNumberId).order('uploaded_at', { ascending: false, nullsFirst: false }).limit(100),
        metaAgentRequest('GET', endpoint, accessToken)
      ]);
      return json(200, {
        success: true,
        entityId: configuredPhoneNumberId,
        endpoint: `GET /${endpoint}`,
        localFiles: localResult.status === 'fulfilled' ? (localResult.value.data || []) : [],
        localError: localResult.status === 'rejected' || localResult.value?.error ? safeFailureDetail(localResult.status === 'rejected' ? localResult.reason?.message : localResult.value?.error?.message) : null,
        providerFiles: metaResult.status === 'fulfilled' && Array.isArray(metaResult.value?.data) ? metaResult.value.data.map(sanitizeAgentFileSource) : [],
        providerError: metaResult.status === 'rejected' ? metaErrorResult(metaResult.reason) : null,
        checkedAt: new Date().toISOString()
      }, corsHeaders);
    }

    if (action === 'agent_files_upload') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'agent_files_require_sending_disabled' }, corsHeaders);
      }
      if (!uploadedFile) {
        return json(400, { error: 'file_required' }, corsHeaders);
      }
      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const entityId = String(body.entityId || configuredPhoneNumberId).trim();
      const documentType = String(body.documentType || '').trim();
      const version = String(body.version || '').trim().slice(0, 80);
      const auditNotes = String(body.auditNotes || '').trim().slice(0, 500);
      const reviewed = String(body.reviewed || '') === 'true';
      const fileName = String(uploadedFile.name || body.fileName || '').trim();
      const mimeType = String(uploadedFile.type || 'application/octet-stream');

      if (entityId !== configuredPhoneNumberId || entityId !== '1358408147344707') {
        return json(409, { error: 'agent_file_entity_scope_mismatch' }, corsHeaders);
      }
      if (!AGENT_FILE_DOCUMENT_TYPES.has(documentType)) {
        return json(400, { error: 'document_type_not_allowed' }, corsHeaders);
      }
      if (!version) {
        return json(400, { error: 'version_required' }, corsHeaders);
      }
      if (!reviewed) {
        return json(409, { error: 'manual_review_required_before_upload' }, corsHeaders);
      }
      if (uploadedFile.size <= 0 || uploadedFile.size > 8_000_000) {
        return json(413, { error: 'file_size_not_allowed' }, corsHeaders);
      }
      if (!AGENT_FILE_ALLOWED_MIME_TYPES.has(mimeType) && !/\.(pdf|txt|md|docx)$/i.test(fileName)) {
        return json(415, { error: 'file_type_not_allowed' }, corsHeaders);
      }
      if (hasForbiddenAgentFileName(fileName)) {
        return json(409, { error: 'file_name_rejected_by_safety_policy' }, corsHeaders);
      }

      const checksum = await sha256Hex(uploadedFile);
      const existing = await crm.from('agent_knowledge_files')
        .select('id,provider_file_id,file_name,status,is_current')
        .eq('entity_id', entityId)
        .eq('checksum_sha256', checksum)
        .maybeSingle();
      if (existing.data?.provider_file_id) {
        return json(409, {
          error: 'duplicate_knowledge_file',
          existing: {
            id: existing.data.id,
            providerFileId: existing.data.provider_file_id,
            fileName: existing.data.file_name,
            status: existing.data.status,
            isCurrent: existing.data.is_current
          }
        }, corsHeaders);
      }

      const endpoint = `${encodeURIComponent(entityId)}/agent_config/files`;
      let localId: string | null = null;
      const insertResult = await crm.from('agent_knowledge_files').insert({
        entity_id: entityId,
        file_name: fileName,
        document_type: documentType,
        version,
        status: 'approved_for_upload',
        reviewed_at: new Date().toISOString(),
        reviewed_by: authData.user.id,
        source_file: `browser_upload:${fileName}`,
        mime_type: mimeType,
        byte_size: uploadedFile.size,
        checksum_sha256: checksum,
        is_current: false,
        audit_notes: auditNotes || null,
        metadata: { upload_source: 'whatsapp_center', no_pii_confirmed: true, no_secrets_confirmed: true }
      }).select('id').single();
      if (insertResult.error) throw insertResult.error;
      localId = insertResult.data.id;

      try {
        const uploadResponse = await metaAgentUploadFile(endpoint, accessToken, uploadedFile, fileName);
        const providerFileId = uploadResponse?.id || uploadResponse?.file_id || uploadResponse?.provider_file_id || uploadResponse?.data?.id || null;
        await crm.from('agent_knowledge_files')
          .update({
            provider_file_id: providerFileId ? String(providerFileId) : null,
            status: providerFileId ? 'uploaded' : 'uploaded',
            uploaded_at: new Date().toISOString(),
            metadata: { upload_source: 'whatsapp_center', meta_response_keys: Object.keys(uploadResponse || {}).slice(0, 20) }
          })
          .eq('id', localId);
        let providerFiles: any[] = [];
        let providerStatusError = null;
        try {
          const filesResponse = await metaAgentRequest('GET', endpoint, accessToken);
          providerFiles = Array.isArray(filesResponse?.data) ? filesResponse.data.map(sanitizeAgentFileSource) : [];
        } catch (statusError) {
          providerStatusError = metaErrorResult(statusError);
        }
        return json(200, {
          success: true,
          entityId,
          endpoint: `POST /${endpoint}`,
          localId,
          providerFileId,
          fileName,
          documentType,
          version,
          status: 'uploaded',
          providerFiles,
          providerStatusError,
          uploadedAt: new Date().toISOString()
        }, corsHeaders);
      } catch (error) {
        await crm.from('agent_knowledge_files')
          .update({
            status: 'upload_failed',
            metadata: { upload_source: 'whatsapp_center', error_code: String(error?.providerCode || error?.name || 'UPLOAD_FAILED') }
          })
          .eq('id', localId);
        return json(409, {
          success: false,
          error: 'agent_file_upload_failed',
          endpoint: `POST /${endpoint}`,
          fileName,
          documentType,
          version,
          meta: metaErrorResult(error),
          uploadedAt: new Date().toISOString()
        }, corsHeaders);
      }
    }

    if (action === 'agent_files_mark_current') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'agent_files_require_sending_disabled' }, corsHeaders);
      }
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const localId = String(body.localId || '').trim();
      const selected = await crm.from('agent_knowledge_files')
        .select('id,entity_id,document_type,status,provider_file_id')
        .eq('id', localId)
        .eq('entity_id', configuredPhoneNumberId)
        .maybeSingle();
      if (selected.error || !selected.data) return json(404, { error: 'agent_file_not_found' }, corsHeaders);
      if (!['uploaded', 'current'].includes(selected.data.status) || !selected.data.provider_file_id) {
        return json(409, { error: 'agent_file_not_uploaded' }, corsHeaders);
      }
      await crm.from('agent_knowledge_files')
        .update({ is_current: false, status: 'superseded', updated_at: new Date().toISOString() })
        .eq('entity_id', configuredPhoneNumberId)
        .eq('document_type', selected.data.document_type)
        .neq('id', selected.data.id)
        .in('status', ['uploaded', 'current']);
      const updateResult = await crm.from('agent_knowledge_files')
        .update({ is_current: true, status: 'current', updated_at: new Date().toISOString() })
        .eq('id', selected.data.id)
        .select('id,provider_file_id,file_name,document_type,version,status,is_current')
        .single();
      if (updateResult.error) throw updateResult.error;
      return json(200, {
        success: true,
        file: updateResult.data,
        sendingEnabled: false,
        updatedAt: new Date().toISOString()
      }, corsHeaders);
    }

    if (action === 'agent_files_delete') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'agent_files_require_sending_disabled' }, corsHeaders);
      }
      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const localId = String(body.localId || '').trim();
      const confirm = String(body.confirm || '') === 'DELETE_AGENT_FILE';
      if (!confirm) return json(409, { error: 'delete_confirmation_required' }, corsHeaders);
      const selected = await crm.from('agent_knowledge_files')
        .select('id,entity_id,provider_file_id,file_name,status')
        .eq('id', localId)
        .eq('entity_id', configuredPhoneNumberId)
        .maybeSingle();
      if (selected.error || !selected.data) return json(404, { error: 'agent_file_not_found' }, corsHeaders);
      if (!selected.data.provider_file_id) return json(409, { error: 'provider_file_id_missing' }, corsHeaders);
      const endpoint = `${encodeURIComponent(configuredPhoneNumberId)}/agent_config/files/${encodeURIComponent(selected.data.provider_file_id)}`;
      try {
        const deleteResponse = await metaAgentRequest('DELETE', endpoint, accessToken);
        await crm.from('agent_knowledge_files')
          .update({
            status: 'deleted',
            is_current: false,
            effective_to: new Date().toISOString().slice(0, 10),
            updated_at: new Date().toISOString(),
            metadata: { delete_source: 'whatsapp_center', meta_response_keys: Object.keys(deleteResponse || {}).slice(0, 20) }
          })
          .eq('id', selected.data.id);
        return json(200, {
          success: true,
          endpoint: `DELETE /${endpoint}`,
          localId,
          providerFileId: selected.data.provider_file_id,
          status: 'deleted',
          deletedAt: new Date().toISOString()
        }, corsHeaders);
      } catch (error) {
        return json(409, {
          success: false,
          error: 'agent_file_delete_failed',
          endpoint: `DELETE /${endpoint}`,
          meta: metaErrorResult(error),
          checkedAt: new Date().toISOString()
        }, corsHeaders);
      }
    }

    if (action === 'agent_test') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'agent_test_requires_sending_disabled' }, corsHeaders);
      }
      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const entityId = String(body.entityId || configuredPhoneNumberId).trim();
      const userMsg = String(body.userMsg || '').trim();
      const conversationId = String(body.conversationId || `geobooker-agent-test-${authData.user.id}-${Date.now()}`).replace(/[^a-zA-Z0-9._:-]/g, '-').slice(0, 120);
      if (entityId !== configuredPhoneNumberId || entityId !== '1358408147344707') {
        return json(409, { error: 'agent_test_entity_scope_mismatch' }, corsHeaders);
      }
      if (!userMsg || userMsg.length > 500) {
        return json(400, { error: 'agent_test_message_invalid' }, corsHeaders);
      }
      if (/meta app secret|whatsapp token|access token|verify token|service_role|supabase secret|pin/i.test(userMsg)) {
        return json(200, {
          success: true,
          sandbox: true,
          blockedByLocalGuardrail: true,
          entityId,
          conversationId,
          requestStatus: 'blocked_locally',
          language: /^(hi|hello|i represent|what is)/i.test(userMsg) ? 'en' : 'es',
          responseText: 'No puedo compartir secretos, tokens, claves internas ni credenciales. Si necesitas soporte de Geobooker, puedo ayudarte con información pública o canalizarte con una persona.',
          timestamp: new Date().toISOString()
        }, corsHeaders);
      }
      const endpoint = `${encodeURIComponent(entityId)}/agent_test`;
      try {
        const response = await metaAgentRequest('POST', endpoint, accessToken, {
          user_msg: userMsg,
          conversation_id: conversationId
        });
        const responseText = response?.response || response?.answer || response?.message || response?.agent_response || response?.data?.response || response?.data?.answer || null;
        return json(200, {
          success: true,
          sandbox: true,
          entityId,
          endpoint: `POST /${endpoint}`,
          conversationId,
          requestStatus: response?.status || 'completed',
          language: response?.language || response?.detected_language || null,
          responseText,
          responseKeys: Object.keys(response || {}).slice(0, 20),
          timestamp: new Date().toISOString()
        }, corsHeaders);
      } catch (error) {
        return json(200, {
          success: false,
          sandbox: true,
          entityId,
          endpoint: `POST /${endpoint}`,
          conversationId,
          requestStatus: 'failed',
          meta: metaErrorResult(error),
          timestamp: new Date().toISOString()
        }, corsHeaders);
      }
    }

    if (action === 'agent_meta_connector_audit') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'agent_connector_audit_requires_sending_disabled' }, corsHeaders);
      }
      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const entityId = String(body.entityId || configuredPhoneNumberId).trim();
      const refreshIfSafe = body.refreshMcpTools === true;
      if (entityId !== configuredPhoneNumberId || entityId !== '1358408147344707') {
        return json(409, { error: 'agent_connector_audit_entity_scope_mismatch' }, corsHeaders);
      }
      const listEndpoint = `${encodeURIComponent(entityId)}/agent_connectors`;
      let listResponse: any = null;
      let listError = null;
      try {
        listResponse = await metaAgentRequest('GET', listEndpoint, accessToken);
      } catch (error) {
        listError = metaErrorResult(error);
      }
      const connectors = extractMetaBusinessAgentConnectors(listResponse);
      const geobookerConnector = connectors.find((connector: Record<string, any>) => (
        /geobooker/i.test(String(connector.name || '')) ||
        /meta-business-agent-connector/i.test(String(connector.baseUrl || ''))
      )) || null;
      let refreshResult = null;
      let afterRefreshConnector = null;
      if (refreshIfSafe && geobookerConnector?.connectorId && /meta-business-agent-connector/i.test(String(geobookerConnector.baseUrl || ''))) {
        const refreshEndpoint = `${encodeURIComponent(entityId)}/agent_connectors/${encodeURIComponent(geobookerConnector.connectorId)}/refreshMCPTools`;
        try {
          const refreshResponse = await metaAgentRequest('POST', refreshEndpoint, accessToken, {});
          refreshResult = {
            success: true,
            endpoint: `POST /${refreshEndpoint}`,
            responseKeys: Object.keys(refreshResponse || {}).slice(0, 20)
          };
          try {
            const connectorResponse = await metaAgentRequest('GET', `${encodeURIComponent(entityId)}/agent_connectors/${encodeURIComponent(geobookerConnector.connectorId)}`, accessToken);
            afterRefreshConnector = sanitizeMetaBusinessAgentConnector(connectorResponse);
          } catch (afterError) {
            refreshResult.afterRefreshError = metaErrorResult(afterError);
          }
        } catch (error) {
          refreshResult = {
            success: false,
            endpoint: `POST /${refreshEndpoint}`,
            meta: metaErrorResult(error)
          };
        }
      }
      return json(200, {
        success: !listError,
        readOnly: !refreshIfSafe,
        refreshedMcpTools: Boolean(refreshResult),
        entityId,
        endpoints: {
          list: `GET /${listEndpoint}`,
          refresh: geobookerConnector?.connectorId ? `POST /${entityId}/agent_connectors/${geobookerConnector.connectorId}/refreshMCPTools` : null
        },
        connectors,
        geobookerConnector,
        refreshResult,
        afterRefreshConnector,
        conclusion: {
          connectorFound: Boolean(geobookerConnector),
          backendMatchesGeobooker: Boolean(geobookerConnector?.baseUrl && /meta-business-agent-connector/i.test(String(geobookerConnector.baseUrl))),
          mcpReady: Boolean((afterRefreshConnector || geobookerConnector)?.mcpToolSync?.status === 'READY'),
          toolCount: (afterRefreshConnector || geobookerConnector)?.mcpToolSync?.toolCount ?? 0,
          likelyToolsDisabledReason: !geobookerConnector
            ? 'Meta no tiene un connector registrado para este Phone Number ID.'
            : !/meta-business-agent-connector/i.test(String(geobookerConnector.baseUrl || ''))
              ? 'El connector registrado no apunta al backend seguro de Geobooker.'
              : ((afterRefreshConnector || geobookerConnector)?.mcpToolSync?.toolCount || 0) < 1
                ? 'Meta no ha descubierto herramientas MCP; revisar refreshMCPTools, auth del connector o soporte del endpoint MCP.'
                : null
        },
        listError,
        checkedAt: new Date().toISOString()
      }, corsHeaders);
    }

    if (action === 'agent_meta_connector_create') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      if (Deno.env.get('WHATSAPP_SEND_ENABLED') !== 'false') {
        return json(409, { error: 'agent_connector_create_requires_sending_disabled' }, corsHeaders);
      }

      const accessToken = requiredMetaEnv('WHATSAPP_ACCESS_TOKEN');
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const connectorSecret = requiredMetaEnv('META_BUSINESS_AGENT_CONNECTOR_SECRET');
      const entityId = String(body.entityId || configuredPhoneNumberId).trim();
      if (entityId !== configuredPhoneNumberId || entityId !== '1358408147344707') {
        return json(409, { error: 'agent_connector_create_entity_scope_mismatch' }, corsHeaders);
      }

      const baseUrl = 'https://dllckokqkgcraxyxsfqc.supabase.co/functions/v1/meta-business-agent-connector';
      const listEndpoint = `${encodeURIComponent(entityId)}/agent_connectors`;
      let beforeConnectors: any[] = [];
      try {
        const beforeList = await metaAgentRequest('GET', listEndpoint, accessToken);
        beforeConnectors = extractMetaBusinessAgentConnectors(beforeList);
      } catch {
        beforeConnectors = [];
      }
      const existingConnector = beforeConnectors.find((connector: Record<string, any>) => (
        String(connector.baseUrl || '').replace(/\/+$/, '') === baseUrl ||
        /meta-business-agent-connector/i.test(String(connector.baseUrl || ''))
      )) || null;
      if (existingConnector?.connectorId) {
        const upsertEndpoint = `${encodeURIComponent(entityId)}/agent_connectors/${encodeURIComponent(existingConnector.connectorId)}/upsertApiKey`;
        try {
          await metaAgentRequest('POST', upsertEndpoint, accessToken, {
            api_key_config: {
              headers: [{
                field_name: 'x-geobooker-connector-key',
                value: connectorSecret
              }]
            }
          });
          const confirmed = await metaAgentRequest('GET', `${listEndpoint}/${encodeURIComponent(existingConnector.connectorId)}`, accessToken)
            .then(sanitizeMetaBusinessAgentConnector)
            .catch(() => existingConnector);
          return json(200, {
            success: true,
            alreadyExisted: true,
            postAttempted: false,
            credentialsConfigured: true,
            httpStatus: 200,
            entityId,
            connector: confirmed,
            listConfirmed: true,
            checkedAt: new Date().toISOString()
          }, corsHeaders);
        } catch (error) {
          return json(200, {
            success: false,
            alreadyExisted: true,
            postAttempted: false,
            credentialsConfigured: false,
            httpStatus: error?.httpStatus || null,
            entityId,
            connector: existingConnector,
            baseUrl,
            authType: 'API_KEY',
            meta: metaErrorResult(error),
            checkedAt: new Date().toISOString()
          }, corsHeaders);
        }
      }

      const createEndpoint = `${encodeURIComponent(entityId)}/agent_connectors`;
      const createBody = {
        name: 'Geobooker CRM Connector',
        description: 'Secure server-side connector for Geobooker CRM handoff, opt-out, advertising interest and limited business status tools. Production mutations and WhatsApp sending remain disabled.',
        base_url: baseUrl,
        auth_type: 'API_KEY'
      };

      try {
        const createResponse = await metaAgentRequest('POST', createEndpoint, accessToken, createBody);
        const createdConnector = sanitizeMetaBusinessAgentConnector(createResponse);
        if (!createdConnector.connectorId) {
          throw Object.assign(new Error('Meta created a connector response without connector_id.'), {
            providerCode: 'CONNECTOR_ID_MISSING',
            providerResponse: createResponse,
            httpStatus: 502
          });
        }
        const upsertEndpoint = `${encodeURIComponent(entityId)}/agent_connectors/${encodeURIComponent(createdConnector.connectorId)}/upsertApiKey`;
        try {
          await metaAgentRequest('POST', upsertEndpoint, accessToken, {
            api_key_config: {
              headers: [{
                field_name: 'x-geobooker-connector-key',
                value: connectorSecret
              }]
            }
          });
        } catch (credentialError) {
          return json(200, {
            success: false,
            partialCreation: true,
            postAttempted: true,
            credentialsConfigured: false,
            httpStatus: credentialError?.httpStatus || null,
            entityId,
            connector: createdConnector,
            baseUrl,
            authType: 'API_KEY',
            meta: metaErrorResult(credentialError),
            checkedAt: new Date().toISOString()
          }, corsHeaders);
        }
        let afterConnectors: any[] = [];
        let listConfirmed = false;
        try {
          const afterList = await metaAgentRequest('GET', listEndpoint, accessToken);
          afterConnectors = extractMetaBusinessAgentConnectors(afterList);
          listConfirmed = afterConnectors.some((connector: Record<string, any>) => (
            connector.connectorId === createdConnector.connectorId ||
            String(connector.baseUrl || '').replace(/\/+$/, '') === baseUrl
          ));
        } catch {
          listConfirmed = false;
        }
        return json(200, {
          success: true,
          alreadyExisted: false,
          postAttempted: true,
          credentialsConfigured: true,
          httpStatus: 201,
          entityId,
          connector: createdConnector,
          listConfirmed,
          afterConnectors,
          checkedAt: new Date().toISOString()
        }, corsHeaders);
      } catch (error) {
        return json(200, {
          success: false,
          postAttempted: true,
          httpStatus: error?.httpStatus || null,
          entityId,
          connector: null,
          baseUrl,
          connectorProtocol: null,
          authType: 'API_KEY',
          connectionStatus: null,
          meta: metaErrorResult(error),
          checkedAt: new Date().toISOString()
        }, corsHeaders);
      }
    }

    if (action === 'agent_connector_status') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const flags = connectorFlags();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [recent, failures, latency] = await Promise.all([
        crm.from('agent_connector_requests').select('*', { count: 'exact', head: true }).gte('created_at', since),
        crm.from('agent_connector_requests').select('*', { count: 'exact', head: true }).gte('created_at', since).in('status', ['blocked', 'invalid', 'failed']),
        crm.from('agent_connector_requests').select('latency_ms,status,action,created_at').gte('created_at', since).not('latency_ms', 'is', null).order('created_at', { ascending: false }).limit(50)
      ]);
      const latencyRows = latency.data || [];
      const avgLatencyMs = latencyRows.length
        ? Math.round(latencyRows.reduce((sum, row) => sum + Number(row.latency_ms || 0), 0) / latencyRows.length)
        : null;
      return json(200, {
        success: true,
        connector: {
          name: 'Geobooker Connector',
          provider: 'meta_business_agent',
          version: 'v1',
          entityId: configuredPhoneNumberId,
          endpointPath: '/functions/v1/meta-business-agent-connector',
          connectionStatus: flags.connectorEnabled && flags.connectorSecretPresent ? 'prepared' : 'disabled',
          productionRepliesEnabled: false,
          sendingEnabled: flags.sendingEnabled,
          connectorEnabled: flags.connectorEnabled,
          mutationsEnabled: flags.mutationsEnabled,
          safetyActionsEnabled: flags.safetyActionsEnabled,
          connectorSecretPresent: flags.connectorSecretPresent
        },
        actions: AGENT_CONNECTOR_ACTIONS.map((entry) => ({
          ...entry,
          enabled: entry.mutation ? flags.mutationsEnabled : flags.connectorEnabled,
          productionMutationBlocked: entry.mutation && !flags.mutationsEnabled
        })),
        metrics24h: {
          total: recent.count || 0,
          blockedOrFailed: failures.count || 0,
          avgLatencyMs
        },
        checkedAt: new Date().toISOString()
      }, corsHeaders);
    }

    if (action === 'agent_connector_logs') {
      if (adminUser.role !== 'super_admin') {
        return json(403, { error: 'super_admin_required' }, corsHeaders);
      }
      const configuredPhoneNumberId = requiredMetaEnv('WHATSAPP_PHONE_NUMBER_ID');
      const rows = await crm.from('agent_connector_requests')
        .select('id,action,request_id,correlation_id,conversation_external_id,status,is_mutation,allowed,blocked_reason,idempotency_replayed,latency_ms,error_code,created_at,completed_at,sanitized_input,sanitized_result')
        .eq('entity_id', configuredPhoneNumberId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (rows.error) throw rows.error;
      return json(200, {
        success: true,
        rows: (rows.data || []).map((row) => ({
          ...row,
          sanitized_input: row.sanitized_input || {},
          sanitized_result: row.sanitized_result || {}
        })),
        checkedAt: new Date().toISOString()
      }, corsHeaders);
    }

    if (action === 'consent_requests') {
      const rows = await crm.from('whatsapp_consent_requests')
        .select('id,country_code,full_name,company_name,language_code,requested_service,requested_marketing,status,source_type,source_path,campaign_code,expires_at,confirmed_at,created_at,normalized_phone')
        .order('created_at', { ascending: false })
        .limit(100);
      if (rows.error) throw rows.error;
      const now = Date.now();
      const sanitizedRows = (rows.data || []).map((row) => {
        const displayStatus = row.status === 'pending_inbound' && new Date(row.expires_at).getTime() <= now
          ? 'expired'
          : row.status;
        return {
          id: row.id,
          countryCode: row.country_code,
          fullName: row.full_name,
          companyName: row.company_name,
          languageCode: row.language_code,
          phoneMasked: maskPhone(row.normalized_phone),
          requestedService: row.requested_service,
          requestedMarketing: row.requested_marketing,
          status: displayStatus,
          sourceType: row.source_type,
          sourcePath: row.source_path,
          campaignCode: row.campaign_code,
          expiresAt: row.expires_at,
          confirmedAt: row.confirmed_at,
          createdAt: row.created_at
        };
      });
      const counts: Record<string, number> = {
        total: 0,
        pending_inbound: 0,
        confirmed: 0,
        expired: 0,
        cancelled: 0,
        blocked_suppressed: 0,
        marketingRequested: 0
      };
      for (const row of sanitizedRows) {
        counts.total += 1;
        counts[row.status] = (counts[row.status] || 0) + 1;
        if (row.requestedMarketing) counts.marketingRequested += 1;
      }
      return json(200, {
        success: true,
        publicUrl: 'https://geobooker.com.mx/whatsapp-consent',
        counts,
        rows: sanitizedRows,
        checkedAt: new Date().toISOString()
      }, corsHeaders);
    }

    if (action === 'diagnostics') {
      const [webhooks, messages, jobs] = await Promise.all([
        crm.from('webhook_events').select('id,event_type,provider_message_id,processing_status,signature_verified,last_error,received_at,processed_at').in('processing_status', ['failed', 'dead_letter']).order('received_at', { ascending: false }).limit(30),
        crm.from('messages').select('id,conversation_id,current_status,failure_code,failure_detail,updated_at').eq('current_status', 'failed').order('updated_at', { ascending: false }).limit(30),
        crm.from('outbound_jobs').select('id,conversation_id,status,last_error_code,last_error_detail,attempt_count,next_attempt_at,updated_at').in('status', ['failed', 'dead_letter', 'unknown']).order('updated_at', { ascending: false }).limit(30)
      ]);
      const failedProviderIds = (webhooks.data || []).map((row) => row.provider_message_id).filter(Boolean);
      const relatedMessages = failedProviderIds.length
        ? await crm.from('messages').select('id,provider_message_id').in('provider_message_id', failedProviderIds)
        : { data: [], error: null };
      const relatedMessageIds = (relatedMessages.data || []).map((row) => row.id);
      const confirmedRequests = relatedMessageIds.length
        ? await crm.from('whatsapp_consent_requests').select('confirmed_message_id,status').in('confirmed_message_id', relatedMessageIds).eq('status', 'confirmed')
        : { data: [], error: null };
      if (relatedMessages.error) throw relatedMessages.error;
      if (confirmedRequests.error) throw confirmedRequests.error;
      const messageByProviderId = new Map((relatedMessages.data || []).map((row) => [row.provider_message_id, row.id]));
      const confirmedMessageIds = new Set((confirmedRequests.data || []).map((row) => row.confirmed_message_id));
      return json(200, {
        webhooks: (webhooks.data || []).map((row) => {
          const persistedMessageId = messageByProviderId.get(row.provider_message_id);
          return {
            ...row,
            provider_message_id: undefined,
            last_error: safeFailureDetail(row.last_error),
            message_persisted: Boolean(persistedMessageId),
            consent_confirmed: Boolean(persistedMessageId && confirmedMessageIds.has(persistedMessageId)),
            operational_state: persistedMessageId && confirmedMessageIds.has(persistedMessageId)
              ? 'resolved_partial_failure'
              : 'requires_review'
          };
        }),
        messages: (messages.data || []).map((row) => ({ ...row, failure_detail: safeFailureDetail(row.failure_detail) })),
        jobs: (jobs.data || []).map((row) => ({ ...row, last_error_detail: safeFailureDetail(row.last_error_detail) }))
      }, corsHeaders);
    }

    return json(400, { error: 'unsupported_action' }, corsHeaders);
  } catch (error) {
    console.error('WhatsApp admin request failed', { name: error?.name, message: safeFailureDetail(error?.message) });
    return json(500, { error: 'whatsapp_admin_failed' }, corsHeaders);
  }
});
