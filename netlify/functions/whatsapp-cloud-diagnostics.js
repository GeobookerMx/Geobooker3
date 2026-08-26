const { ensureCronOrAdmin } = require('./_cron-auth');
const { getWhatsAppConfig, json } = require('./_whatsapp-cloud');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return json(405, { success: false, error: 'method_not_allowed' });
  }

  const authError = await ensureCronOrAdmin(event);
  if (authError) return authError;

  const config = getWhatsAppConfig();
  return json(200, {
    success: true,
    configured: {
      graphVersion: config.graphVersion,
      accessToken: Boolean(config.accessToken),
      phoneNumberId: Boolean(config.phoneNumberId),
      businessAccountId: Boolean(config.businessAccountId),
      verifyToken: Boolean(config.verifyToken),
      appSecret: Boolean(config.appSecret),
      sendingEnabled: config.sendingEnabled,
      requireWebhookSignature: config.requireWebhookSignature
    },
    requiredNetlifyEnv: [
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_BUSINESS_ACCOUNT_ID',
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
      'META_APP_SECRET',
      'CRM_WHATSAPP_SENDING_ENABLED'
    ],
    webhookUrl: 'https://geobooker.com.mx/.netlify/functions/whatsapp-webhook'
  });
};
