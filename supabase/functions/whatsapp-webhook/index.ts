import { createClient } from 'npm:@supabase/supabase-js@2.83.0';
import {
  sha256Hex,
  shouldAdvanceMessageStatus,
  verifyMetaSignature
} from '../_shared/whatsapp-security.js';
import {
  classifyWebhookPayload,
  isAllowedWebhookScope,
  isMetaTestPayload
} from '../_shared/whatsapp-events.js';
import { verifyWebhookSubscription } from '../_shared/whatsapp-webhook-http.js';
import {
  detectWhatsAppConsentConfirmation,
  detectWhatsAppOptOut,
  parseOptOutKeywords
} from '../_shared/whatsapp-consent.js';

const jsonHeaders = { 'Content-Type': 'application/json' };

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function envSet(name: string) {
  return new Set(
    (Deno.env.get(name) || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
}

function inferUnambiguousCountryCode(e164: unknown) {
  const value = String(e164 || '').trim();
  const unambiguousCallingCodes: Array<[string, string]> = [
    ['+52', 'MX'],
    ['+44', 'GB'],
    ['+34', 'ES'],
    ['+49', 'DE'],
    ['+33', 'FR'],
    ['+31', 'NL'],
    ['+57', 'CO']
  ];
  return unambiguousCallingCodes.find(([callingCode]) => value.startsWith(callingCode))?.[1] || null;
}

function requiredSecret(name: string, minimumLength: number) {
  const value = requiredEnv(name);
  if (value.length < minimumLength) throw new Error(`Server secret is too short: ${name}`);
  return value;
}

function sanitizeDiagnostic(value: unknown, maximumLength = 4_000) {
  return String(value ?? '')
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\bsbp_(?:oauth_)?[a-f0-9]{20,}\b/gi, '[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted]')
    .replace(/((?:access[_-]?token|api[_-]?key|authorization|secret)\s*[=:]\s*)[^\s,;}]+/gi, '$1[redacted]')
    .slice(0, maximumLength);
}

function safeErrorDiagnostic(error: unknown) {
  const record = error && typeof error === 'object'
    ? error as Record<string, unknown>
    : {};
  return {
    error_name: sanitizeDiagnostic(
      error instanceof Error ? error.name : record.name || 'NonErrorThrown',
      200
    ),
    error_message: sanitizeDiagnostic(
      error instanceof Error ? error.message : record.message || error,
      2_000
    ),
    error_stack: sanitizeDiagnostic(
      error instanceof Error ? error.stack : record.stack || '',
      4_000
    ) || null,
    error_code: sanitizeDiagnostic(record.code || '', 200) || null
  };
}

async function ensureProviderPhoneNumber(admin: ReturnType<typeof createClient>, event: Record<string, any>) {
  if (!event.providerBusinessAccountId || !event.phoneNumberId) return null;

  const { data: existingPhone, error: existingPhoneError } = await admin
    .schema('crm')
    .from('whatsapp_phone_numbers')
    .select('id')
    .eq('provider_phone_number_id', event.phoneNumberId)
    .maybeSingle();
  if (existingPhoneError) throw existingPhoneError;
  if (existingPhone) return existingPhone;

  const { error: businessInsertError } = await admin
    .schema('crm')
    .from('whatsapp_business_accounts')
    .upsert({
      provider_business_account_id: event.providerBusinessAccountId,
      display_name: 'Meta WhatsApp test account',
      status: 'test'
    }, { onConflict: 'provider_business_account_id', ignoreDuplicates: true });
  if (businessInsertError) throw businessInsertError;

  const { data: businessAccount, error: businessError } = await admin
    .schema('crm')
    .from('whatsapp_business_accounts')
    .select('id')
    .eq('provider_business_account_id', event.providerBusinessAccountId)
    .single();
  if (businessError) throw businessError;

  const { error: phoneInsertError } = await admin
    .schema('crm')
    .from('whatsapp_phone_numbers')
    .upsert({
      business_account_id: businessAccount.id,
      provider_phone_number_id: event.phoneNumberId,
      display_phone_number: event.displayPhoneNumber,
      status: 'test'
    }, { onConflict: 'provider_phone_number_id', ignoreDuplicates: true });
  if (phoneInsertError) throw phoneInsertError;

  const { data: phoneNumber, error: phoneError } = await admin
    .schema('crm')
    .from('whatsapp_phone_numbers')
    .select('id')
    .eq('provider_phone_number_id', event.phoneNumberId)
    .single();
  if (phoneError) throw phoneError;
  return phoneNumber;
}

