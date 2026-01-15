// Netlify Function: Generate WhatsApp Queue
// Llama a función SQL de Supabase para generar cola diaria de WhatsApp
// Path: netlify/functions/generate-whatsapp-queue.js

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
        console.log('📱 Generando cola de WhatsApp...');

        // Parsear parámetros (si vienen en body)
        const body = event.body ? JSON.parse(event.body) : {};
        const limit = body.limit || 20;
        const tierFilter = body.tier || null;

        // Llamar a función SQL
        const { data, error } = await supabase
            .rpc('generate_daily_whatsapp_queue', {
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
                message: `Cola de WhatsApp generada exitosamente: ${result.contacts_added} contactos`
            })
        };

    } catch (error) {
        console.error('❌ Error generando cola de WhatsApp:', error);

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
