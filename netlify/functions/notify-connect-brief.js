const { resolveEmailSender } = require('./_email-config');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function json(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseLeadMessage(message) {
  if (!message) return {};
  if (typeof message === 'object') return message;
  try {
    return JSON.parse(message);
  } catch (_error) {
    return { notes: String(message || '') };
  }
}

function uniqueEmails(values = []) {
  return [...new Set(values.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean))];
}

async function sendEmail({ apiKey, from, replyTo, to, subject, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      reply_to: replyTo,
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Resend request failed');
  }

  return response.json();
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  try {
    const { lead } = JSON.parse(event.body || '{}');
    if (!lead?.company_name || !lead?.contact_email) {
      return json(400, { error: 'Missing Connect brief data' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.warn('[notify-connect-brief] RESEND_API_KEY not configured');
      return json(200, { success: false, skipped: true, reason: 'missing_resend_key' });
    }

    const meta = parseLeadMessage(lead.message);
    const adminRecipients = uniqueEmails([
      process.env.CONNECT_ADMIN_EMAIL,
      process.env.ADMIN_EMAIL,
      'hola@geobooker.com.mx'
    ]);

    const senderConfig = resolveEmailSender({ preferredName: 'Geobooker Connect' });
    const packageName = meta.package_name || lead.selected_plan || 'Piloto Connect';
    const reservationPrice = meta.reservation_price_mxn || lead.reservation_price_mxn || '';
    const batchSize = Number(meta.batch_size || 1000).toLocaleString('es-MX');
    const checkoutUrl = `https://geobooker.com.mx/b2b-connect/checkout?package=${encodeURIComponent(meta.package_code || 'connect_1000')}`;

    const adminHtml = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;padding:24px;">
        <div style="background:linear-gradient(135deg,#0f766e,#1d4ed8);color:white;border-radius:18px 18px 0 0;padding:24px;">
          <p style="margin:0;color:#bbf7d0;font-size:12px;font-weight:700;letter-spacing:.08em;">GEOBOOKER CONNECT</p>
          <h1 style="margin:8px 0 0;font-size:24px;">Nuevo brief inicial B2B</h1>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 18px 18px;padding:24px;">
          <p>Un prospecto solicito evaluacion inicial para Geobooker Connect. Este registro aun no significa pago; es brief/precalificacion.</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Empresa</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700;">${escapeHtml(lead.company_name)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Contacto</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700;">${escapeHtml(lead.contact_name || 'N/A')}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Email</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700;">${escapeHtml(lead.contact_email)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Telefono</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700;">${escapeHtml(lead.contact_phone || meta.contact_phone || 'N/A')}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Audiencia</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700;">${escapeHtml(meta.target_audience || lead.target_cities || 'N/A')}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Objetivo</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700;">${escapeHtml(meta.notes || lead.message || 'N/A')}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Paquete sugerido</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700;">${escapeHtml(packageName)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Reserva</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700;">${reservationPrice ? escapeHtml(reservationPrice) + ' MXN' : 'Pendiente'}</td></tr>
          </table>
          <p style="margin-top:18px;padding:12px 14px;background:#ecfdf5;color:#065f46;border-radius:10px;"><strong>Siguiente accion:</strong> validar audiencia, compliance, copy, remitente y recomendar pago de reserva si el piloto es viable.</p>
          <p style="margin-top:12px;padding:12px 14px;background:#fff7ed;color:#9a3412;border-radius:10px;font-size:13px;"><strong>Marco comercial:</strong> el brief inicial no es contrato ni inicia envios. La reserva requiere aceptacion digital de terminos; la campana aprobada puede documentarse con anexo operativo. Si el cliente requiere CFDI o invoice, solicitar datos fiscales antes de ejecutar.</p>
          <p style="text-align:center;margin-top:22px;"><a href="${checkoutUrl}" style="display:inline-block;background:#0f766e;color:white;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px;">Abrir reserva Connect</a></p>
        </div>
      </div>
    </body></html>`;

    const customerHtml = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:24px;">
        <div style="background:#0f172a;color:white;border-radius:18px;padding:28px;text-align:center;">
          <h1 style="margin:0;font-size:24px;">Recibimos tu brief inicial</h1>
          <p style="margin:12px 0 0;color:#cbd5e1;">Geobooker Connect revisara viabilidad, audiencia y siguiente paso.</p>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:18px;margin-top:14px;padding:24px;">
          <p>Hola${lead.contact_name ? ' ' + escapeHtml(lead.contact_name) : ''},</p>
          <p>Registramos tu solicitud para <strong>${escapeHtml(packageName)}</strong>. Este paso no ejecuta envios todavia: primero revisamos el brief, segmento, riesgos de cumplimiento y alcance operativo.</p>
          <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:14px 16px;border-radius:0 10px 10px 0;margin:18px 0;">
            <strong>Que sigue:</strong>
            <ul style="margin:10px 0 0;padding-left:18px;">
              <li>Validamos si existe audiencia elegible para tu objetivo.</li>
              <li>Definimos copy, filtros y exclusiones.</li>
              <li>Si el piloto es viable, te guiamos para reservar/continuar con pago seguro.</li>
            </ul>
          </div>
          <p style="font-size:13px;color:#64748b;">Este brief no constituye contratacion ni inicio automatico de envios. Si decides reservar, aceptaras los terminos de reserva y, si la campana es aprobada, podremos documentar el alcance con un anexo operativo. Si requieres CFDI o invoice comercial, responde este correo con tus datos fiscales antes de la ejecucion. Para dudas responde a hola@geobooker.com.mx.</p>
        </div>
      </div>
    </body></html>`;

    const adminResult = await sendEmail({
      apiKey: RESEND_API_KEY,
      from: senderConfig.from,
      replyTo: lead.contact_email,
      to: adminRecipients,
      subject: `Nuevo brief Connect: ${lead.company_name}`,
      html: adminHtml
    });

    let customerResult = null;
    try {
      customerResult = await sendEmail({
        apiKey: RESEND_API_KEY,
        from: senderConfig.from,
        replyTo: senderConfig.replyTo || 'hola@geobooker.com.mx',
        to: lead.contact_email,
        subject: 'Recibimos tu brief inicial de Geobooker Connect',
        html: customerHtml
      });
    } catch (customerError) {
      console.warn('[notify-connect-brief] Customer email failed:', customerError.message);
    }

    return json(200, {
      success: true,
      adminRecipients,
      adminEmailId: adminResult?.id || null,
      customerEmailId: customerResult?.id || null
    });
  } catch (error) {
    console.error('[notify-connect-brief] Error:', error);
    return json(500, { error: error.message || 'Connect brief notification failed' });
  }
};
