// Netlify Function: Resend Webhook
// Captura eventos de Resend (opens, clicks, bounces)
// Path: netlify/functions/resend-webhook.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    // Verificar que es POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const webhookData = JSON.parse(event.body);

        console.log('📨 Webhook recibido de Resend:', webhookData.type);

        // Validar payload de Resend
        if (!webhookData.type || !webhookData.data) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid payload' })
            };
        }

        // Procesar según tipo de evento
        switch (webhookData.type) {
            case 'email.sent':
                await handleEmailSent(webhookData.data);
                break;

            case 'email.delivered':
                await handleEmailDelivered(webhookData.data);
                break;

            case 'email.opened':
                await handleEmailOpened(webhookData.data);
                break;

            case 'email.clicked':
                await handleEmailClicked(webhookData.data);
                break;

            case 'email.bounced':
                await handleEmailBounced(webhookData.data);
                break;

            case 'email.complained':
                await handleEmailComplained(webhookData.data);
                break;

            default:
                console.log(`⚠️ Tipo de evento no manejado: ${webhookData.type}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Webhook processed successfully'
            })
        };

    } catch (error) {
        console.error('❌ Error procesando webhook:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

// ============================================
// HANDLERS POR TIPO DE EVENTO
// ============================================

async function handleEmailSent(data) {
    console.log('✉️ Email enviado:', data.email_id);

    // Actualizar en email_analytics
    await supabase
        .from('email_analytics')
        .insert({
            message_id: data.email_id,
            recipient_email: data.to,
            event_type: 'sent',
            timestamp: new Date().toISOString()
        });
}

async function handleEmailDelivered(data) {
    console.log('✅ Email entregado:', data.email_id);

    await supabase
        .from('email_analytics')
        .insert({
            message_id: data.email_id,
            recipient_email: data.to,
            event_type: 'delivered',
            timestamp: new Date().toISOString()
        });
}

async function handleEmailOpened(data) {
    console.log('👁️ Email abierto:', data.email_id);

    // Registrar apertura
    await supabase
        .from('email_analytics')
        .insert({
            message_id: data.email_id,
            recipient_email: data.to,
            event_type: 'opened',
            timestamp: new Date().toISOString(),
            metadata: {
                user_agent: data.user_agent,
                ip_address: data.ip_address
            }
        });

    // Encontrar contacto y actualizar
    const { data: contact } = await supabase
        .from('marketing_contacts')
        .select('id')
        .eq('email', data.to)
        .single();

    if (contact) {
        await supabase
            .from('marketing_contacts')
            .update({
                last_email_opened: new Date().toISOString(),
                email_engagement_score: supabase.rpc('increment', { row_id: contact.id, amount: 5 })
            })
            .eq('id', contact.id);
    }
}

async function handleEmailClicked(data) {
    console.log('🖱️ Email click:', data.email_id);

    await supabase
        .from('email_analytics')
        .insert({
            message_id: data.email_id,
            recipient_email: data.to,
            event_type: 'clicked',
            timestamp: new Date().toISOString(),
            metadata: {
                url: data.link,
                user_agent: data.user_agent,
                ip_address: data.ip_address
            }
        });

    // Actualizar contacto (alto engagement)
    const { data: contact } = await supabase
        .from('marketing_contacts')
        .select('id')
        .eq('email', data.to)
        .single();

    if (contact) {
        await supabase
            .from('marketing_contacts')
            .update({
                last_email_clicked: new Date().toISOString(),
                email_engagement_score: supabase.rpc('increment', { row_id: contact.id, amount: 10 })
            })
            .eq('id', contact.id);
    }
}

async function handleEmailBounced(data) {
    console.log('⚠️ Email rebotado:', data.email_id);

    await supabase
        .from('email_analytics')
        .insert({
            message_id: data.email_id,
            recipient_email: data.to,
            event_type: 'bounced',
            timestamp: new Date().toISOString(),
            metadata: {
                bounce_type: data.bounce_type,
                bounce_reason: data.bounce_reason
            }
        });

    // Marcar email como inválido
    await supabase
        .from('marketing_contacts')
        .update({
            email_status: 'bounced',
            is_active: false,
            bounce_reason: data.bounce_reason
        })
        .eq('email', data.to);
}

async function handleEmailComplained(data) {
    console.log('🚫 Spam complaint:', data.email_id);

    await supabase
        .from('email_analytics')
        .insert({
            message_id: data.email_id,
            recipient_email: data.to,
            event_type: 'complained',
            timestamp: new Date().toISOString()
        });

    // Marcar contacto como spam complaint (CRÍTICO)
    await supabase
        .from('marketing_contacts')
        .update({
            email_status: 'complained',
            is_active: false,
            unsubscribed: true
        })
        .eq('email', data.to);
}
