const { createClient } = require('@supabase/supabase-js');
const { ensureCronOrTrustedOrigin } = require('./_cron-auth');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const authError = ensureCronOrTrustedOrigin(event);
    if (authError) return authError

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const limit = body.limit || 100;
        const tierFilter = body.tier || null;

        const { data, error } = await supabase.rpc('generate_daily_email_queue', {
            p_limit: limit,
            p_tier_filter: tierFilter
        });
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        const contactsAdded = result?.contacts_added || 0;
        const tierDistribution = result?.tier_distribution || {};
        const roundDistribution = result?.round_distribution || {};

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                contacts_added: contactsAdded,
                tier_distribution: tierDistribution,
                round_distribution: roundDistribution,
                message: `Cola generada: ${contactsAdded} contactos`
            })
        };

    } catch (error) {
        console.error('❌ Error generando cola:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};

