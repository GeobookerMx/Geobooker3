const { createClient } = require('@supabase/supabase-js');
const { normalizeEmail, verifyUnsubscribeToken } = require('./_crm-unsubscribe');

const headers = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

function page(title, message, success) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><main style="max-width:560px;margin:8vh auto;background:#fff;border-radius:18px;padding:36px;box-shadow:0 18px 50px rgba(15,23,42,.12)"><div style="font-size:24px;font-weight:800;color:#1d4ed8">Geobooker</div><h1 style="font-size:25px;margin:22px 0 10px">${title}</h1><p style="line-height:1.65;color:#475569">${message}</p><p style="margin-top:28px"><a href="https://geobooker.com.mx" style="color:#2563eb">Volver a Geobooker</a></p><div style="height:4px;margin-top:28px;border-radius:999px;background:${success ? '#16a34a' : '#dc2626'}"></div></main></body></html>`;
}

exports.handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return { statusCode: 405, headers, body: page('Método no permitido', 'No se pudo procesar esta solicitud.', false) };
  }

  let input = event.queryStringParameters || {};
  if (event.httpMethod === 'POST' && event.body) {
    const contentType = String(event.headers?.['content-type'] || event.headers?.['Content-Type'] || '');
    if (contentType.includes('application/json')) {
      try { input = { ...input, ...JSON.parse(event.body) }; } catch { /* use query params */ }
    } else {
      const params = new URLSearchParams(event.body);
      input = { ...input, ...Object.fromEntries(params.entries()) };
    }
  }

  const email = normalizeEmail(input.email);
  if (!email || !verifyUnsubscribeToken(email, input.token)) {
    return { statusCode: 400, headers, body: page('Enlace no válido', 'El enlace de baja es inválido. Puedes solicitar ayuda en hola@geobooker.com.mx.', false) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { statusCode: 503, headers, body: page('Servicio temporalmente no disponible', 'No pudimos registrar la baja. Inténtalo nuevamente o escribe a hola@geobooker.com.mx.', false) };
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: contacts, error: lookupError } = await supabase
      .from('marketing_contacts')
      .select('id')
      .eq('email', email);
    if (lookupError) throw lookupError;

    const contactIds = (contacts || []).map((contact) => contact.id);
    if (contactIds.length > 0) {
      const { error: updateError } = await supabase
        .from('marketing_contacts')
        .update({ email_unsubscribed: true, email_status: 'unsubscribed', is_active: false })
        .in('id', contactIds);
      if (updateError) throw updateError;

      const { error: queueError } = await supabase
        .from('email_queue')
        .update({ status: 'failed', error_message: 'Recipient unsubscribed' })
        .in('contact_id', contactIds)
        .eq('status', 'pending');
      if (queueError) throw queueError;
    }

    return { statusCode: 200, headers, body: page('Baja confirmada', 'Tu dirección fue excluida de las campañas comerciales de Geobooker. La baja es efectiva desde este momento.', true) };
  } catch (error) {
    console.error('[CRM unsubscribe] Failed:', error.message);
    return { statusCode: 500, headers, body: page('No pudimos completar la baja', 'Inténtalo nuevamente o escribe a hola@geobooker.com.mx.', false) };
  }
};
