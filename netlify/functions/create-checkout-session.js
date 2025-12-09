// Netlify Function: Create Stripe Checkout Session using fetch (no SDK)
// This version uses direct API calls to avoid SDK bundling issues

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
    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_KEY) {
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
        // Parse request body
        const {
            priceId,
            amount,
            productName,
            userId,
            successUrl,
            cancelUrl,
            customerEmail,
            mode = 'payment',
            metadata = {}
        } = JSON.parse(event.body);

        // Build form data for Stripe API
        const formData = new URLSearchParams();

        // Line items
        if (priceId) {
            formData.append('line_items[0][price]', priceId);
            formData.append('line_items[0][quantity]', '1');
        } else if (amount) {
            formData.append('line_items[0][price_data][currency]', 'mxn');
            formData.append('line_items[0][price_data][product_data][name]', productName || 'Publicidad Geobooker');
            formData.append('line_items[0][price_data][unit_amount]', String(amount));
            formData.append('line_items[0][quantity]', '1');
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Se requiere priceId o amount' })
            };
        }

        // Session config
        formData.append('mode', mode);
        formData.append('payment_method_types[0]', 'card');
        formData.append('success_url', successUrl || 'https://geobooker.com.mx/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}');
        formData.append('cancel_url', cancelUrl || 'https://geobooker.com.mx/dashboard/upgrade?canceled=true');

        if (customerEmail) {
            formData.append('customer_email', customerEmail);
        }

        if (userId) {
            formData.append('client_reference_id', userId);
            formData.append('metadata[userId]', userId);
        }

        // Add metadata
        formData.append('metadata[type]', metadata.type || 'payment');
        formData.append('metadata[country]', 'MX');

        // Call Stripe API directly
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        const session = await response.json();

        if (!response.ok) {
            console.error('Stripe API error:', session);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    error: session.error?.message || 'Error de Stripe',
                    code: session.error?.code
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                sessionId: session.id,
                url: session.url
            }),
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