async function ensureConversation(admin: ReturnType<typeof createClient>, event: Record<string, any>) {
  const phoneNumber = await ensureProviderPhoneNumber(admin, event);
  if (!phoneNumber || !event.providerWaId || !event.normalizedFrom) return null;
  const inferredCountryCode = inferUnambiguousCountryCode(event.normalizedFrom);

  let contactId: string;
  let contactPointId: string;
  if (event.isTest) {
    const { data: contact, error: contactError } = await admin
      .schema('crm')
      .from('contacts')
      .upsert({
        external_source_id: 'meta_whatsapp_sample',
        external_contact_id: event.providerWaId,
        full_name: 'Meta webhook sample contact',
        normalized_name: 'meta webhook sample contact',
        contact_status: 'archived',
        source_metadata: { source: 'meta_developers_test_button', is_test: true }
      }, { onConflict: 'external_source_id,external_contact_id' })
      .select('id')
      .single();
    if (contactError) throw contactError;
    contactId = contact.id;

    const { data: point, error: pointError } = await admin
      .schema('crm')
      .from('contact_points')
      .upsert({
        contact_id: contactId,
        point_type: 'whatsapp',
        raw_value: event.providerWaId,
        normalized_value: event.normalizedFrom,
        normalization_method: 'meta_sample_wa_id',
        normalization_confidence: 'high',
        validation_status: 'valid',
        is_primary: true,
        source_metadata: { source: 'meta_developers_test_button', is_test: true }
      }, { onConflict: 'contact_id,account_id,point_type,normalized_value' })
      .select('id')
      .single();
    if (pointError) throw pointError;
    contactPointId = point.id;
  } else {
    const { data: points, error: pointsError } = await admin
      .schema('crm')
      .from('contact_points')
      .select('id,contact_id,country_code')
      .in('point_type', ['phone', 'whatsapp'])
      .eq('normalized_value', event.normalizedFrom)
      .limit(2);
    if (pointsError) throw pointsError;
    if ((points || []).length > 1) return null;

    if (points?.length === 1) {
      contactId = points[0].contact_id;
      contactPointId = points[0].id;
      if (!points[0].country_code && inferredCountryCode) {
        const [{ error: pointCountryError }, { error: contactCountryError }] = await Promise.all([
          admin.schema('crm').from('contact_points')
            .update({ country_code: inferredCountryCode })
            .eq('id', contactPointId)
            .is('country_code', null),
          admin.schema('crm').from('contacts')
            .update({ country_code: inferredCountryCode })
            .eq('id', contactId)
            .is('country_code', null)
        ]);
        if (pointCountryError) throw pointCountryError;
        if (contactCountryError) throw contactCountryError;
      }
    } else {
      const { data: contact, error: contactError } = await admin
        .schema('crm')
        .from('contacts')
        .upsert({
          external_source_id: 'meta_whatsapp',
          external_contact_id: event.providerWaId,
          contact_status: 'needs_review',
          country_code: inferredCountryCode,
          source_metadata: { source: 'whatsapp_webhook' }
        }, { onConflict: 'external_source_id,external_contact_id' })
        .select('id')
        .single();
      if (contactError) throw contactError;
      contactId = contact.id;

      const { data: point, error: pointError } = await admin
        .schema('crm')
        .from('contact_points')
        .upsert({
          contact_id: contactId,
          point_type: 'whatsapp',
          raw_value: event.providerWaId,
          normalized_value: event.normalizedFrom,
          normalization_method: 'meta_wa_id',
          normalization_confidence: 'high',
          validation_status: 'valid',
          country_code: inferredCountryCode,
          is_primary: true
        }, { onConflict: 'contact_id,account_id,point_type,normalized_value' })
        .select('id')
        .single();
      if (pointError) throw pointError;
      contactPointId = point.id;
    }
  }

  const { data: conversation, error: conversationError } = await admin
    .schema('crm')
    .from('conversations')
    .upsert({
      whatsapp_phone_number_id: phoneNumber.id,
      contact_id: contactId,
      contact_point_id: contactPointId,
      provider_wa_id: event.providerWaId,
      is_test: Boolean(event.isTest),
      status: 'open',
      last_message_at: event.providerTimestamp
    }, { onConflict: 'whatsapp_phone_number_id,contact_point_id' })
    .select('id,contact_id,contact_point_id')
    .single();
  if (conversationError) throw conversationError;
  return conversation;
}

