// netlify/functions/notify-admin-campaign.js
/**
 * Notify admin when a paid campaign enters pending review.
 * Works for both standard ad campaigns and enterprise campaigns.
 */

exports.handler = async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { campaign } = JSON.parse(event.body);

        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hola@geobooker.com.mx';
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
            console.warn('RESEND_API_KEY not configured, skipping email');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Email skipped - no API key' })
            };
        }

        const amount = Number(campaign?.total_budget ?? campaign?.budget ?? 0) || 0;
        const currency = (campaign?.currency || (campaign?.billing_country === 'MX' ? 'MXN' : 'USD')).toUpperCase();
        const placement = campaign?.ad_spaces?.display_name || campaign?.space_name || campaign?.ad_space_name || 'Espacio publicitario Geobooker';
        const location = campaign?.target_location || campaign?.targetLocation || 'Sin especificar';
        const campaignType = campaign?.ad_level === 'global' || currency === 'USD' ? 'Enterprise / Global' : 'Publicidad local';

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 20px; }
        .container { max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1d4ed8, #7c3aed); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        .details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { color: #111827; font-weight: 600; text-align: right; }
        .cta { text-align: center; margin-top: 30px; }
        .cta a { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Nueva campana pagada</h1>
        </div>
        <div class="content">
            <p style="text-align: center;"><span class="badge">PENDING REVIEW</span></p>
            <p>Una nueva compra publicitaria entro a revision y requiere validacion del equipo.</p>
            <div class="details">
                <div class="detail-row"><span class="label">Anunciante</span><span class="value">${campaign?.advertiser_name || 'Unknown'}</span></div>
                <div class="detail-row"><span class="label">Email</span><span class="value">${campaign?.advertiser_email || 'N/A'}</span></div>
                <div class="detail-row"><span class="label">Tipo</span><span class="value">${campaignType}</span></div>
                <div class="detail-row"><span class="label">Espacio</span><span class="value">${placement}</span></div>
                <div class="detail-row"><span class="label">Segmentacion</span><span class="value">${location}</span></div>
                <div class="detail-row"><span class="label">Monto</span><span class="value">${amount.toFixed(2)} ${currency}</span></div>
                <div class="detail-row"><span class="label">Pago</span><span class="value">${campaign?.payment_method || campaign?.paymentMethod || 'card'} / ${campaign?.payment_status || 'paid'}</span></div>
                <div class="detail-row"><span class="label">Fechas</span><span class="value">${campaign?.start_date || 'TBD'} -> ${campaign?.end_date || 'Sin definir'}</span></div>
            </div>
            <div class="cta">
                <a href="https://geobooker.com.mx/admin/ads">Revisar campana</a>
            </div>
        </div>
        <div class="footer">Geobooker Ads • Advertising Operations</div>
    </div>
</body>
</html>`;

        const { resolveEmailSender } = require('./_email-config');
        const senderConfig = resolveEmailSender({ preferredName: 'Geobooker Ads' });

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: senderConfig.from,
                to: [ADMIN_EMAIL],
                subject: `Nueva campana pagada: ${campaign?.advertiser_name || 'Sin nombre'} (${amount.toFixed(2)} ${currency})`,
                html: emailHtml
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Resend error:', error);
            throw new Error('Failed to send email');
        }

        const result = await response.json();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                message: 'Admin notified',
                emailId: result.id
            })
        };
    } catch (error) {
        console.error('Notification error:', error);
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: false,
                message: 'Email notification failed (non-critical)'
            })
        };
    }
};
