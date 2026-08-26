const { ensureCronOrAdmin } = require('./_cron-auth');
const {
  getWhatsAppConfig,
  json,
  normalizePhone,
  sendTemplateMessage
} = require('./_whatsapp-cloud');

function safeTemplateName(value) {
  return /^[a-z0-9_]{1,512}$/.test(String(value || '')) ? String(value) : '';
}

function safeLanguageCode(value) {
  return /^[a-z]{2}(?:_[A-Z]{2})?$/.test(String(value || '')) ? String(value) : 'es_MX';
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

  const config = getWhatsAppConfig();
  const dryRun = Boolean(body.dryRun || body.previewOnly || body.preview);
  const to = normalizePhone(body.to);
  const templateName = safeTemplateName(body.templateName);
  const languageCode = safeLanguageCode(body.languageCode);
  const components = Array.isArray(body.components) ? body.components : [];

  if (!templateName) {
    return json(400, { success: false, error: 'invalid_template_name' });
  }

  if (!to || to.length < 8) {
    return json(400, { success: false, error: 'invalid_recipient_phone' });
  }

  if (!config.sendingEnabled && !dryRun) {
    return json(200, {
      success: true,
      paused: true,
      sent: false,
      message: 'WhatsApp Cloud API esta configurado en modo seguro. Activa CRM_WHATSAPP_SENDING_ENABLED=true para enviar.'
    });
  }

  if (dryRun) {
    return json(200, {
      success: true,
      dryRun: true,
      sent: false,
      request: {
        to,
        templateName,
        languageCode,
        componentsCount: components.length
      }
    });
  }

  try {
    const provider = await sendTemplateMessage({ to, templateName, languageCode, components });
    const messageId = provider?.messages?.[0]?.id || null;

    return json(200, {
      success: true,
      sent: true,
      providerMessageId: messageId,
      providerStatus: provider?.messages?.[0]?.message_status || 'accepted'
    });
  } catch (error) {
    return json(502, {
      success: false,
      error: 'whatsapp_send_failed',
      code: error.code || null,
      message: error.message
    });
  }
};