async function confirmPendingWhatsAppConsent(
  admin: ReturnType<typeof createClient>,
  event: Record<string, any>,
  conversation: Record<string, any>,
  message: Record<string, any>,
  confirmationCode: string
) {
  const codeHash = await sha256Hex(confirmationCode);
  const { data: request, error: requestError } = await admin
    .schema('crm')
    .from('whatsapp_consent_requests')
    .select('id,normalized_phone,country_code,full_name,company_name,language_code,requested_service,requested_marketing,consent_text_version,consent_text_sha256,source_type,source_path,campaign_code,source_metadata,expires_at,created_at')
    .eq('confirmation_code_hash', codeHash)
    .eq('status', 'pending_inbound')
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request || request.normalized_phone !== event.normalizedFrom) return false;

  if (new Date(request.expires_at).getTime() <= Date.now()) {
    const { error: expiryError } = await admin.schema('crm')
      .from('whatsapp_consent_requests')
      .update({ status: 'expired' })
      .eq('id', request.id)
      .eq('status', 'pending_inbound');
    if (expiryError) throw expiryError;
    return false;
  }

  const [{ data: suppression, error: suppressionError }, { data: existingPermissions, error: permissionsError }] = await Promise.all([
    admin.schema('crm').from('suppressions')
      .select('id')
      .eq('identifier_type', 'whatsapp')
      .eq('normalized_identifier', event.normalizedFrom)
      .eq('status', 'active')
      .or('channel.eq.whatsapp,channel.is.null')
      .limit(1)
      .maybeSingle(),
    admin.schema('crm').from('channel_permissions')
      .select('id,purpose,status')
      .eq('contact_id', conversation.contact_id)
      .eq('channel', 'whatsapp')
      .in('purpose', ['service', 'marketing'])
  ]);
  if (suppressionError) throw suppressionError;
  if (permissionsError) throw permissionsError;
  const blockedStatuses = new Set(['opted_out', 'suppressed', 'invalid', 'complaint']);
  const blockedPermission = (existingPermissions || []).some((row) => (
    (row.purpose === 'service' || (request.requested_marketing && row.purpose === 'marketing'))
    && blockedStatuses.has(row.status)
  ));
  if (suppression || blockedPermission) {
    const { error: blockedError } = await admin.schema('crm')
      .from('whatsapp_consent_requests')
      .update({ status: 'blocked_suppressed' })
      .eq('id', request.id)
      .eq('status', 'pending_inbound');
    if (blockedError) throw blockedError;
    return false;
  }

  const { data: currentContact, error: contactLookupError } = await admin.schema('crm')
    .from('contacts')
    .select('source_metadata')
    .eq('id', conversation.contact_id)
    .single();
  if (contactLookupError) throw contactLookupError;
  const normalizedName = String(request.full_name || '').trim().toLowerCase();
  const firstName = String(request.full_name || '').trim().split(/\s+/)[0] || null;
  const { error: contactUpdateError } = await admin.schema('crm').from('contacts').update({
    full_name: request.full_name,
    normalized_name: normalizedName,
    first_name: firstName,
    country_code: request.country_code,
    language_code: request.language_code,
    contact_status: 'active',
    source_metadata: {
      ...(currentContact?.source_metadata || {}),
      whatsapp_double_opt_in: {
        request_id: request.id,
        source_type: request.source_type,
        source_path: request.source_path,
        campaign_code: request.campaign_code,
        company_name: request.company_name,
        confirmed_at: event.providerTimestamp
      }
    }
  }).eq('id', conversation.contact_id);
  if (contactUpdateError) throw contactUpdateError;

  const requestedPurposes = [
    ...(request.requested_service ? ['service'] : []),
    ...(request.requested_marketing ? ['marketing'] : [])
  ];
  const permissionRows = [];
  for (const purpose of requestedPurposes) {
    const { data: permission, error: permissionError } = await admin.schema('crm')
      .from('channel_permissions')
      .upsert({
        contact_id: conversation.contact_id,
        channel: 'whatsapp',
        purpose,
        status: purpose === 'marketing' ? 'opted_in' : 'allowed',
        legal_basis: 'consent',
        jurisdiction: request.country_code,
        consent_source: 'public_form_inbound_double_opt_in',
        consent_text_version: request.consent_text_version,
        consented_at: event.providerTimestamp,
        opted_out_at: null,
        source_metadata: {
          consent_request_id: request.id,
          provider_message_id: event.providerMessageId,
          double_opt_in: true
        }
      }, { onConflict: 'contact_id,channel,purpose' })
      .select('id,purpose')
      .single();
    if (permissionError) throw permissionError;
    permissionRows.push(permission);
  }

  const evidenceReference = `whatsapp_consent_request:${request.id}`;
  for (const permission of permissionRows) {
    const { error: evidenceError } = await admin.schema('crm').from('consent_evidence').insert({
      channel_permission_id: permission.id,
      contact_id: conversation.contact_id,
      channel: 'whatsapp',
      purpose: permission.purpose,
      evidence_type: 'inbound_request',
      evidence_reference: evidenceReference,
      evidence_sha256: request.consent_text_sha256,
      consent_text_version: request.consent_text_version,
      captured_at: event.providerTimestamp,
      captured_country_code: request.country_code,
      source_metadata: {
        source_type: request.source_type,
        source_path: request.source_path,
        campaign_code: request.campaign_code,
        form_submitted_at: request.created_at,
        inbound_provider_message_id: event.providerMessageId,
        phone_match_verified: true,
        ...(request.source_metadata || {})
      }
    });
    if (evidenceError && evidenceError.code !== '23505') throw evidenceError;
  }

  const { data: confirmedRows, error: confirmError } = await admin.schema('crm')
    .from('whatsapp_consent_requests')
    .update({
      status: 'confirmed',
      confirmed_at: event.providerTimestamp,
      confirmed_message_id: message.id,
      contact_id: conversation.contact_id
    })
    .eq('id', request.id)
    .eq('status', 'pending_inbound')
    .select('id');
  if (confirmError) throw confirmError;
  if (!confirmedRows?.length) return false;

  // The uniqueness guard is a partial index (message_id IS NOT NULL). PostgREST
  // cannot infer that predicate from on_conflict, so use an explicit idempotent
  // lookup followed by an insert and tolerate a concurrent duplicate.
  const { data: existingConsentActivity, error: activityLookupError } = await admin
    .schema('crm')
    .from('activities')
    .select('id')
    .eq('message_id', message.id)
    .eq('activity_type', 'whatsapp_consent_confirmed')
    .maybeSingle();
  if (activityLookupError) throw activityLookupError;
  if (!existingConsentActivity) {
    const { error: activityError } = await admin.schema('crm').from('activities').insert({
      contact_id: conversation.contact_id,
      conversation_id: conversation.id,
      message_id: message.id,
      activity_type: 'whatsapp_consent_confirmed',
      summary: request.requested_marketing
        ? 'WhatsApp service and marketing consent confirmed'
        : 'WhatsApp service request confirmed',
      metadata: {
        consent_request_id: request.id,
        service_allowed: Boolean(request.requested_service),
        marketing_opted_in: Boolean(request.requested_marketing),
        phone_match_verified: true
      },
      occurred_at: event.providerTimestamp
    });
    if (activityError && activityError.code !== '23505') throw activityError;
  }
  return true;
}

