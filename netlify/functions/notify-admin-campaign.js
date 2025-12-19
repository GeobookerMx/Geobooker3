// netlify/functions/notify-admin-campaign.js
/**
 * Send email to admin when a new Enterprise campaign is created
 * Called from EnterpriseCheckout after successful campaign creation
 * 
 * Uses Resend (free tier: 100 emails/day)
 * Or can use Sendgrid/Mailgun if you prefer
 */

export async function handler(event) {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { campaign } = JSON.parse(event.body);

        // Admin email to notify
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hola@geobooker.com.mx';
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
            console.warn('RESEND_API_KEY not configured, skipping email');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Email skipped - no API key' })
            };
        }

        // Build email content
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        .details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { color: #111827; font-weight: 600; }
        .cta { text-align: center; margin-top: 30px; }
        .cta a { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 New Enterprise Campaign!</h1>
        </div>
        <div class="content">
            <p style="text-align: center;"><span class="badge">⏳ PENDING REVIEW</span></p>
            
            <div class="details">
                <div class="detail-row">
                    <span class="label">Company</span>
                    <span class="value">${campaign.advertiser_name || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Email</span>
                    <span class="value">${campaign.advertiser_email || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Budget</span>
                    <span class="value" style="color: #10b981;">$${campaign.total_budget?.toLocaleString() || 0} USD</span>
                </div>
                <div class="detail-row">
                    <span class="label">Target Countries</span>
                    <span class="value">${campaign.target_countries?.join(', ') || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Target Cities</span>
                    <span class="value">${campaign.target_cities?.slice(0, 5).join(', ') || 'N/A'}${campaign.target_cities?.length > 5 ? '...' : ''}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Duration</span>
                    <span class="value">${campaign.start_date} → ${campaign.end_date || 'Ongoing'}</span>
                </div>
            </div>

            <div class="cta">
                <a href="https://geobooker.com.mx/admin/ads">Review Campaign →</a>
            </div>
        </div>
        <div class="footer">
            Geobooker Enterprise • Advertising Platform
        </div>
    </div>
</body>
</html>
        `;

        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Geobooker Ads <notifications@geobooker.com.mx>',
                to: [ADMIN_EMAIL],
                subject: `🚀 New Enterprise Campaign: ${campaign.advertiser_name} ($${campaign.total_budget?.toLocaleString() || 0})`,
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
        // Don't fail the whole flow if email fails
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: false,
                message: 'Email notification failed (non-critical)'
            })
        };
    }
}
