const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const limit = body.limit || 100;
        const tierFilter = body.tier || null;

        let query = supabase
            .from('marketing_contacts')
            .select('id, contact_name, company_name, email, tier')
            .is('email_sent_at', null)
            .not('email', 'is', null)
            .neq('email', '')
            .order('tier', { ascending: true })
            .limit(limit);

        if (tierFilter) {
            query = query.eq('tier', tierFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        const contacts = data || [];
        const tierDistribution = contacts.reduce((acc, c) => {
            acc[c.tier] = (acc[c.tier] || 0) + 1;
            return acc;
        }, {});

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                contacts_added: contacts.length,
                contacts,
                tier_distribution: tierDistribution,
                message: `Cola generada: ${contacts.length} contactos`
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
