import { createClient } from 'npm:@supabase/supabase-js@2.83.0';

const ALLOWED_ACTIONS = new Set([
  'create_lead',
  'update_lead',
  'request_human_handoff',
  'register_advertising_interest',
  'register_business_interest',
  'register_strategic_partner_interest',
  'record_opt_out',
  'get_business_registration_status'
]);

const MUTATIVE_ACTIONS = new Set([
  'create_lead',
  'update_lead',
  'request_human_handoff',
  'register_advertising_interest',
  'register_business_interest',
  'register_strategic_partner_interest',
  'record_opt_out'
]);

const READ_ACTIONS = new Set(['get_business_registration_status']);

const MCP_TOOLS = [
  {
    name: 'get_business_registration_status',
    title: 'Get business registration status',
    description: 'Consulta de forma limitada el estado de registro de un negocio en Geobooker. No expone tablas ni datos internos.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        business_id: { type: 'string', description: 'ID público, slug o referencia controlada del negocio.' },
        locale: { type: 'string', description: 'Idioma preferido, por ejemplo es_MX o en_US.' }
      },
      required: ['business_id']
    }
  },
  {
    name: 'request_human_handoff',
    title: 'Request human handoff',
    description: 'Solicita seguimiento humano de Geobooker. Preparada pero bloqueada mientras las mutaciones productivas estén apagadas.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        reason: { type: 'string', description: 'Motivo del handoff.' },
        customer_message: { type: 'string', description: 'Resumen del mensaje del usuario.' },
        locale: { type: 'string' }
      },
      required: ['reason']
    }
  },
  {
    name: 'record_opt_out',
    title: 'Record opt out',
    description: 'Registra una solicitud de baja/STOP/ALTO. Preparada como acción de seguridad; no envía mensajes.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        normalized_identifier: { type: 'string', description: 'Identificador de contacto normalizado o referencia segura.' },
        phrase: { type: 'string', description: 'Texto de baja recibido.' },
        channel: { type: 'string', enum: ['whatsapp'] }
      },
      required: ['normalized_identifier']
    }
  },
  {
    name: 'register_advertising_interest',
    title: 'Register advertising interest',
    description: 'Registra interés publicitario en Geobooker. Bloqueada hasta activar mutaciones revisadas.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        company_name: { type: 'string' },
        market: { type: 'string' },
        intent: { type: 'string' },
        locale: { type: 'string' }
      },
      required: ['intent']
    }
  },
  {
    name: 'register_business_interest',
    title: 'Register business interest',
    description: 'Registra interés de alta de negocio en Geobooker. Bloqueada hasta activar mutaciones revisadas.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        business_name: { type: 'string' },
        city: { type: 'string' },
        intent: { type: 'string' },
        locale: { type: 'string' }
      },
      required: ['intent']
    }
  },
  {
    name: 'register_strategic_partner_interest',
    title: 'Register strategic partner interest',
    description: 'Registra interés de alianza estratégica. Bloqueada hasta activar mutaciones revisadas.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        company_name: { type: 'string' },
        partner_type: { type: 'string' },
        intent: { type: 'string' },
        locale: { type: 'string' }
      },
      required: ['intent']
    }
  }
];

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

function sanitizeText(value: unknown, max = 300) {
  return String(value || '')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone]')
    .trim()
    .slice(0, max);
}

