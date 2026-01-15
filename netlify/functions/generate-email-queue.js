// Netlify Function: Generate Email Queue
// Llama a función SQL de Supabase para generar cola diaria
// Path: netlify/functions/generate-email-queue.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    // Verificar método
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        console.log('📧 Generando cola de emails...');

        // Parsear parámetros (si vienen en body)
        const body = event.body ? JSON.parse(event.body) : {};
        const limit = body.limit || 100;
        const tierFilter = body.tier || null;

        // Llamar a función SQL
        const { data, error } = await supabase
            .rpc('generate_daily_email_queue', {
                p_limit: limit,
                p_tier_filter: tierFilter
            });

        if (error) throw error;

        const result = data[0];

        console.log(`✅ Cola generada: ${result.contacts_added} contactos`);
        console.log(`📊 Distribución:`, result.tier_distribution);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                contacts_added: result.contacts_added,
                tier_distribution: result.tier_distribution,
                message: `Cola de email generada exitosamente: ${result.contacts_added} contactos`
            })
        };

    } catch (error) {
        console.error('❌ Error generando cola de email:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
