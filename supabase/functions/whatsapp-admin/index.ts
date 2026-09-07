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

function safeFailureDetail(value: unknown) {
  if (!value) return null;
  return String(value).replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]').slice(0, 500);
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
    metaGet(`${encodeURIComponent(wabaId)}/subscribed_apps`, accessToken, graphVersion)
  ]);
  const [identityResult, permissionsResult, wabaResult, phoneResult, subscriptionResult] = results;
  const identity = identityResult.status === 'fulfilled' ? identityResult.value : null;
  const permissionsResponse = permissionsResult.status === 'fulfilled' ? permissionsResult.value : null;
  const waba = wabaResult.status === 'fulfilled' ? wabaResult.value : null;
  const phone = phoneResult.status === 'fulfilled' ? phoneResult.value : null;
  const subscriptions = subscriptionResult.status === 'fulfilled' && Array.isArray(subscriptionResult.value?.data)
    ? subscriptionResult.value.data
    : [];
  const permissionMap = Object.fromEntries((permissionsResponse?.data || []).map((permission: { permission: string; status: string }) => [permission.permission, permission.status]));
  const requiredPermissions = ['business_management', 'whatsapp_business_messaging', 'whatsapp_business_management'];
  const errors = results.flatMap((result, index) => result.status === 'rejected' ? [{
    component: ['token', 'permissions', 'waba', 'phone', 'subscription'][index],
    code: String(result.reason?.providerCode || result.reason?.name || 'META_CHECK_FAILED'),
    message: humanMetaError(result.reason?.providerCode || null, result.reason?.message || null)
  }] : []);
  return {
    graphVersion,
    token: { valid: Boolean(identity?.id), subjectType: 'system_user' },
    permissions: Object.fromEntries(requiredPermissions.map((permission) => [permission, permissionMap[permission] === 'granted'])),
    waba: { accessible: Boolean(waba?.id), name: waba?.name || null, currency: waba?.currency || null, timezoneId: waba?.timezone_id ?? null },
    phone: {
      accessible: Boolean(phone?.id),
      displayPhoneNumber: phone?.display_phone_number || null,
      verifiedName: phone?.verified_name || null,
      qualityRating: phone?.quality_rating || null,
      verificationStatus: phone?.code_verification_status || null,
      platformType: phone?.platform_type || null
    },
    subscription: {
      accessible: subscriptionResult.status === 'fulfilled',
      subscribed: subscriptions.length > 0,
      appCount: subscriptions.length
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

    const rawBody = await request.text();
    if (rawBody.length > 20_000) return json(413, { error: 'payload_too_large' }, corsHeaders);
    let body: Record<string, unknown> = {};
    try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { return json(400, { error: 'invalid_json' }, corsHeaders); }
    const action = String(body.action || 'health');
    const crm = admin.schema('crm');

    if (action === 'health') {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const [
        webhook, incoming, outgoing, openConversations, messagesToday,
        dueFollowups, templates, failedMessage, waba, phone, templateSync, outboundJobs, oldestDueJob, dbProbe
      ] = await Promise.all([
        crm.from('webhook_events').select('received_at,processing_status,last_error,signature_verified').order('received_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('messages').select('provider_timestamp,created_at').eq('direction', 'inbound').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('messages').select('provider_timestamp,created_at').eq('direction', 'outbound').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('conversations').select('*', { count: 'exact', head: true }).in('status', ['open', 'snoozed']),
        crm.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        crm.from('tasks').select('*', { count: 'exact', head: true }).eq('task_type', 'whatsapp').in('status', ['pending', 'in_progress']).lte('due_at', new Date().toISOString()),
        crm.from('whatsapp_templates').select('approval_status'),
        crm.from('messages').select('failure_code,failure_detail,updated_at').eq('current_status', 'failed').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('whatsapp_business_accounts').select('status,display_name').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('whatsapp_phone_numbers').select('status,display_phone_number,verified_name,quality_rating').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('audit_log').select('new_values,occurred_at').eq('action', 'whatsapp.templates.sync').order('occurred_at', { ascending: false }).limit(1).maybeSingle(),
        crm.from('outbound_jobs').select('status'),
        crm.from('outbound_jobs').select('id,status,scheduled_at,next_attempt_at,attempt_count,max_attempts').in('status', ['pending', 'retry']).order('next_attempt_at', { ascending: true, nullsFirst: false }).order('scheduled_at', { ascending: true }).limit(1).maybeSingle(),
        crm.from('conversations').select('id').limit(1)
      ]);
      if (dbProbe.error) throw dbProbe.error;
      const templateCounts = (templates.data || []).reduce((result: Record<string, number>, row: { approval_status: string }) => {
        result[row.approval_status] = (result[row.approval_status] || 0) + 1;
        return result;
      }, {});
      const queueCounts = (outboundJobs.data || []).reduce((result: Record<string, number>, row: { status: string }) => {
        result[row.status] = (result[row.status] || 0) + 1;
        return result;
      }, {});
      const testMode = Deno.env.get('WHATSAPP_ALLOW_META_TEST_PAYLOADS') === 'true' || phone.data?.status === 'test';
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
      return json(200, {
        mode: testMode ? 'test' : 'production',
        configured: {
          metaAppSecret: Boolean(Deno.env.get('META_APP_SECRET')),
          wabaId: Boolean(Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID')),
          phoneNumberId: Boolean(Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')),
          verifyToken: Boolean(Deno.env.get('WHATSAPP_VERIFY_TOKEN')),
          accessToken: Boolean(Deno.env.get('WHATSAPP_ACCESS_TOKEN')),
          graphApiVersion: Boolean(Deno.env.get('META_GRAPH_API_VERSION')),
          sendingEnabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true',
          testSendingEnabled: Deno.env.get('WHATSAPP_TEST_SEND_ENABLED') === 'true'
        },
        graphApiVersion: Deno.env.get('META_GRAPH_API_VERSION') || null,
        meta: metaConnection,
        metaError,
        database: { operational: true },
        waba: waba.data || null,
        phone: phone.data || null,
        webhook: webhook.data ? {
          lastReceivedAt: webhook.data.received_at,
          status: webhook.data.processing_status,
          signatureVerified: webhook.data.signature_verified,
          lastError: safeFailureDetail(webhook.data.last_error)
        } : null,
        metrics: {
          messagesToday: messagesToday.count || 0,
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
        .select('id,contact_id,contact_point_id,whatsapp_phone_number_id,status,service_window_expires_at')
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
      const isTest = Deno.env.get('WHATSAPP_ALLOW_META_TEST_PAYLOADS') === 'true' || phone.data?.status === 'test';
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

    if (action === 'templates') {
      const { data, error } = await crm.from('whatsapp_templates')
        .select('id,template_name,language_code,category,approval_status,provider_status,components,quality_score,provider_updated_at,last_synced_at,updated_at')
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
            display_name: connection.waba.name, status: Deno.env.get('WHATSAPP_ALLOW_META_TEST_PAYLOADS') === 'true' ? 'test' : 'active'
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
          const rows = templates.map((template) => ({
            business_account_id: localWaba.id,
            provider_template_id: template.id ? String(template.id) : null,
            template_name: String(template.name || ''),
            language_code: String(template.language || ''),
            category: String(template.category || '').toLowerCase(),
            approval_status: normalizeTemplateStatus(template.status),
            provider_status: String(template.status || 'PENDING'),
            components: Array.isArray(template.components) ? template.components : [],
            quality_score: typeof template.quality_score === 'object' ? String(template.quality_score?.score || '') || null : String(template.quality_score || '') || null,
            provider_updated_at: syncedAt,
            last_synced_at: syncedAt
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

    if (action === 'diagnostics') {
      const [webhooks, messages, jobs] = await Promise.all([
        crm.from('webhook_events').select('id,event_type,processing_status,signature_verified,last_error,received_at,processed_at').in('processing_status', ['failed', 'dead_letter']).order('received_at', { ascending: false }).limit(30),
        crm.from('messages').select('id,conversation_id,current_status,failure_code,failure_detail,updated_at').eq('current_status', 'failed').order('updated_at', { ascending: false }).limit(30),
        crm.from('outbound_jobs').select('id,conversation_id,status,last_error_code,last_error_detail,attempt_count,next_attempt_at,updated_at').in('status', ['failed', 'dead_letter', 'unknown']).order('updated_at', { ascending: false }).limit(30)
      ]);
      return json(200, {
        webhooks: (webhooks.data || []).map((row) => ({ ...row, last_error: safeFailureDetail(row.last_error) })),
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
