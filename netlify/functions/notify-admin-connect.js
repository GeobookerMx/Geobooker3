const { authorizeEmailRequest } = require('./_email-request-auth');

function escapeHtml(value = '') {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

exports.handler = async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const authorization = await authorizeEmailRequest(event, {
        type: 'admin_connect_notification',
        data: {}
    });
    if (!authorization.authorized) {
        return {
            statusCode: authorization.statusCode,
            body: JSON.stringify({ error: authorization.error })
        };
    }

    try {
        const { campaign } = JSON.parse(event.body);
        const adminRecipients = [...new Set([process.env.CONNECT_ADMIN_EMAIL, process.env.ADMIN_EMAIL, 'hola@geobooker.com.mx'].map((email) => String(email || '').trim().toLowerCase()).filter(Boolean))];
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Email skipped - no API key' })
            };
        }

        const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
  <div style="max-width:640px; margin:0 auto; background:white; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#0f766e,#1d4ed8); color:white; padding:28px 24px;">
      <h1 style="margin:0; font-size:24px;">Nueva reserva Geobooker Connect</h1>
    </div>
    <div style="padding:24px;">
      <p>Se confirmo una reserva de lanzamiento y ya puede pasar a <strong>brief_review</strong>.</p>
      <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:18px; margin-top:18px;">
        <p><strong>Empresa:</strong> ${escapeHtml(campaign.company_name || 'N/A')}</p>
        <p><strong>Email:</strong> ${escapeHtml(campaign.billing_email || 'N/A')}</p>
        <p><strong>Paquete:</strong> ${escapeHtml(campaign.package_name || 'Piloto Connect')}</p>
        <p><strong>Batch:</strong> ${escapeHtml(campaign.batch_size || 0)} contactos</p>
        <p><strong>Monto:</strong> ${escapeHtml(campaign.launch_price_mxn || 0)} MXN</p>
        <p><strong>Estado:</strong> ${escapeHtml(campaign.payment_status || 'paid')} / ${escapeHtml(campaign.fulfillment_status || 'brief_review')}</p>
      </div>
      <p style="margin-top:20px;">
        Revisar en admin / Supabase y coordinar kickoff con el cliente.
      </p>
    </div>
  </div>
</body>
</html>`;

        const { resolveEmailSender } = require('./_email-config');
        const senderConfig = resolveEmailSender({ preferredName: 'Geobooker Connect' });

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': `connect-reservation-admin/${campaign.id}`
            },
            body: JSON.stringify({
                from: senderConfig.from,
                to: adminRecipients,
                subject: `Nueva reserva Connect: ${String(campaign.company_name || 'Sin nombre').replace(/[\r\n]/g, ' ').slice(0, 120)}`,
                html
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        console.error('[notify-admin-connect] Error:', error);
        return {
            statusCode: 200,
            body: JSON.stringify({ success: false })
        };
    }
};