function sanitizeObject(input: Record<string, unknown>) {
  const payload = typeof input.payload === 'object' && input.payload !== null
    ? input.payload as Record<string, unknown>
    : {};
  return {
    action: sanitizeText(input.action, 80),
    entity_id_present: Boolean(input.entity_id),
    tenant_key: sanitizeText(input.tenant_key || 'geobooker', 40),
    locale: sanitizeText(input.locale, 20),
    request_id_present: Boolean(input.request_id),
    conversation_id_present: Boolean(input.conversation_id),
    payload_keys: Object.keys(payload).slice(0, 20)
  };
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function constantTimeEquals(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

function connectorStatus() {
  return {
    connectorEnabled: Deno.env.get('META_BUSINESS_AGENT_CONNECTOR_ENABLED') === 'true',
    mutationsEnabled: Deno.env.get('META_BUSINESS_AGENT_MUTATIONS_ENABLED') === 'true',
    safetyActionsEnabled: Deno.env.get('META_BUSINESS_AGENT_SAFETY_ACTIONS_ENABLED') === 'true',
    sendingEnabled: Deno.env.get('WHATSAPP_SEND_ENABLED') === 'true'
  };
}

function validatePayload(action: string, payload: Record<string, unknown>) {
  if (action === 'request_human_handoff') {
    if (!sanitizeText(payload.reason || payload.message, 280)) return 'handoff_reason_required';
  }
  if (action === 'record_opt_out') {
    const normalized = sanitizeText(payload.normalized_identifier || payload.wa_id || payload.phone, 80);
    if (!normalized) return 'opt_out_identifier_required';
  }
  if (action === 'get_business_registration_status') {
    const businessId = sanitizeText(payload.business_id || payload.slug || payload.email, 120);
    if (!businessId) return 'business_lookup_identifier_required';
  }
  if ([
    'create_lead',
    'update_lead',
    'register_advertising_interest',
    'register_business_interest',
    'register_strategic_partner_interest'
  ].includes(action)) {
    const name = sanitizeText(payload.name || payload.company_name || payload.business_name, 140);
    const intent = sanitizeText(payload.intent || payload.message || payload.interest, 300);
    if (!name && !intent) return 'lead_or_interest_context_required';
  }
  return null;
}

function mcpResult(id: unknown, result: Record<string, unknown>) {
  return json(200, { jsonrpc: '2.0', id: id ?? null, result });
}

function mcpError(id: unknown, code: number, message: string) {
  return json(200, { jsonrpc: '2.0', id: id ?? null, error: { code, message } });
}

function isMcpRequest(body: Record<string, unknown>) {
  return body.jsonrpc === '2.0' && typeof body.method === 'string';
}

function mcpInitializeResponse() {
  return {
    protocolVersion: '2025-06-18',
    capabilities: { tools: { listChanged: false } },
    serverInfo: {
      name: 'geobooker-meta-business-agent-connector',
      version: '1.0.0'
    }
  };
}

function mcpToolsListResponse() {
  return { tools: MCP_TOOLS };
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method === 'GET') {
    return json(200, {
      ok: true,
      connector: 'meta_business_agent_geobooker',
      version: 'v1',
      actions: [...ALLOWED_ACTIONS],
      mutativeActionsEnabled: false
    });
  }
  if (request.method !== 'POST') return json(405, { ok: false, error_code: 'METHOD_NOT_ALLOWED' });

  const startedAt = Date.now();
  let action = 'unknown';
  let entityId = '';
  let requestId = '';
  let correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
  let crm: ReturnType<ReturnType<typeof createClient>['schema']> | null = null;
  let auditId: string | null = null;
  let mcpToolCall = false;
  let mcpCallId: unknown = undefined;

  try {
    const connectorSecret = Deno.env.get('META_BUSINESS_AGENT_CONNECTOR_SECRET');
    if (!connectorSecret) {
      return json(503, { ok: false, error_code: 'CONNECTOR_NOT_CONFIGURED' });
    }
    const authHeader = request.headers.get('authorization') || '';
    const providedSecret = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || request.headers.get('x-geobooker-connector-key') || '';
    if (!providedSecret || !(await constantTimeEquals(providedSecret, connectorSecret))) {
      return json(401, { ok: false, error_code: 'CONNECTOR_AUTH_REQUIRED' });
    }

    const rawBody = await request.text();
    if (rawBody.length > 16_000) return json(413, { ok: false, error_code: 'PAYLOAD_TOO_LARGE' });

    let body: Record<string, unknown> = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return json(400, { ok: false, error_code: 'INVALID_JSON' });
    }

    const handshakeAction = sanitizeText(body.action || body.type || body.method, 80).toLowerCase();
    if (!rawBody || Object.keys(body).length === 0 || ['ping', 'health', 'health_check', 'validate', 'connection_test'].includes(handshakeAction)) {
      const status = connectorStatus();
      return json(200, {
        ok: true,
        status: 'ready',
        connector: 'meta_business_agent_geobooker',
        version: 'v1',
        entity_id: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || null,
        mutativeActionsEnabled: false,
        sendingEnabled: status.sendingEnabled,
        productionAgentEnabled: false
      });
    }

    const admin = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    crm = admin.schema('crm');

    if (isMcpRequest(body)) {
      const method = String(body.method || '');
      if (method === 'initialize') return mcpResult(body.id, mcpInitializeResponse());
      if (method === 'tools/list') return mcpResult(body.id, mcpToolsListResponse());
      if (method === 'notifications/initialized') return new Response(null, { status: 202 });
      if (method !== 'tools/call') return mcpError(body.id, -32601, 'Method not found');

      const params = typeof body.params === 'object' && body.params !== null ? body.params as Record<string, unknown> : {};
      const toolName = sanitizeText(params.name, 80);
      const toolArguments = typeof params.arguments === 'object' && params.arguments !== null ? params.arguments as Record<string, unknown> : {};
      mcpToolCall = true;
      mcpCallId = body.id;
      body = {
        action: toolName,
        entity_id: requiredEnv('WHATSAPP_PHONE_NUMBER_ID'),
        request_id: sanitizeText(params.request_id || request.headers.get('idempotency-key') || crypto.randomUUID(), 120),
        correlation_id: correlationId,
        conversation_id: sanitizeText(params.conversation_id, 160),
        external_user_id: sanitizeText(params.external_user_id, 160),
        locale: sanitizeText(toolArguments.locale, 20),
        tenant_key: 'geobooker',
        payload: toolArguments
      };
    }

    action = sanitizeText(body.action, 80);
    entityId = sanitizeText(body.entity_id || body.entityId || '', 40);
    requestId = sanitizeText(body.request_id || request.headers.get('idempotency-key') || crypto.randomUUID(), 120);
    correlationId = sanitizeText(body.correlation_id || correlationId, 120);
    const tenantKey = sanitizeText(body.tenant_key || 'geobooker', 40);
    const locale = sanitizeText(body.locale, 20) || null;
    const conversationExternalId = sanitizeText(body.conversation_id, 160) || null;
    const externalUserRaw = sanitizeText(body.external_user_id || body.wa_id || '', 160);
    const externalUserHash = externalUserRaw ? await sha256Hex(externalUserRaw) : null;
    const payload = typeof body.payload === 'object' && body.payload !== null ? body.payload as Record<string, unknown> : {};
    const configuredPhoneNumberId = requiredEnv('WHATSAPP_PHONE_NUMBER_ID');
    const status = connectorStatus();
    const isMutation = MUTATIVE_ACTIONS.has(action);

    const existing = await crm.from('agent_connector_requests')
      .select('id,status,allowed,blocked_reason,error_code,sanitized_result,created_at')
      .eq('provider', 'meta_business_agent')
      .eq('entity_id', entityId || configuredPhoneNumberId)
      .eq('action', action || 'unknown')
      .eq('request_id', requestId)
      .maybeSingle();
    if (existing.data) {
      await crm.from('agent_connector_requests')
        .update({ idempotency_replayed: true, status: 'replayed', completed_at: new Date().toISOString() })
        .eq('id', existing.data.id);
      return json(200, {
        ok: true,
        status: 'replayed',
        request_id: requestId,
        correlation_id: correlationId,
        result: existing.data.sanitized_result || {}
      });
    }

    const insert = await crm.from('agent_connector_requests').insert({
      provider: 'meta_business_agent',
      entity_id: entityId || configuredPhoneNumberId,
      action: ALLOWED_ACTIONS.has(action) ? action : 'request_human_handoff',
      request_id: requestId,
      correlation_id: correlationId,
      external_user_id_hash: externalUserHash,
      conversation_external_id: conversationExternalId,
      tenant_key: tenantKey === 'geobooker' ? tenantKey : 'geobooker',
      locale,
      status: 'received',
      is_mutation: isMutation,
      allowed: false,
      sanitized_input: sanitizeObject(body),
      metadata: { endpoint_version: 'v1', source: 'meta_business_agent_connector' }
    }).select('id').single();
    if (insert.error) throw insert.error;
    auditId = insert.data.id;

    const finish = async (httpStatus: number, result: Record<string, unknown>, statusValue = 'blocked') => {
      await crm!.from('agent_connector_requests').update({
        status: statusValue,
        allowed: Boolean(result.ok && statusValue === 'completed'),
        blocked_reason: typeof result.error_code === 'string' ? result.error_code : null,
        error_code: result.ok ? null : String(result.error_code || 'CONNECTOR_BLOCKED'),
        sanitized_result: result,
        latency_ms: Date.now() - startedAt,
        completed_at: new Date().toISOString()
      }).eq('id', auditId);
      if (mcpToolCall) {
        return mcpResult(mcpCallId, {
          content: [{
            type: 'text',
            text: JSON.stringify({ ...result, request_id: requestId, correlation_id: correlationId })
          }],
          isError: !result.ok
        });
      }
      return json(httpStatus, { ...result, request_id: requestId, correlation_id: correlationId });
    };

    if (!status.connectorEnabled) {
      return finish(503, { ok: false, status: 'blocked', error_code: 'CONNECTOR_DISABLED' });
    }
    if (status.sendingEnabled) {
      return finish(409, { ok: false, status: 'blocked', error_code: 'WHATSAPP_SEND_MUST_REMAIN_DISABLED_FOR_AGENT_CONNECTOR' });
    }
    if (entityId !== configuredPhoneNumberId || entityId !== '1358408147344707') {
      return finish(409, { ok: false, status: 'blocked', error_code: 'ENTITY_SCOPE_MISMATCH' });
    }
    if (!ALLOWED_ACTIONS.has(action)) {
      return finish(400, { ok: false, status: 'invalid', error_code: 'ACTION_NOT_ALLOWED' }, 'invalid');
    }
    if (tenantKey !== 'geobooker') {
      return finish(403, { ok: false, status: 'blocked', error_code: 'TENANT_NOT_ALLOWED' });
    }

    if (externalUserHash) {
      const since = new Date(Date.now() - 60_000).toISOString();
      const recent = await crm.from('agent_connector_requests')
        .select('*', { count: 'exact', head: true })
        .eq('external_user_id_hash', externalUserHash)
        .gte('created_at', since);
      if ((recent.count || 0) > 30) {
        return finish(429, { ok: false, status: 'blocked', error_code: 'RATE_LIMITED' });
      }
    }

    const validationError = validatePayload(action, payload);
    if (validationError) {
      return finish(400, { ok: false, status: 'invalid', error_code: validationError }, 'invalid');
    }

    if (isMutation && !status.mutationsEnabled) {
      return finish(409, {
        ok: false,
        status: 'blocked',
        error_code: 'MUTATIVE_ACTIONS_DISABLED',
        allowed_when_ready: ['request_human_handoff', 'record_opt_out']
      });
    }

    if (READ_ACTIONS.has(action)) {
      return finish(200, {
        ok: true,
        status: 'completed',
        action,
        result: {
          lookup_supported: true,
          customer_visible_message: 'Recibimos tu solicitud. Por seguridad, el estado detallado se confirma desde el canal oficial de Geobooker.'
        }
      }, 'completed');
    }

    return finish(409, { ok: false, status: 'blocked', error_code: 'ACTION_IMPLEMENTATION_NOT_ENABLED' });
  } catch (error) {
    if (crm && auditId) {
      await crm.from('agent_connector_requests').update({
        status: 'failed',
        allowed: false,
        error_code: String(error?.name || 'CONNECTOR_FAILED'),
        sanitized_result: { ok: false, error_code: 'CONNECTOR_FAILED' },
        latency_ms: Date.now() - startedAt,
        completed_at: new Date().toISOString()
      }).eq('id', auditId);
    }
    return json(500, { ok: false, error_code: 'CONNECTOR_FAILED' });
  }
});
