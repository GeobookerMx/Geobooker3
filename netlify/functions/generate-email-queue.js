const { createClient } = require('@supabase/supabase-js');
const { ensureCronOrAdmin } = require('./_cron-auth');
const { enabled } = require('./_crm-email-guard');

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'method_not_allowed' }) };
    }

    const authError = await ensureCronOrAdmin(event);
    if (authError) return authError;

    if (!enabled('CRM_EMAIL_QUEUE_ENABLED')) {
        return {
            statusCode: 423,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            body: JSON.stringify({ success: false, error: 'crm_email_queue_disabled' })
        };
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const limit = Math.min(Math.max(Math.floor(Number(body.limit) || 10), 1), 50);
        const tierFilter = ['AAA', 'AA', 'A', 'B'].includes(body.tier) ? body.tier : null;

        const { data, error } = await supabase.rpc('generate_daily_email_queue', {
            p_limit: limit,
            p_tier_filter: tierFilter
        });
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        const contactsAdded = result?.contacts_added || 0;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            body: JSON.stringify({
                success: true,
                contacts_added: contactsAdded,
                tier_distribution: result?.tier_distribution || {},
                round_distribution: result?.round_distribution || {},
                message: `Cola generada: ${contactsAdded} contactos aprobados`
            })
        };
    } catch (error) {
        console.error('[CRM email queue] Generation failed:', error.message);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            body: JSON.stringify({ success: false, error: 'crm_email_queue_generation_failed' })
        };
    }
};
