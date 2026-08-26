const { ensureCronOrAdmin } = require('./_cron-auth');
const {
  getWhatsAppConfig,
  json,
  normalizePhone,
  sendTemplateMessage,
  serverClient
} = require('./_whatsapp-cloud');

function safeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
    ? String(value)
    : '';
}

function safeTemplateName(value) {
  return /^[a-z0-9_]{1,512}$/.test(String(value || '')) ? String(value) : '';
}

function safeLanguageCode(value) {
  return /^[a-z]{2}(?:_[A-Z]{2})?$/.test(String(value || '')) ? String(value) : 'es_MX';
}

async function loadQueueContact(supabase, queueId) {
  const { data: queueItem, error: queueError } = await supabase
    .from('whatsapp_queue')
    .select('id, contact_id, phone_number, source, status')
    .eq('id', queueId)
    .maybeSingle();

  if (queueError) throw queueError;
  if (!queueItem) {
    const error = new Error('queue_item_not_found');
    error.statusCode = 404;
    throw error;
  }
  if (queueItem.status !== 'pending') {
    const error = new Error('queue_item_not_pending');
    error.statusCode = 409;
    throw error;
  }

  const { data: contact, error: contactError } = await supabase
    .from('marketing_contacts')
    .select('id, company_name, contact_name, phone, tier, city, source, country_code')
    .eq('id', queueItem.contact_id)
    .maybeSingle();

  if (contactError) throw contactError;
  if (!contact) {
    const error = new Error('contact_not_found');
    error.statusCode = 404;
    throw error;
  }

  return { queueItem, contact };
}

async function markSent(supabase, { queueItem, contact, providerMessageId }) {
  const now = new Date().toISOString();

  await supabase
    .from('whatsapp_queue')
    .update({
      status: 'sent',
      sent_at: now,
      message_id: providerMessageId || null
    })
    .eq('id', queueItem.id);

  await supabase.rpc('register_campaign_send', {
    p_channel: 'whatsapp',
    p_source: queueItem.source || contact.source || 'csv',
    p_contact_id: contact.id
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { success: false, error: 'method_not_allowed' });
  }

  const authError = await ensureCronOrAdmin(event);
  if (authError) return authError;

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return json(400, { success: false, error: 'invalid_json_body' });
  }

  const queueId = safeUuid(body.queueId);
  if (!queueId) {
    return json(400, { success: false, error: 'invalid_queue_id' });
  }

  const dryRun = Boolean(body.dryRun || body.previewOnly || body.preview);
  const config = getWhatsAppConfig();
  const templateName = safeTemplateName(body.templateName || process.env.WHATSAPP_DEFAULT_TEMPLATE_NAME);
  const languageCode = safeLanguageCode(body.languageCode || process.env.WHATSAPP_DEFAULT_LANGUAGE || 'es_MX');

  if (!templateName) {
    return json(200, {
      success: false,
      skipped: true,
      reason: 'missing_whatsapp_template',
      message: 'Configura WHATSAPP_DEFAULT_TEMPLATE_NAME con un template aprobado por Meta antes de enviar desde CRM.'
    });
  }

  try {
    const supabase = serverClient();
    const { queueItem, contact } = await loadQueueContact(supabase, queueId);
    const recipient = normalizePhone(queueItem.phone_number || contact.phone);

    if (!recipient || recipient.length < 8) {
      return json(400, { success: false, error: 'invalid_recipient_phone' });
    }

    if (dryRun) {
      return json(200, {
        success: true,
        dryRun: true,
        sent: false,
        queueId,
        contact: {
          id: contact.id,
          companyName: contact.company_name,
          tier: contact.tier,
          source: queueItem.source || contact.source || 'csv'
        },
        request: {
          to: recipient,
          templateName,
          languageCode
        }
      });
    }

    if (!config.sendingEnabled) {
      return json(200, {
        success: true,
        paused: true,
        sent: false,
        message: 'WhatsApp Cloud API esta conectado al CRM, pero los envios reales estan pausados con CRM_WHATSAPP_SENDING_ENABLED=false.'
      });
    }

    const provider = await sendTemplateMessage({
      to: recipient,
      templateName,
      languageCode,
      components: Array.isArray(body.components) ? body.components : []
    });
    const providerMessageId = provider?.messages?.[0]?.id || null;

    await markSent(supabase, { queueItem, contact, providerMessageId });

    return json(200, {
      success: true,
      sent: true,
      providerMessageId,
      providerStatus: provider?.messages?.[0]?.message_status || 'accepted'
    });
  } catch (error) {
    return json(error.statusCode || 502, {
      success: false,
      error: error.message || 'whatsapp_queue_send_failed',
      code: error.code || null
    });
  }
};