async function processStatusEvent(admin: ReturnType<typeof createClient>, event: Record<string, any>) {
  let { data: message, error: messageError } = await admin
    .schema('crm')
    .from('messages')
    .select('id,current_status')
    .eq('provider_message_id', event.providerMessageId)
    .maybeSingle();

  if (messageError) throw messageError;
  if (!message) {
    const conversation = await ensureConversation(admin, event);
    if (!conversation) return false;

    const { data: insertedMessage, error: insertError } = await admin
      .schema('crm')
      .from('messages')
      .upsert({
        conversation_id: conversation.id,
        direction: 'outbound',
        message_type: 'unknown',
        provider_message_id: event.providerMessageId,
        provider_wa_id: event.providerWaId,
        provider_phone_number_id: event.phoneNumberId,
        provider_metadata: { source: 'whatsapp_status_webhook' },
        current_status: event.status,
        provider_timestamp: event.providerTimestamp
      }, { onConflict: 'provider_message_id' })
      .select('id,current_status')
      .single();
    if (insertError) throw insertError;
    message = insertedMessage;
  }

  const { error: statusError } = await admin
    .schema('crm')
    .from('message_status_events')
    .upsert({
      message_id: message.id,
      status: event.status,
      provider_timestamp: event.providerTimestamp,
      provider_event_fingerprint: event.fingerprint,
      error_code: event.errorCode,
      error_detail: event.errorDetail,
      provider_wa_id: event.providerWaId,
      provider_phone_number_id: event.phoneNumberId,
      metadata: event.metadata || {}
    }, { onConflict: 'provider_event_fingerprint', ignoreDuplicates: true });

  if (statusError) throw statusError;

  if (shouldAdvanceMessageStatus(message.current_status, event.status)) {
    const { error: updateError } = await admin
      .schema('crm')
      .from('messages')
      .update({
        current_status: event.status,
        failure_code: event.errorCode,
        failure_detail: event.errorDetail,
        provider_wa_id: event.providerWaId,
        provider_phone_number_id: event.phoneNumberId
      })
      .eq('id', message.id);
    if (updateError) throw updateError;
  }

  if (event.status === 'delivered') {
    await admin.schema('crm').from('usage_ledger').upsert({
      message_id: message.id,
      charge_status: 'estimated',
      delivered_at: event.providerTimestamp
    }, { onConflict: 'message_id' });
  }

  return true;
}

