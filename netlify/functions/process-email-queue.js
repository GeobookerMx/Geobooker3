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

        // 3. Obtener contactos pendientes de la cola (priorizando por tier y ronda)
        const { data: queueItems, error: queueError } = await supabase
            .from('email_queue')
            .select(`
                id,
                contact_id,
                email_round,
                marketing_contacts!inner (
                    email,
                    company_name,
                    contact_name,
                    tier,
                    assigned_email_sender,
                    email_sent_count
                )
            `)
            .eq('status', 'pending')
            .order('priority', { ascending: false })
            .order('email_round', { ascending: true })  // Priorizar ronda 1 primero
            .order('created_at', { ascending: true })
            // LÍMITE DE BATCH: máximo 25 emails por llamada para evitar timeout de Netlify (10s)
            .limit(Math.min(remaining, 25));

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
            errors: [],
            byRound: { round1: 0, round2: 0, round3: 0 }
        };

        // Obtener templates por tipo de ronda
        const templateTypes = {
            1: 'invitation',      // Ronda 1: Invitación inicial
            2: 'followup',        // Ronda 2: Seguimiento
            3: 'reengagement'     // Ronda 3+: Re-engagement
        };

        // Cache de templates
        const templateCache = {};

        // Pre-cargar templates por tipo
        for (const [round, templateType] of Object.entries(templateTypes)) {
            const { data: template } = await supabase
                .from('email_templates')
                .select('*')
                .eq('template_type', templateType)
                .eq('is_active', true)
                .limit(1)
                .single();

            if (template) {
                templateCache[round] = template;
            }
        }

        // Obtener template por defecto si no hay específicos
        const { data: defaultTemplate } = await supabase
            .from('email_templates')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .single();

        for (const item of queueItems) {
            try {
                const contact = item.marketing_contacts;
                const emailRound = item.email_round || 1;

                // 1. Seleccionar template por RONDA primero, luego por tier
                // Prioridad: roundTemplate > tierTemplate > defaultTemplate
                let template = templateCache[emailRound] || templateCache[Math.min(emailRound, 3)];

                // Si no hay template por ronda, buscar por tier
                if (!template) {
                    const { data: tierTemplate } = await supabase
                        .from('email_templates')
                        .select('*')
                        .eq('tier_target', contact.tier)
                        .eq('is_active', true)
                        .limit(1)
                        .single();

                    template = tierTemplate || defaultTemplate;
                }

                if (!template) {
                    throw new Error('No se encontró ninguna plantilla de email activa');
                }

                // Log de la ronda
                const roundName = emailRound === 1 ? 'INVITACIÓN' : emailRound === 2 ? 'SEGUIMIENTO' : 'RE-ENGAGEMENT';
                console.log(`📧 Ronda ${emailRound} (${roundName}) para: ${contact.email}`);

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

                // Actualizar contacto: incrementar email_sent_count
                await supabase
                    .from('marketing_contacts')
                    .update({
                        email_status: 'sent',
                        last_email_sent: new Date().toISOString(),
                        email_sent_count: (contact.email_sent_count || 0) + 1
                    })
                    .eq('id', item.contact_id);

                results.sent++;
                // Rastrear por ronda
                if (emailRound === 1) results.byRound.round1++;
                else if (emailRound === 2) results.byRound.round2++;
                else results.byRound.round3++;

                console.log(`✅ Email enviado a: ${contact.email} (${contact.tier}, Ronda ${emailRound})`);

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
