// netlify/functions/notify-enterprise-lead.js
/**
 * Sends Enterprise lead notifications after the contact form is submitted.
 * Uses the verified Geobooker sender only; no new email identities are invented.
 */

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatLeadRows(lead = {}) {
    const rows = [
        ['Empresa', lead.company_name],
        ['Contacto', lead.contact_name],
        ['Email', lead.contact_email],
        ['Telefono', lead.contact_phone],
        ['Pais de facturacion / origen', lead.country],
        ['Industria', lead.industry],
        ['Sitio web', lead.company_website],
        ['Plan seleccionado', lead.selected_plan],
        ['Territorios / ciudades', lead.target_cities],
        ['Fechas deseadas', lead.campaign_dates],
        ['Rango de presupuesto', lead.budget_range],
        ['Mensaje', lead.message]
    ];

    return rows
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
        .map(([label, value]) => `
            <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#64748b;width:38%;">${escapeHtml(label)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-weight:600;">${escapeHtml(value)}</td>
            </tr>`)
        .join('');
}

async function sendEmail({ from, replyTo, to, subject, html, apiKey }) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from,
            to: Array.isArray(to) ? to : [to],
            reply_to: replyTo,
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
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { lead } = JSON.parse(event.body || '{}');
        if (!lead?.company_name || !lead?.contact_email) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing lead data' }) };
        }

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
            console.warn('[notify-enterprise-lead] RESEND_API_KEY not configured');
            return { statusCode: 200, headers, body: JSON.stringify({ success: false, skipped: true }) };
        }

        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hola@geobooker.com.mx';
        const { resolveEmailSender } = require('./_email-config');
        const senderConfig = resolveEmailSender({ preferredName: 'Geobooker Enterprise' });
        const leadRows = formatLeadRows(lead);
        const checkoutUrl = lead.selected_plan
            ? `https://geobooker.com.mx/enterprise/checkout?plan=${encodeURIComponent(lead.selected_plan)}${lead.id ? `&lead=${encodeURIComponent(lead.id)}` : ''}`
            : 'https://geobooker.com.mx/enterprise';

        const adminHtml = `
<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:680px;margin:0 auto;padding:24px;">
    <div style="background:#0f172a;color:#fff;border-radius:18px 18px 0 0;padding:24px;">
      <p style="margin:0;color:#f59e0b;font-size:12px;font-weight:700;letter-spacing:.08em;">GEOBOOKER ENTERPRISE</p>
      <h1 style="margin:8px 0 0;font-size:24px;">Nuevo pre-registro Enterprise</h1>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 18px 18px;padding:24px;">
      <p>Un prospecto completo el pre-registro Enterprise. Si ya eligio paquete, el flujo debe continuar a checkout y revision de arte/territorio/fiscalidad.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">${leadRows}</table>
      <p style="margin-top:20px;padding:12px 14px;background:#fef3c7;color:#92400e;border-radius:10px;"><strong>Siguiente accion:</strong> validar territorio, fechas, creative, inventario y tratamiento fiscal. Revision estimada antes de publicar: 12 a 72 horas.</p>
      <p style="text-align:center;margin-top:24px;"><a href="${checkoutUrl}" style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px;">Abrir checkout del plan</a></p>
    </div>
  </div>
</body></html>`;

        const customerHtml = `
<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#0f172a;color:#fff;border-radius:18px;padding:28px;text-align:center;">
      <h1 style="margin:0;font-size:24px;">Pre-registro Enterprise recibido</h1>
      <p style="margin:12px 0 0;color:#cbd5e1;">Gracias por contactar a Geobooker. Registramos tu interes en publicidad territorial y global.</p>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:18px;margin-top:14px;padding:24px;">
      <p>Hola${lead.contact_name ? ` ${escapeHtml(lead.contact_name)}` : ''},</p>
      <p>Tu pre-registro quedo registrado. Si elegiste un paquete estandar, puedes continuar al checkout seguro. La publicacion no es automatica: primero revisamos creatividad, territorio, inventario disponible y cumplimiento fiscal/editorial.</p>
      <p style="padding:12px 14px;background:#ecfeff;color:#155e75;border-radius:10px;"><strong>Tiempo de revision:</strong> 12 a 72 horas antes de aprobar o solicitar ajustes.</p>
      <p style="text-align:center;margin-top:24px;"><a href="${checkoutUrl}" style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px;">Continuar con mi campana</a></p>
      <p style="font-size:13px;color:#64748b;margin-top:22px;">Para soporte o facturacion escribe a hola@geobooker.com.mx.</p>
    </div>
  </div>
</body></html>`;

        const adminResult = await sendEmail({
            from: senderConfig.from,
            replyTo: lead.contact_email,
            to: ADMIN_EMAIL,
            subject: `Enterprise lead: ${lead.company_name} (${lead.selected_plan || 'sin plan'})`,
            html: adminHtml,
            apiKey: RESEND_API_KEY
        });

        let customerResult = null;
        try {
            customerResult = await sendEmail({
                from: senderConfig.from,
                replyTo: senderConfig.replyTo || 'hola@geobooker.com.mx',
                to: lead.contact_email,
                subject: 'Recibimos tu pre-registro Enterprise en Geobooker',
                html: customerHtml,
                apiKey: RESEND_API_KEY
            });
        } catch (customerError) {
            console.warn('[notify-enterprise-lead] Customer confirmation failed:', customerError.message);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, adminEmailId: adminResult?.id, customerEmailId: customerResult?.id || null })
        };
    } catch (error) {
        console.error('[notify-enterprise-lead] Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