async function processInboundEvent(admin: ReturnType<typeof createClient>, event: Record<string, any>) {
  const { data: existingMessage, error: existingError } = await admin
    .schema('crm')
    .from('messages')
    .select('id,conversation_id')
    .eq('provider_message_id', event.providerMessageId)
    .maybeSingle();
  if (existingError) throw existingError;

  const baseConversation = await ensureConversation(admin, event);
  if (!baseConversation) return false;
  const now = new Date(event.providerTimestamp);
  const serviceWindowExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data: conversation, error: conversationError } = await admin
    .schema('crm')
    .from('conversations')
    .update({
      status: 'open',
      service_window_expires_at: serviceWindowExpiresAt,
      last_inbound_at: event.providerTimestamp,
      last_message_at: event.providerTimestamp
    })
    .eq('id', baseConversation.id)
    .select('id')
    .single();
  if (conversationError) throw conversationError;

  const { data: replyTo } = event.contextProviderMessageId
    ? await admin.schema('crm').from('messages').select('id').eq('provider_message_id', event.contextProviderMessageId).maybeSingle()
    : { data: null };

  let persistedMessage = existingMessage;
  if (!persistedMessage) {
    const { data: insertedMessage, error: insertError } = await admin
      .schema('crm')
      .from('messages')
      .insert({
      conversation_id: conversation.id,
      direction: 'inbound',
      message_type: event.messageType,
      provider_message_id: event.providerMessageId,
      provider_wa_id: event.providerWaId,
      provider_phone_number_id: event.phoneNumberId,
      reply_to_message_id: replyTo?.id || null,
      body_text: event.text,
      content: event.content,
      provider_metadata: {
        business_account_id: event.providerBusinessAccountId,
        display_phone_number: event.displayPhoneNumber,
        is_test: Boolean(event.isTest),
        sample_source: event.isTest ? 'meta_developers_test_button' : null
      },
      current_status: 'received',
      provider_timestamp: event.providerTimestamp
      })
      .select('id,conversation_id')
      .single();
    if (insertError?.code === '23505') {
      const { data: concurrentMessage, error: concurrentError } = await admin
        .schema('crm')
        .from('messages')
        .select('id,conversation_id')
        .eq('provider_message_id', event.providerMessageId)
        .single();
      if (concurrentError) throw concurrentError;
      persistedMessage = concurrentMessage;
    } else if (insertError) {
      throw insertError;
    } else {
      persistedMessage = insertedMessage;
    }
  }

  if (!persistedMessage) throw new Error('Inbound message persistence failed');

  const optOutCommand = event.messageType === 'text'
    ? detectWhatsAppOptOut(
        event.text,
        parseOptOutKeywords(Deno.env.get('WHATSAPP_OPT_OUT_KEYWORDS'))
      )
    : null;
  const consentConfirmationCode = event.messageType === 'text' && !event.isTest && !optOutCommand
    ? detectWhatsAppConsentConfirmation(event.text)
    : null;
  const consentConfirmed = consentConfirmationCode
    ? await confirmPendingWhatsAppConsent(admin, event, baseConversation, persistedMessage, consentConfirmationCode)
    : false;

  if (!event.isTest) {
    if (optOutCommand) {
      const permissionRows = ['service', 'transactional', 'marketing'].map((purpose) => ({
        contact_id: baseConversation.contact_id,
        channel: 'whatsapp',
        purpose,
        status: 'opted_out',
        consent_source: 'customer_inbound_opt_out',
        opted_out_at: event.providerTimestamp,
        source_metadata: {
          provider_message_id: event.providerMessageId,
          command: optOutCommand
        }
      }));
      const { error: permissionError } = await admin
        .schema('crm')
        .from('channel_permissions')
        .upsert(permissionRows, { onConflict: 'contact_id,channel,purpose' });
      if (permissionError) throw permissionError;

      const { data: activeSuppression, error: suppressionLookupError } = await admin
        .schema('crm')
        .from('suppressions')
        .select('id')
        .eq('identifier_type', 'whatsapp')
        .eq('normalized_identifier', event.normalizedFrom)
        .eq('status', 'active')
        .or('channel.eq.whatsapp,channel.is.null')
        .limit(1)
        .maybeSingle();
      if (suppressionLookupError) throw suppressionLookupError;
      if (!activeSuppression) {
        const { error: suppressionInsertError } = await admin
          .schema('crm')
          .from('suppressions')
          .insert({
            contact_id: baseConversation.contact_id,
            contact_point_id: baseConversation.contact_point_id,
            identifier_type: 'whatsapp',
            normalized_identifier: event.normalizedFrom,
            channel: 'whatsapp',
            reason: 'opt_out',
            status: 'active',
            occurred_at: event.providerTimestamp,
            source: 'whatsapp_inbound_keyword',
            source_metadata: {
              provider_message_id: event.providerMessageId,
              command: optOutCommand
            }
          });
        if (suppressionInsertError && suppressionInsertError.code !== '23505') {
          throw suppressionInsertError;
        }
      }
    } else if (!consentConfirmed) {
      const { data: existingServicePermission, error: permissionLookupError } = await admin
        .schema('crm')
        .from('channel_permissions')
        .select('status')
        .eq('contact_id', baseConversation.contact_id)
        .eq('channel', 'whatsapp')
        .eq('purpose', 'service')
        .maybeSingle();
      if (permissionLookupError) throw permissionLookupError;
      if (!['opted_out', 'suppressed', 'invalid', 'complaint'].includes(existingServicePermission?.status || '')) {
        const { error: permissionError } = await admin.schema('crm').from('channel_permissions').upsert({
          contact_id: baseConversation.contact_id,
          channel: 'whatsapp',
          purpose: 'service',
          status: 'allowed',
          consent_source: 'customer_inbound_message',
          consented_at: event.providerTimestamp
        }, { onConflict: 'contact_id,channel,purpose' });
        if (permissionError) throw permissionError;
      }
    }
  }

  const { data: existingActivity, error: activityLookupError } = await admin
    .schema('crm')
    .from('activities')
    .select('id')
    .eq('message_id', persistedMessage.id)
    .eq('activity_type', 'whatsapp_inbound')
    .limit(1)
    .maybeSingle();
  if (activityLookupError) throw activityLookupError;
  if (!existingActivity) {
    const { error: activityError } = await admin.schema('crm').from('activities').insert({
      contact_id: baseConversation.contact_id,
      conversation_id: conversation.id,
      message_id: persistedMessage.id,
      activity_type: 'whatsapp_inbound',
      summary: event.isTest
        ? 'Meta webhook sample message received'
        : optOutCommand ? 'WhatsApp opt-out received'
          : consentConfirmed ? 'WhatsApp consent confirmation received'
            : 'Inbound WhatsApp message received',
      metadata: {
        is_test: Boolean(event.isTest),
        sample_source: event.isTest ? 'meta_developers_test_button' : null,
        opt_out_recorded: Boolean(optOutCommand && !event.isTest),
        opt_out_command: optOutCommand || null,
        consent_confirmed: consentConfirmed
      },
      occurred_at: event.providerTimestamp
    });
    if (activityError) throw activityError;
  }

  return true;
}

