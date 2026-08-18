const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./_crm-unsubscribe-token');

function response(statusCode, body, contentType = 'text/plain; charset=utf-8') {
    return {
        statusCode,
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        },
        body
    };
}

function adminClient() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('server_not_configured');
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

exports.handler = async (event) => {
    if (!['GET', 'POST'].includes(event.httpMethod)) {
        return response(405, 'Method not allowed');
    }

    const contactId = String(event.queryStringParameters?.contact || '').trim();
    const token = String(event.queryStringParameters?.token || '');
    if (!contactId || !token) return response(400, 'Invalid unsubscribe request');

    try {
        const supabase = adminClient();
        const { data: contact, error: findError } = await supabase
            .from('marketing_contacts')
            .select('id,email')
            .eq('id', contactId)
            .maybeSingle();
        if (findError) throw new Error('contact_lookup_failed');
        if (!contact || !verifyToken(contact.id, contact.email, token)) {
            return response(400, 'Invalid unsubscribe request');
        }

        const { error: contactError } = await supabase
            .from('marketing_contacts')
            .update({
                email_unsubscribed: true,
                email_marketing_allowed: false,
                email_status: 'unsubscribed',
                email_suppression_reason: 'recipient_unsubscribed',
                updated_at: new Date().toISOString()
            })
            .eq('id', contact.id);
        if (contactError) throw new Error('contact_suppression_failed');

        const { error: queueError } = await supabase
            .from('email_queue')
            .update({ status: 'failed', error_message: 'suppressed_recipient_unsubscribed' })
            .eq('contact_id', contact.id)
            .eq('status', 'pending');
        if (queueError) throw new Error('queue_suppression_failed');

        if (event.httpMethod === 'POST') return response(200, '');
        return response(200, confirmationHtml(), 'text/html; charset=utf-8');
    } catch (error) {
        console.error('[CRM unsubscribe] Request failed:', error.message);
        return response(500, 'Unable to process unsubscribe request');
    }
};

function confirmationHtml() {
    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Baja confirmada | Geobooker</title></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:40px 16px">
<main style="max-width:560px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
<h1 style="margin-top:0">Baja confirmada</h1>
<p>La dirección fue retirada de las comunicaciones comerciales de Geobooker.</p>
<p>Este cambio no elimina ninguna cuenta ni afecta correos transaccionales solicitados por el usuario.</p>
<p><a href="https://geobooker.com.mx">Volver a Geobooker</a></p>
</main></body></html>`;
}
