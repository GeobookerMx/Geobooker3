// Netlify Function para procesar cola de emails automáticamente
// Path: netlify/functions/process-email-queue.js

const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    try {
        console.log('🚀 Iniciando procesamiento de cola de emails...');

        // 1. Obtener límite diario configurado
        const { data: config } = await supabase
            .from('automation_config')
            .select('daily_limit')
            .eq('campaign_type', 'email')
            .single();

        const dailyLimit = config?.daily_limit || 100;

        // 2. Verificar cuántos emails se han enviado hoy
        const today = new Date().toISOString().split('T')[0];
        const { count: sentToday } = await supabase
            .from('campaign_history')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_type', 'email')
            .gte('sent_at', `${today}T00:00:00`)
            .lte('sent_at', `${today}T23:59:59`);

        const remaining = dailyLimit - (sentToday || 0);

        if (remaining <= 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Límite diario alcanzado',
                    sent: 0,
                    dailyLimit,
                    sentToday
                })
            };
        }

        console.log(`📊 Límite: ${dailyLimit}, Enviados hoy: ${sentToday}, Restantes: ${remaining}`);

        // 3. Obtener contactos pendientes de la cola (priorizando por tier)
        const { data: queueItems, error: queueError } = await supabase
            .from('email_queue')
            .select(`
                id,
                contact_id,
                marketing_contacts!inner (
                    email,
                    company_name,
                    contact_name,
                    tier,
                    assigned_email_sender
                )
            `)
            .eq('status', 'pending')
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(remaining);

        if (queueError) throw queueError;

        if (!queueItems || queueItems.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'No hay contactos pendientes en la cola',
                    sent: 0
                })
            };
        }

        console.log(`📧 Procesando ${queueItems.length} emails...`);

        // 4. Enviar emails
        const results = {
            sent: 0,
            failed: 0,
            errors: []
        };

        // Obtener el template por defecto o el asignado
        const { data: defaultTemplate } = await supabase
            .from('email_templates')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .single();

        for (const item of queueItems) {
            try {
                const contact = item.marketing_contacts;

                // 1. Buscar template específico por tier
                const { data: tierTemplate } = await supabase
                    .from('email_templates')
                    .select('*')
                    .eq('tier_target', contact.tier)
                    .eq('is_active', true)
                    .limit(1)
                    .single();

                const template = tierTemplate || defaultTemplate;

                if (!template) {
                    throw new Error('No se encontró ninguna plantilla de email activa');
                }

                // 2. Reemplazar variables en el HTML y Subject
                const greeting = contact.contact_name || 'Estimado/a';
                const companyName = contact.company_name || 'su empresa';

                let finalHtml = template.html_content
                    .replace(/{contact_name}/g, greeting)
                    .replace(/{company_name}/g, companyName);

                let finalSubject = template.subject
                    .replace(/{contact_name}/g, greeting)
                    .replace(/{company_name}/g, companyName);

                // Enviar email con Resend
                const emailResult = await resend.emails.send({
                    from: 'Geobooker <ventas@geobooker.com>',
                    to: contact.email,
                    subject: finalSubject,
                    html: finalHtml
                });

                // Registrar en historial
                await supabase
                    .from('campaign_history')
                    .insert({
                        contact_id: item.contact_id,
                        campaign_type: 'email',
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        message_id: emailResult.id,
                        details: {
                            subject: finalSubject,
                            tier: contact.tier,
                            template_id: template.id
                        }
                    });

                // Actualizar estado en cola
                await supabase
                    .from('email_queue')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        message_id: emailResult.id
                    })
                    .eq('id', item.id);

                // Actualizar contacto
                await supabase
                    .from('marketing_contacts')
                    .update({
                        email_status: 'sent',
                        last_email_sent: new Date().toISOString()
                    })
                    .eq('id', item.contact_id);

                results.sent++;
                console.log(`✅ Email enviado a: ${contact.email} (${contact.tier})`);

                // Delay para no saturar (100ms entre emails)
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (emailError) {
                console.error(`❌ Error enviando a ${item.marketing_contacts.email}:`, emailError);
                results.failed++;
                results.errors.push({
                    email: item.marketing_contacts?.email || 'unknown',
                    error: emailError.message
                });

                // Marcar como fallido en la cola
                await supabase
                    .from('email_queue')
                    .update({
                        status: 'failed',
                        error_message: emailError.message
                    })
                    .eq('id', item.id);
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                message: `Procesamiento completado: ${results.sent} enviados, ${results.failed} fallidos`,
                sent: results.sent,
                failed: results.failed,
                dailyLimit,
                sentToday: (sentToday || 0) + results.sent,
                remaining: remaining - results.sent,
                errors: results.errors
            })
        };

    } catch (error) {
        console.error('❌ Error en process-email-queue:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