async function processPersistedEvents(
  admin: ReturnType<typeof createClient>,
  inboxEventId: string,
  events: Array<Record<string, any>>
) {
  let stage = 'mark_webhook_processing';
  try {
    await admin.schema('crm').from('webhook_events').update({
      processing_status: 'processing',
      attempt_count: 1,
      last_error: null
    }).eq('id', inboxEventId);

    stage = 'process_normalized_events';
    let fullyProcessed = true;
    for (const event of events) {
      const processed = event.kind === 'status'
        ? await processStatusEvent(admin, event)
        : await processInboundEvent(admin, event);
      fullyProcessed = fullyProcessed && processed;
    }

    stage = 'finalize_webhook_processing';
    await admin.schema('crm').from('webhook_events').update({
      processing_status: fullyProcessed ? 'processed' : 'received',
      processed_at: fullyProcessed ? new Date().toISOString() : null,
      next_attempt_at: fullyProcessed ? null : new Date(Date.now() + 60_000).toISOString(),
      last_error: fullyProcessed ? null : 'Waiting for related CRM/provider record'
    }).eq('id', inboxEventId);
  } catch (error) {
    try {
      await admin.schema('crm').from('webhook_events').update({
        processing_status: 'failed',
        next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
        last_error: `Webhook event processing failed at ${stage}`
      }).eq('id', inboxEventId);
    } catch (statusUpdateError) {
      console.error(JSON.stringify({
        event: 'whatsapp_webhook_background_status_update_failed',
        stage,
        ...safeErrorDiagnostic(statusUpdateError)
      }));
    }
    console.error(JSON.stringify({
      event: 'whatsapp_webhook_background_failed',
      stage,
      ...safeErrorDiagnostic(error)
    }));
  }
}

