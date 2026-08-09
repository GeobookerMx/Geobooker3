// Netlify Function: Create Stripe Checkout Session using fetch (no SDK)
// This version uses direct API calls to avoid SDK bundling issues

// Allowed origins — only Geobooker-owned domains may call payment endpoints
const ALLOWED_ORIGINS = [
    'https://geobooker.com',
    'https://www.geobooker.com',
    'https://geobooker.com.mx',
    'https://www.geobooker.com.mx'
];

exports.handler = async (event) => {
    const requestOrigin = event.headers.origin || event.headers.Origin || '';
    const corsOrigin = ALLOWED_ORIGINS.includes(requestOrigin)
        ? requestOrigin
        : ALLOWED_ORIGINS[0]; // default to primary domain if origin unrecognized

    const headers = {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Block non-Geobooker origins (belt-and-suspenders, Netlify CDN also enforces CSP)
    if (requestOrigin && !ALLOWED_ORIGINS.includes(requestOrigin)) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Origin not allowed' })
        };
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
            currency = 'mxn', // Default to MXN, but can be 'usd' for Enterprise
            mode = 'payment',
            metadata = {},
            allowOxxo = true
        } = JSON.parse(event.body);

        // Validate currency
        const validCurrencies = ['mxn', 'usd'];
        const finalCurrency = validCurrencies.includes(currency?.toLowerCase()) ? currency.toLowerCase() : 'mxn';

        // Build form data for Stripe API
        const formData = new URLSearchParams();

        // Line items
        if (priceId) {
            formData.append('line_items[0][price]', priceId);
            formData.append('line_items[0][quantity]', '1');
        } else if (amount) {
            formData.append('line_items[0][price_data][currency]', finalCurrency);
            formData.append('line_items[0][price_data][product_data][name]', productName || 'Geobooker Ads');
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

        // Payment methods: card always. OXXO can be disabled for flows where async payment
        // would complicate fulfillment, such as Connect reservations.
        formData.append('payment_method_types[0]', 'card');
        if (finalCurrency === 'mxn' && allowOxxo !== false) {
            formData.append('payment_method_types[1]', 'oxxo');
        }

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
        const finalMetadata = {
            type: metadata.type || 'payment',
            country: metadata.country || metadata.billing_country || 'MX',
            ...metadata
        };

        Object.entries(finalMetadata).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(`metadata[${key}]`, String(value));
            }
        });

        if (mode === 'payment') {
            Object.entries(finalMetadata).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(`payment_intent_data[metadata][${key}]`, String(value));
                }
            });
        }

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
