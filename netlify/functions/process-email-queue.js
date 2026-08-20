// Netlify Function para procesar cola de emails automáticamente
// Path: netlify/functions/process-email-queue.js

const { createClient } = require('@supabase/supabase-js');
const { resolveEmailSender } = require('./_email-config');
const { buildCampaignEmail, renderCampaignCopy } = require('./_campaign-email');
const { ensureCronOrAdmin } = require('./_cron-auth');

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

const GET_MEXICO_DATE_TIME = () => {
    const now = new Date();
    // Retorna ISO string ajustado a México para timestamps
    return new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).toISOString();
};

const parsePositiveInt = (value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.floor(parsed), min), max);
};

const truthy = (value) => ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(String(value || '').trim().toLowerCase());

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const classifyResendError = (status, payload = {}) => {
    const type = String(payload?.name || payload?.type || payload?.error?.type || '').toLowerCase();
    const message = String(payload?.message || payload?.error?.message || '').toLowerCase();

    if (status === 429 || type.includes('rate') || message.includes('rate limit')) return 'rate_limited';
    if (type.includes('daily_quota') || message.includes('daily quota')) return 'daily_quota_exceeded';
    if (type.includes('monthly_quota') || message.includes('monthly quota')) return 'monthly_quota_exceeded';
    if (status === 401 || status === 403) return 'auth_or_permission_error';
    if (status >= 500) return 'provider_temporary_error';
    return 'provider_rejected';
};

async function loadEmailGovernance(requestedLimit, body = {}) {
    const defaults = {
        dailyLimit: parsePositiveInt(process.env.CRM_EMAIL_DAILY_LIMIT || process.env.RESEND_DAILY_EMAIL_LIMIT, 100, { min: 1, max: 100000 }),
        maxPerRun: parsePositiveInt(process.env.CRM_EMAILS_PER_RUN_MAX || process.env.RESEND_EMAILS_PER_RUN_MAX, 25, { min: 1, max: 100 }),
        requestDelayMs: parsePositiveInt(process.env.CRM_EMAIL_REQUEST_DELAY_MS || process.env.RESEND_REQUEST_DELAY_MS, 250, { min: 200, max: 10000 }),
        sendingEnabled: truthy(process.env.CRM_EMAIL_SENDING_ENABLED || process.env.RESEND_EMAIL_SENDING_ENABLED),
        dryRun: truthy(body.dryRun || body.previewOnly || body.preview)
    };

    const { data: crmSettings } = await supabase
        .from('crm_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', 'campaign_limits')
        .maybeSingle();

    const limits = crmSettings?.setting_value || {};
    let automationDailyLimit = null;

    if (!limits?.daily_email_limit) {
        const { data: config } = await supabase
            .from('automation_config')
            .select('daily_limit')
            .eq('campaign_type', 'email')
            .maybeSingle();
        automationDailyLimit = config?.daily_limit || null;
    }

    return {
        dailyLimit: parsePositiveInt(body.dailyLimit || limits.daily_email_limit || automationDailyLimit, defaults.dailyLimit, { min: 1, max: 100000 }),
        maxPerRun: parsePositiveInt(body.maxPerRun || limits.email_batch_limit || limits.emails_per_run || requestedLimit, defaults.maxPerRun, { min: 1, max: 100 }),
        requestDelayMs: parsePositiveInt(body.requestDelayMs || limits.email_request_delay_ms, defaults.requestDelayMs, { min: 200, max: 10000 }),
        sendingEnabled: (body.forceSend === true || truthy(body.forceSend))
            ? true
            : Boolean(limits.email_sending_enabled ?? limits.sending_enabled ?? defaults.sendingEnabled),
        dryRun: defaults.dryRun,
        source: crmSettings?.setting_value ? 'crm_settings.campaign_limits' : 'env/defaults'
    };
}