Deno.serve(async (request: Request) => {
  let stage = 'load_verify_token';
  try {
    const verifyToken = requiredSecret('WHATSAPP_VERIFY_TOKEN', 32);

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const mode = url.searchParams.get('hub.mode');
      const suppliedToken = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      const verification = verifyWebhookSubscription({
        mode,
        token: suppliedToken,
        challenge
      }, verifyToken);
      console.info(JSON.stringify({
        event: 'whatsapp_webhook_verification',
        mode,
        token_present: Boolean(suppliedToken),
        token_matches: verification.verified,
        challenge_present: Boolean(challenge),
        challenge,
        response_status: verification.status
      }));
      return verification.verified
        ? new Response(verification.challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }
          })
        : response(403, { error: 'verification_failed' });
    }

    if (request.method !== 'POST') return response(405, { error: 'method_not_allowed' });

    stage = 'read_request_body';
    const rawBody = await request.text();
    if (rawBody.length > 1_000_000) return response(413, { error: 'payload_too_large' });

    stage = 'load_meta_app_secret';
    const appSecret = requiredSecret('META_APP_SECRET', 24);
    stage = 'verify_meta_signature';
    const validSignature = await verifyMetaSignature(
      rawBody,
      request.headers.get('x-hub-signature-256'),
      appSecret
    );
    if (!validSignature) {
      console.warn(JSON.stringify({
        event: 'whatsapp_webhook_post_rejected',
        stage,
        signature_present: Boolean(request.headers.get('x-hub-signature-256')),
        body_bytes: new TextEncoder().encode(rawBody).byteLength,
        response_status: 401
      }));
      return response(401, { error: 'invalid_signature' });
    }

    stage = 'parse_json_payload';
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return response(400, { error: 'invalid_json' });
    }

    stage = 'validate_webhook_scope';
    const allowedWabas = envSet('WHATSAPP_BUSINESS_ACCOUNT_ID');
    const allowedPhones = envSet('WHATSAPP_PHONE_NUMBER_ID');
    const allowMetaTestPayloads = Deno.env.get('WHATSAPP_ALLOW_META_TEST_PAYLOADS') === 'true';
    const allowedMetaTestPhones = envSet('WHATSAPP_META_TEST_PHONE_NUMBER_IDS');
    const metaTestPayload = allowMetaTestPayloads
      && isMetaTestPayload(payload, allowedMetaTestPhones);
    const receivedWabaIds = [...new Set(
      (Array.isArray(payload?.entry) ? payload.entry : [])
        .map((entry: Record<string, any>) => String(entry?.id || '').trim())
        .filter(Boolean)
    )];
    const receivedPhoneNumberIds = [...new Set(
      (Array.isArray(payload?.entry) ? payload.entry : [])
        .flatMap((entry: Record<string, any>) => Array.isArray(entry?.changes) ? entry.changes : [])
        .map((change: Record<string, any>) => String(change?.value?.metadata?.phone_number_id || '').trim())
        .filter(Boolean)
    )];
    const receivedFields = [...new Set(
      (Array.isArray(payload?.entry) ? payload.entry : [])
        .flatMap((entry: Record<string, any>) => Array.isArray(entry?.changes) ? entry.changes : [])
        .map((change: Record<string, any>) => String(change?.field || '').trim())
        .filter(Boolean)
    )];
    if (payload.object !== 'whatsapp_business_account'
      || (!metaTestPayload && !isAllowedWebhookScope(payload, allowedWabas, allowedPhones))) {
      console.warn(JSON.stringify({
        event: 'whatsapp_webhook_post_rejected',
        stage,
        signature_valid: true,
        object: payload.object || null,
        received_waba_ids: receivedWabaIds,
        received_phone_number_ids: receivedPhoneNumberIds,
        fields: receivedFields,
        meta_test_payload: metaTestPayload,
        response_status: 403
      }));
      return response(403, { error: 'invalid_webhook_scope' });
    }

    console.info(JSON.stringify({
      event: 'whatsapp_webhook_post_accepted',
      stage,
      signature_valid: true,
      received_waba_ids: receivedWabaIds,
      received_phone_number_ids: receivedPhoneNumberIds,
      fields: receivedFields,
      meta_test_payload: metaTestPayload
    }));

    stage = 'initialize_supabase_client';
    const admin = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    stage = 'normalize_webhook_events';
    const payloadHash = await sha256Hex(rawBody);
    const events = classifyWebhookPayload(payload)
      .map((event) => ({ ...event, isTest: metaTestPayload }));
    stage = 'persist_webhook_event';
    let { data: inboxEvent, error: inboxError } = await admin
      .schema('crm')
      .from('webhook_events')
      .insert({
        payload_hash: payloadHash,
        signature_verified: true,
        event_type: `${metaTestPayload ? 'test:' : ''}${events.map((event) => event.kind).join(',') || 'unknown'}`,
        provider_message_id: events[0]?.providerMessageId || null,
        metadata: {
          is_test: metaTestPayload,
          sample_source: metaTestPayload ? 'meta_developers_test_button' : null
        },
        payload
      })
      .select('id')
      .single();

    if (inboxError?.code === '23505') {
      stage = 'load_duplicate_webhook_event';
      const { data: existingEvent, error: existingError } = await admin
        .schema('crm')
        .from('webhook_events')
        .select('id,processing_status')
        .eq('payload_hash', payloadHash)
        .single();
      if (existingError) throw existingError;
      if (existingEvent.processing_status === 'processed') {
        return response(200, { received: true, duplicate: true });
      }
      inboxEvent = existingEvent;
      inboxError = null;
    }
    if (inboxError) throw inboxError;

    stage = 'schedule_background_processing';
    EdgeRuntime.waitUntil(processPersistedEvents(admin, inboxEvent.id, events));
    return response(200, { received: true });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'whatsapp_webhook_request_failed',
      stage,
      ...safeErrorDiagnostic(error)
    }));
    return response(500, { error: 'webhook_processing_failed' });
  }
});
