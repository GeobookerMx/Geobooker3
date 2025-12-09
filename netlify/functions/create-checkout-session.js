// Netlify Function: Create Stripe Checkout Session
const Stripe = require('stripe');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    // Validate environment variable
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('STRIPE_SECRET_KEY is not set');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Payment service not configured',
                debug: 'Missing STRIPE_SECRET_KEY'
            })
        };
    }

    try {
        // Initialize Stripe
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        // Parse request body
        const {
            priceId,
            amount,
            productName,
            userId,
            successUrl,
            cancelUrl,
            customerEmail,
            countryCode,
            mode,
            metadata
        } = JSON.parse(event.body);

        // Validate required fields
        if (!priceId && !amount) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Se requiere priceId o amount' })
            };
        }

        // Configure line items
        let lineItems;
        if (priceId) {
            lineItems = [{ price: priceId, quantity: 1 }];
        } else {
            lineItems = [{
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: productName || 'Publicidad Geobooker',
                        description: 'Campaña publicitaria en Geobooker',
                    },
                    unit_amount: amount,
                },
                quantity: 1,
            }];
        }

        // Build session config
        const sessionConfig = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: mode || 'payment',
            success_url: successUrl || `${process.env.URL || 'https://geobooker.com.mx'}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${process.env.URL || 'https://geobooker.com.mx'}/dashboard/upgrade?canceled=true`,
            metadata: {
                userId: userId || '',
                type: metadata?.type || 'payment',
                country: countryCode || 'MX',
                ...metadata
            }
        };

        // Add customer email if provided
        if (customerEmail) {
            sessionConfig.customer_email = customerEmail;
        }

        // Add client reference if userId provided
        if (userId) {
            sessionConfig.client_reference_id = userId;
        }

        // Create session
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
