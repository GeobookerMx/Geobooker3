// Netlify Function: Create Stripe Checkout Session using fetch (no SDK)
// This version uses direct API calls to avoid SDK bundling issues

// Allowed origins — only Geobooker-owned domains may call payment endpoints
const {
    getCorsHeaders,
    handlePreflight,
    rejectUnauthorizedOrigin
} = require('./_cors');
const { enforceRateLimit } = require('./_rate-limit');
const {
    getOptionalRequestUser,
    normalizePaymentReturnUrl,
    validateAmountInMinorUnits
} = require('./_payment-security');
const { resolveCheckoutAuthority } = require('./_checkout-authority');

exports.handler = async (event) => {
    const preflight = handlePreflight(event);
    if (preflight) return preflight;

    const headers = getCorsHeaders(event);
    const originError = rejectUnauthorizedOrigin(event);
    if (originError) return originError;

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const rateLimitError = await enforceRateLimit(event, {
        action: 'create_checkout',
        maxCalls: 10,
        windowSeconds: 60,
        headers
    });
    if (rateLimitError) return rateLimitError;

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
            userId,
            successUrl,
            cancelUrl,
            mode = 'payment',
            metadata: requestMetadata = {},
            allowOxxo = true
        } = JSON.parse(event.body);

        const requestUser = await getOptionalRequestUser(event);
        const paymentType = String(requestMetadata?.type || 'payment');

        if (paymentType === 'premium_subscription' && !requestUser) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Authentication required for Premium checkout' })
            };
        }

        if (userId && (!requestUser || userId !== requestUser.id)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Payment user does not match the authenticated user' })
            };
        }

        if (mode !== 'payment') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Unsupported payment mode' })
            };
        }

        // Validate currency
        const validCurrencies = ['mxn', 'usd'];
        const authority = await resolveCheckoutAuthority({
            paymentType,
            metadata: requestMetadata,
            requestUser
        });
        const finalCurrency = authority.currency;
        const effectiveAmount = authority.amountMinor;
        const effectiveProductName = authority.productName;
        const effectiveCustomerEmail = authority.customerEmail;
        const effectiveAllowOxxo = authority.allowOxxo;
        const metadata = authority.metadata;

        if (!validCurrencies.includes(finalCurrency)) {
            throw Object.assign(new Error('Trusted checkout currency is invalid'), { statusCode: 409 });
        }

        // Build form data for Stripe API
        const formData = new URLSearchParams();

        // Line items
        if (priceId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Client-provided Stripe prices are not accepted' })
            };
        } else if (effectiveAmount) {
            const validatedAmount = validateAmountInMinorUnits(effectiveAmount, finalCurrency);
            formData.append('line_items[0][price_data][currency]', finalCurrency);
            formData.append('line_items[0][price_data][product_data][name]', effectiveProductName || 'Geobooker');
            formData.append('line_items[0][price_data][unit_amount]', String(validatedAmount));
            formData.append('line_items[0][quantity]', '1');
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Se requiere priceId o amount' })
            };
        }

        // Session config
        formData.append('mode', 'payment');

        // Payment methods: card always. OXXO can be disabled for flows where async payment
        // would complicate fulfillment, such as Connect reservations.
        formData.append('payment_method_types[0]', 'card');
        if (finalCurrency === 'mxn' && effectiveAllowOxxo !== false && allowOxxo !== false) {
            formData.append('payment_method_types[1]', 'oxxo');
        }

        formData.append('success_url', normalizePaymentReturnUrl(
            successUrl,
            'https://geobooker.com.mx/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}'
        ));
        formData.append('cancel_url', normalizePaymentReturnUrl(
            cancelUrl,
            'https://geobooker.com.mx/dashboard/upgrade?canceled=true'
        ));

        const trustedCustomerEmail = effectiveCustomerEmail;
        if (trustedCustomerEmail) {
            formData.append('customer_email', trustedCustomerEmail);
        }

        const trustedUserId = authority.userId || null;
        if (trustedUserId) {
            formData.append('client_reference_id', trustedUserId);
            formData.append('metadata[userId]', trustedUserId);
        }

        // Add metadata
        const finalMetadata = {
            type: paymentType,
            country: metadata.country || metadata.billing_country || 'MX',
            ...metadata
        };

        if (trustedUserId) {
            finalMetadata.userId = trustedUserId;
            finalMetadata.user_id = trustedUserId;
        }

        Object.entries(finalMetadata).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(`metadata[${key}]`, String(value));
            }
        });

        Object.entries(finalMetadata).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(`payment_intent_data[metadata][${key}]`, String(value));
            }
        });

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
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
