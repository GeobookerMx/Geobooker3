// Create stripe instance - check environment variable first
let stripe;
try {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} catch (initError) {
    console.error('Failed to initialize Stripe:', initError.message);
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    // Check if Stripe was initialized
    if (!stripe) {
        console.error('Stripe not initialized - STRIPE_SECRET_KEY missing');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Payment service not configured. Please contact support.',
                debug: 'STRIPE_SECRET_KEY environment variable is missing in Netlify'
            })
        };
    }

    try {
        const {
            priceId,
            productId,
            amount, // Precio en centavos (ej: 900000 para $9000 MXN)
            productName,
            userId,
            successUrl,
            cancelUrl,
            customerEmail,
            countryCode,
            mode,
            metadata
        } = JSON.parse(event.body);

        // Validar que tengamos priceId O amount
        if (!priceId && !amount) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Se requiere priceId o amount' })
            };
        }

        // Configurar line_items según lo que tengamos
        let lineItems;

        if (priceId) {
            // Usar precio predefinido de Stripe
            lineItems = [{
                price: priceId,
                quantity: 1,
            }];
        } else {
            // Usar precio dinámico
            lineItems = [{
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: productName || metadata?.ad_space_name || 'Publicidad Geobooker',
                        description: `Campaña publicitaria en Geobooker`,
                    },
                    unit_amount: amount, // Ya en centavos
                },
                quantity: 1,
            }];
        }

        const sessionConfig = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: mode || 'payment', // 'subscription' o 'payment'
            success_url: successUrl || `${process.env.URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${process.env.URL}/upgrade?canceled=true`,
            customer_email: customerEmail,
            metadata: {
                userId: userId || null,
                type: metadata?.type || 'ad_payment',
                country: countryCode || 'MX',
                ...metadata
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
