exports.handler = async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { campaign } = JSON.parse(event.body);
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hola@geobooker.com.mx';
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
        <p><strong>Empresa:</strong> ${campaign.company_name || 'N/A'}</p>
        <p><strong>Email:</strong> ${campaign.billing_email || 'N/A'}</p>
        <p><strong>Paquete:</strong> ${campaign.package_name || 'Piloto Connect'}</p>
        <p><strong>Batch:</strong> ${campaign.batch_size || 0} contactos</p>
        <p><strong>Monto:</strong> ${campaign.launch_price_mxn || 0} MXN</p>
        <p><strong>Estado:</strong> ${campaign.payment_status || 'paid'} / ${campaign.fulfillment_status || 'brief_review'}</p>
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: senderConfig.from,
                to: [ADMIN_EMAIL],
                subject: `Nueva reserva Connect: ${campaign.company_name || 'Sin nombre'}`,
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
