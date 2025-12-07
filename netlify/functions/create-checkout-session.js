const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    try {
        const { priceId, userId, successUrl, cancelUrl, customerEmail, countryCode, mode, metadata } = JSON.parse(event.body);

        if (!priceId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Falta el parámetro requerido: priceId' })
            };
        }

        const sessionConfig = {
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: mode || 'subscription', // 'subscription' o 'payment'
            success_url: successUrl || `${process.env.URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${process.env.URL}/upgrade?canceled=true`,
            customer_email: customerEmail,
            metadata: {
                userId: userId, // Puede ser null para anuncios guest
                type: metadata?.type || 'premium_subscription',
                country: countryCode || 'MX',
                ...metadata // Merge de otros metadatos como campaign_id
            },
            automatic_tax: { enabled: true },
            allow_promotion_codes: true,
        };

        if (userId) {
            sessionConfig.client_reference_id = userId;
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ sessionId: session.id, url: session.url }),
        };
    } catch (error) {
        console.error('Stripe error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
