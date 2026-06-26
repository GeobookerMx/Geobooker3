// Netlify Function para procesar cola de emails automáticamente
// Path: netlify/functions/process-email-queue.js

const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const { resolveEmailSender } = require('./_email-config');
const { buildCampaignEmail, renderCampaignCopy } = require('./_campaign-email');
const { ensureCronOrTrustedOrigin } = require('./_cron-auth');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ NUEVO: Función para obtener fecha en hora de Ciudad de México
const getMexicoDate = () => {
    const now = new Date();
    // Retorna formato YYYY-MM-DD en timezone de México
    return now.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
};

const getMexicoDateTime = () => {
    const now = new Date();
    // Retorna ISO string ajustado a México para timestamps
    return new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).toISOString();
};

exports.handler = async (event, context) => {
    const authError = ensureCronOrTrustedOrigin(event);
    if (authError) return authError;

    try {
        console.log('🚀 Iniciando procesamiento de cola de emails...');
        const body = event.body ? JSON.parse(event.body) : {};
        const requestedLimit = Number(body.limit) || null;

        // 1. Obtener límite diario configurado desde crm_settings y fallback a automation_config
        let dailyLimit = 100;

        const { data: crmSettings } = await supabase
            .from('crm_settings')
            .select('setting_key, setting_value')
            .eq('setting_key', 'campaign_limits')
            .maybeSingle();

        if (crmSettings?.setting_value?.daily_email_limit) {
            dailyLimit = crmSettings.setting_value.daily_email_limit;
        } else {
            const { data: config } = await supabase
                .from('automation_config')
                .select('daily_limit')
                .eq('campaign_type', 'email')
                .maybeSingle();

            dailyLimit = config?.daily_limit || 100;
        }

        // 2. Verificar cuántos emails se han enviado hoy (HORA MÉXICO)
        const today = getMexicoDate();
        const start = `${today}T00:00:00-06:00`;
        const end = `${today}T23:59:59-06:00`;
        console.log(`📅 Fecha México: ${today}`);
        const { count: sentToday } = await supabase
            .from('campaign_history')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_type', 'email')
            .eq('status', 'sent')
            .gte('sent_at', start)
            .lte('sent_at', end);

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
        const batchLimit = Math.min(
            remaining,
            requestedLimit || remaining,
            25
        );

        // ✅ FIX: Dos queries separadas en lugar de join implícito.
        // El join con !inner requiere FK declarada en el schema cache de Supabase.
        // Si la FK no está en el cache, lanza "Could not find a relationship".
        // Usar dos queries evita esa dependencia completamente.
        const { data: queueRows, error: queueError } = await supabase
            .from('email_queue')
            .select('id, contact_id, email_round, priority, created_at')
            .eq('status', 'pending')
            .order('priority', { ascending: false })
            .order('email_round', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(batchLimit);

        if (queueError) throw queueError;

        if (!queueRows || queueRows.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'No hay contactos pendientes en la cola',
                    sent: 0
                })
            };
        }

        // Obtener contactos en una sola query usando IN
        const contactIds = queueRows.map(r => r.contact_id).filter(Boolean);
        const { data: contactsData, error: contactsError } = await supabase
            .from('marketing_contacts')
            .select('id, email, company_name, contact_name, tier, assigned_email_sender, email_sent_count')
            .in('id', contactIds);

        if (contactsError) throw contactsError;

        const contactsById = Object.fromEntries((contactsData || []).map(c => [c.id, c]));

        // Combinar queue + contactos y filtrar los que tengan email válido
        const queueItems = queueRows
            .map(row => ({ ...row, _contact: contactsById[row.contact_id] || null }))
            .filter(item => item._contact?.email);

        if (queueItems.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'No hay contactos con email válido en la cola',
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
                const contact = item._contact;
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

                const finalHtml = buildCampaignEmail({
                    html: template.html_content,
                    subject: template.subject || 'Geobooker Ads',
                    companyName,
                    contactName: greeting,
                    tier: contact.tier
                });

                const finalSubject = renderCampaignCopy(template.subject || 'Geobooker Ads', {
                    contactName: greeting,
                    companyName,
                    tier: contact.tier
                });

                // Enviar email con Resend
                // Enviar email con Resend
                const senderConfig = resolveEmailSender({
                    preferredEmail: contact.assigned_email_sender,
                    preferredName: 'Geobooker Ads'
                });

                const emailResult = await resend.emails.send({
                    from: senderConfig.from,
                    reply_to: senderConfig.replyTo,
                    to: contact.email,
                    subject: finalSubject,
                    html: finalHtml
                });

                if (emailResult?.error) {
                    throw new Error(`Resend: ${emailResult.error.message}`);
                }

                const messageId = emailResult?.data?.id || null;

                // Registrar en historial
                await supabase
                    .from('campaign_history')
                    .insert({
                        contact_id: item.contact_id,
                        campaign_type: 'email',
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        message_id: messageId,
                        details: {
                            subject: finalSubject,
                            tier: contact.tier,
                            template_id: template.id,
                            sender_requested: contact.assigned_email_sender || null,
                            sender_effective: senderConfig.effectiveEmail,
                            reply_to: senderConfig.replyTo,
                            sender_fallback_applied: senderConfig.fallbackApplied,
                            email_round: emailRound
                        }
                    });

                // Actualizar estado en cola
                await supabase
                    .from('email_queue')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        message_id: messageId
                    })
                    .eq('id', item.id);

                // Actualizar contacto: incrementar email_sent_count
                await supabase
                    .from('marketing_contacts')
                    .update({
                        email_status: 'sent',
                        email_sent_at: new Date().toISOString(),
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
                console.error(`❌ Error enviando a ${item._contact?.email || 'unknown'}:`, emailError);
                results.failed++;
                results.errors.push({
                    email: item._contact?.email || 'unknown',
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
                requestedLimit,
                processedBatch: batchLimit,
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