exports.handler = async (event) => {
    const authError = await ensureCronOrAdmin(event);
    if (authError) return authError;

    try {
        console.log('🚀 Iniciando procesamiento de cola de emails...');
        const body = event.body ? JSON.parse(event.body) : {};
        const parsedLimit = Number(body.limit);
        const requestedLimit = Number.isFinite(parsedLimit)
            ? Math.min(Math.max(Math.floor(parsedLimit), 1), 100)
            : null;

        // 1. Obtener límite diario configurado desde crm_settings y fallback a automation_config
        const governance = await loadEmailGovernance(requestedLimit, body);
        const dailyLimit = governance.dailyLimit;

        if (!process.env.RESEND_API_KEY && !governance.dryRun) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
                body: JSON.stringify({
                    success: false,
                    skipped: true,
                    reason: 'missing_resend_api_key',
                    message: 'RESEND_API_KEY no esta configurada; no se enviaron correos.'
                })
            };
        }

        if (!governance.sendingEnabled && !governance.dryRun) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
                body: JSON.stringify({
                    success: true,
                    paused: true,
                    sent: 0,
                    message: 'Envios CRM pausados. Activa CRM_EMAIL_SENDING_ENABLED=true o campaign_limits.email_sending_enabled=true para lanzar.',
                    governance
                })
            };
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
            governance.maxPerRun
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
            .select('id, email, company_name, contact_name, tier, assigned_email_sender, email_sent_count, email_status, is_active, email_unsubscribed')
            .in('id', contactIds);

        if (contactsError) throw contactsError;

        const contactsById = Object.fromEntries((contactsData || []).map(c => [c.id, c]));

        // Combinar queue + contactos y filtrar los que tengan email válido
        const queueItems = queueRows
            .map(row => ({ ...row, _contact: contactsById[row.contact_id] || null }))
            .filter(item => {
                const contact = item._contact;
                if (!contact?.email) return false;
                if (contact.is_active === false) return false;
                if (contact.email_unsubscribed) return false;
                if (['bounced', 'complained', 'suppressed', 'failed', 'unsubscribed'].includes(String(contact.email_status || '').toLowerCase())) return false;
                return true;
            });

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

        if (governance.dryRun) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
                body: JSON.stringify({
                    success: true,
                    dryRun: true,
                    message: `Previsualizacion lista: ${queueItems.length} contactos elegibles; no se envio ningun correo.`,
                    eligible: queueItems.length,
                    dailyLimit,
                    sentToday: sentToday || 0,
                    remaining,
                    batchLimit,
                    governance,
                    preview: queueItems.slice(0, 10).map(item => ({
                        queue_id: item.id,
                        contact_id: item.contact_id,
                        email_round: item.email_round || 1,
                        priority: item.priority,
                        email_domain: String(item._contact.email || '').split('@')[1] || null,
                        company_name: item._contact.company_name || null,
                        tier: item._contact.tier || null
                    }))
                })
            };
        }

        // 4. Enviar emails
        const results = {
            sent: 0,
            failed: 0,
            deferred: 0,
            stopped: false,
            stopReason: null,
            providerHints: [],
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

                const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'GeobookerCRM/2.0 (https://geobooker.com.mx)',
                        'Idempotency-Key': `crm-email-queue/${item.id}`
                    },
                    body: JSON.stringify({
                        from: senderConfig.from,
                        reply_to: senderConfig.replyTo,
                        to: contact.email,
                        subject: finalSubject,
                        html: finalHtml
                    })
                });
                const emailResult = await emailResponse.json().catch(() => ({}));
                if (!emailResponse.ok) {
                    const classification = classifyResendError(emailResponse.status, emailResult);
                    const retryAfter = emailResponse.headers.get('retry-after') || emailResponse.headers.get('ratelimit-reset');
                    const providerMessage = emailResult?.message || emailResult?.error?.message || `Resend request failed (${emailResponse.status})`;
                    results.providerHints.push({
                        status: emailResponse.status,
                        classification,
                        retryAfter,
                        rateLimitRemaining: emailResponse.headers.get('ratelimit-remaining'),
                        dailyQuota: emailResponse.headers.get('x-resend-daily-quota'),
                        monthlyQuota: emailResponse.headers.get('x-resend-monthly-quota')
                    });

                    if (['rate_limited', 'daily_quota_exceeded', 'monthly_quota_exceeded', 'provider_temporary_error'].includes(classification)) {
                        await supabase
                            .from('email_queue')
                            .update({
                                status: 'pending',
                                error_message: `${classification}: ${providerMessage}`
                            })
                            .eq('id', item.id);

                        results.deferred++;
                        results.stopped = true;
                        results.stopReason = classification;
                        console.warn(`Deteniendo corrida por ${classification}. El contacto queda pendiente para reintento.`);
                        break;
                    }

                    throw new Error(`${classification}: ${providerMessage}`);
                }

                const messageId = emailResult?.id || emailResult?.data?.id || null;

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

                // Delay configurable para respetar Resend y cuidar reputacion de dominio.
                await wait(governance.requestDelayMs);

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
                deferred: results.deferred,
                stopped: results.stopped,
                stopReason: results.stopReason,
                providerHints: results.providerHints,
                governance,
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



