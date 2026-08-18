const { createClient } = require('@supabase/supabase-js');
const { resolveEmailSender } = require('./_email-config');
const { buildCampaignEmail, renderCampaignCopy } = require('./_campaign-email');
const { ensureCronOrAdmin } = require('./_cron-auth');
const {
    contactEligibility,
    configuredBatchLimit,
    configuredDailyLimit,
    enabled,
    retryDelaySeconds
} = require('./_crm-email-guard');
const { unsubscribeUrl } = require('./_crm-unsubscribe-token');

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(body)
    };
}

function mexicoDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
}

async function requireSuccess(query, code) {
    const result = await query;
    if (result.error) throw new Error(code);
    return result.data;
}

async function databaseDailyLimit() {
    const { data: settings, error } = await supabase
        .from('crm_settings')
        .select('setting_value')
        .eq('setting_key', 'campaign_limits')
        .maybeSingle();
    if (error) throw new Error('campaign_limits_lookup_failed');
    return Number(settings?.setting_value?.daily_email_limit || 25);
}

async function approvedTemplate(item, contact) {
    if (item.template_id) {
        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', item.template_id)
            .eq('is_active', true)
            .eq('is_compliance_approved', true)
            .maybeSingle();
        if (error) throw new Error('template_lookup_failed');
        if (data) return data;
    }

    const emailRound = item.email_round || 1;
    const templateType = emailRound === 1 ? 'invitation' : emailRound === 2 ? 'followup' : 'reengagement';
    const { data: roundTemplates, error: roundError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_type', templateType)
        .eq('is_active', true)
        .eq('is_compliance_approved', true)
        .order('updated_at', { ascending: false })
        .limit(1);
    if (roundError) throw new Error('template_lookup_failed');
    if (roundTemplates?.[0]) return roundTemplates[0];

    const { data: tierTemplates, error: tierError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('tier_target', contact.tier)
        .eq('is_active', true)
        .eq('is_compliance_approved', true)
        .order('updated_at', { ascending: false })
        .limit(1);
    if (tierError) throw new Error('template_lookup_failed');
    return tierTemplates?.[0] || null;
}

async function recordRetry(item, error) {
    const nextAttemptCount = Number(item.attempt_count || 0) + 1;
    const status = Number(error.httpStatus || 0);
    const retryable = status === 429 || status >= 500;
    const update = retryable && nextAttemptCount < 3
        ? {
            attempt_count: nextAttemptCount,
            last_attempt_at: new Date().toISOString(),
            next_attempt_at: new Date(Date.now() + retryDelaySeconds(nextAttemptCount) * 1000).toISOString(),
            error_message: `resend_retryable_${status || 'network'}`
        }
        : {
            status: 'failed',
            attempt_count: nextAttemptCount,
            last_attempt_at: new Date().toISOString(),
            next_attempt_at: null,
            error_message: String(error.code || `resend_permanent_${status || 'unknown'}`).slice(0, 180)
        };
    await requireSuccess(supabase.from('email_queue').update(update).eq('id', item.id), 'queue_retry_update_failed');
    return retryable && nextAttemptCount < 3;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

    const authError = await ensureCronOrAdmin(event);
    if (authError) return authError;

    if (!enabled('CRM_EMAIL_SEND_ENABLED')) {
        return json(423, { success: false, error: 'crm_email_send_disabled' });
    }
    if (!process.env.RESEND_API_KEY) {
        return json(503, { success: false, error: 'resend_not_configured' });
    }
    if (String(process.env.CRM_UNSUBSCRIBE_SECRET || '').length < 32) {
        return json(503, { success: false, error: 'crm_unsubscribe_not_configured' });
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const requestedLimit = Number.isFinite(Number(body.limit)) ? Number(body.limit) : null;
        const dailyLimit = configuredDailyLimit(requestedLimit, await databaseDailyLimit());
        const today = mexicoDate();
        const start = `${today}T00:00:00-06:00`;
        const end = `${today}T23:59:59-06:00`;
        const { count: sentToday, error: countError } = await supabase
            .from('campaign_history')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_type', 'email')
            .eq('status', 'sent')
            .gte('sent_at', start)
            .lte('sent_at', end);
        if (countError) throw new Error('daily_send_count_failed');

        const remaining = dailyLimit - (sentToday || 0);
        if (remaining <= 0) {
            return json(200, { success: true, sent: 0, dailyLimit, sentToday, message: 'daily_limit_reached' });
        }

        const batchLimit = configuredBatchLimit(requestedLimit, remaining);
        const candidateLimit = Math.min(batchLimit * 50, 500);
        const now = new Date().toISOString();
        const { data: queueRows, error: queueError } = await supabase
            .from('email_queue')
            .select('id,contact_id,email_round,priority,created_at,template_id,attempt_count,next_attempt_at')
            .eq('status', 'pending')
            .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
            .or('attempt_count.is.null,attempt_count.lt.3')
            .order('priority', { ascending: false })
            .order('email_round', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(candidateLimit);
        if (queueError) throw new Error('queue_lookup_failed');
        if (!queueRows?.length) return json(200, { success: true, sent: 0, message: 'no_eligible_queue_rows' });

        const contactIds = [...new Set(queueRows.map((row) => row.contact_id).filter(Boolean))];
        const { data: contactsData, error: contactsError } = await supabase
            .from('marketing_contacts')
            .select([
                'id', 'email', 'company_name', 'contact_name', 'tier', 'assigned_email_sender',
                'email_sent_count', 'is_active', 'email_unsubscribed', 'email_status',
                'email_marketing_allowed', 'email_contact_basis', 'email_contact_basis_verified_at',
                'compliance_risk', 'crm_readiness_score'
            ].join(','))
            .in('id', contactIds);
        if (contactsError) throw new Error('contact_lookup_failed');

        const contactsById = Object.fromEntries((contactsData || []).map((contact) => [contact.id, contact]));
        const skippedReasons = {};
        const eligibleItems = [];
        for (const row of queueRows) {
            const contact = contactsById[row.contact_id];
            const eligibility = contactEligibility(contact || {});
            if (!eligibility.eligible) {
                for (const reason of eligibility.reasons) skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
                continue;
            }
            eligibleItems.push({ ...row, contact });
            if (eligibleItems.length >= batchLimit) break;
        }

        if (!eligibleItems.length) {
            return json(200, {
                success: true,
                sent: 0,
                skipped: queueRows.length,
                skippedReasons,
                message: 'no_contacts_passed_compliance_gate'
            });
        }

        const results = { sent: 0, failed: 0, retryScheduled: 0, skipped: queueRows.length - eligibleItems.length };
        for (const item of eligibleItems) {
            try {
                const template = await approvedTemplate(item, item.contact);
                if (!template) {
                    const error = new Error('approved_template_required');
                    error.code = 'approved_template_required';
                    throw error;
                }

                const emailRound = item.email_round || 1;
                const optOutUrl = unsubscribeUrl(item.contact.id, item.contact.email);
                const finalSubject = renderCampaignCopy(template.subject || 'Información de Geobooker', {
                    contactName: item.contact.contact_name,
                    companyName: item.contact.company_name,
                    tier: item.contact.tier
                });
                const finalHtml = buildCampaignEmail({
                    html: template.html_content,
                    subject: finalSubject,
                    companyName: item.contact.company_name,
                    contactName: item.contact.contact_name,
                    tier: item.contact.tier,
                    unsubscribeUrl: optOutUrl
                });
                const sender = resolveEmailSender({
                    preferredEmail: item.contact.assigned_email_sender,
                    preferredName: 'Geobooker'
                });

                const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Idempotency-Key': `crm-email-queue/${item.id}`,
                        'User-Agent': 'Geobooker-CRM/2026'
                    },
                    body: JSON.stringify({
                        from: sender.from,
                        reply_to: sender.replyTo,
                        to: item.contact.email,
                        subject: finalSubject,
                        html: finalHtml,
                        headers: {
                            'List-Unsubscribe': `<${optOutUrl}>`,
                            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
                        },
                        tags: [
                            { name: 'source', value: 'geobooker_crm' },
                            { name: 'round', value: `round_${emailRound}` }
                        ]
                    })
                });
                const emailResult = await emailResponse.json().catch(() => ({}));
                if (!emailResponse.ok) {
                    const error = new Error('resend_request_failed');
                    error.httpStatus = emailResponse.status;
                    error.code = `resend_http_${emailResponse.status}`;
                    throw error;
                }

                const sentAt = new Date().toISOString();
                const messageId = emailResult?.id || null;
                await requireSuccess(
                    supabase.from('email_queue').update({
                        status: 'sent', sent_at: sentAt, message_id: messageId,
                        attempt_count: Number(item.attempt_count || 0) + 1,
                        last_attempt_at: sentAt, next_attempt_at: null, error_message: null
                    }).eq('id', item.id),
                    'queue_finalize_failed'
                );
                const { error: historyError } = await supabase.from('campaign_history').insert({
                        contact_id: item.contact.id,
                        campaign_type: 'email',
                        status: 'sent',
                        sent_at: sentAt,
                        message_id: messageId,
                        details: {
                            subject: finalSubject,
                            tier: item.contact.tier,
                            template_id: template.id,
                            sender_effective: sender.effectiveEmail,
                            email_round: emailRound,
                            compliance_version: template.compliance_version
                        }
                    });
                const { error: contactUpdateError } = await supabase.from('marketing_contacts').update({
                        email_status: 'sent',
                        email_sent_at: sentAt,
                        last_email_sent: sentAt,
                        email_sent_count: Number(item.contact.email_sent_count || 0) + 1
                    }).eq('id', item.contact.id);
                if (historyError || contactUpdateError) {
                    console.error('[CRM email] Post-send synchronization incomplete:', item.id);
                }
                results.sent++;
                await new Promise((resolve) => setTimeout(resolve, 750));
            } catch (error) {
                console.error('[CRM email] Queue item failed:', item.id, error.code || error.message);
                const retryScheduled = await recordRetry(item, error);
                if (retryScheduled) results.retryScheduled++;
                else results.failed++;
            }
        }

        return json(200, {
            success: true,
            sent: results.sent,
            failed: results.failed,
            retryScheduled: results.retryScheduled,
            skipped: results.skipped,
            skippedReasons,
            dailyLimit,
            sentToday: (sentToday || 0) + results.sent,
            remaining: Math.max(remaining - results.sent, 0)
        });
    } catch (error) {
        console.error('[CRM email] Processing failed:', error.message);
        return json(500, { success: false, error: 'crm_email_processing_failed' });
    }
};
