const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getCorsHeaders, handlePreflight, rejectUnauthorizedOrigin } = require('./_cors');
const { enforceRateLimit } = require('./_rate-limit');
const { getOptionalRequestUser } = require('./_payment-security');
const { resolveCheckoutAuthority } = require('./_checkout-authority');
const {
    assertPaymentStatusSigningConfigured,
    createPaymentStatusToken
} = require('./_payment-status-token');

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
        action: 'create_oxxo_payment',
        maxCalls: 5,
        windowSeconds: 300,
        headers
    });
    if (rateLimitError) return rateLimitError;

    try {
        assertPaymentStatusSigningConfigured();
        const {
            name,
            productId,
            userId,
            metadata: requestMetadata = {}
        } = JSON.parse(event.body || '{}');

        const requestUser = await getOptionalRequestUser(event);
        const isPremiumPayment = productId === 'premium_subscription'
            || requestMetadata?.subscription_type === 'premium_monthly';
        const paymentType = isPremiumPayment
            ? 'premium_subscription'
            : String(requestMetadata?.type || 'ad_payment');

        if (isPremiumPayment && !requestUser) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Authentication required for Premium payment' })
            };
        }

        if (userId && (!requestUser || userId !== requestUser.id)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Payment user does not match the authenticated user' })
            };
        }

        const authority = await resolveCheckoutAuthority({
            paymentType,
            metadata: {
                ...requestMetadata,
                product_id: requestMetadata?.product_id || productId
            },
            requestUser
        });

        if (authority.currency !== 'mxn' || authority.allowOxxo === false) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'OXXO is not available for this payment' })
            };
        }

        const effectiveAmount = authority.amountMinor / 100;
        if (!Number.isFinite(effectiveAmount) || effectiveAmount < 10 || effectiveAmount > 10000) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'OXXO payment amount is outside the allowed range' })
            };
        }

        if (!authority.customerEmail) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'A verified customer email is required' })
            };
        }

        const finalMetadata = {
            ...authority.metadata,
            product_name: authority.productName || 'Geobooker',
            payment_type: 'oxxo'
        };
        if (authority.userId) {
            finalMetadata.user_id = authority.userId;
            finalMetadata.userId = authority.userId;
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: authority.amountMinor,
            currency: 'mxn',
            payment_method_types: ['oxxo'],
            metadata: finalMetadata,
            description: `Pago Geobooker - ${authority.productName}`,
            receipt_email: authority.customerEmail
        });

        const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntent.id, {
            payment_method_data: {
                type: 'oxxo',
                billing_details: {
                    name: name || 'Cliente Geobooker',
                    email: authority.customerEmail
                }
            },
            return_url: `${process.env.URL || 'https://geobooker.com.mx'}/payment/oxxo-pending`
        });

        const oxxoDetails = confirmedIntent.next_action?.oxxo_display_details;
        if (!oxxoDetails) throw new Error('No se pudo generar el voucher de OXXO');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                paymentIntentId: confirmedIntent.id,
                paymentStatusToken: createPaymentStatusToken(confirmedIntent.id),
                voucher: {
                    hostedVoucherUrl: oxxoDetails.hosted_voucher_url,
                    number: oxxoDetails.number,
                    expiresAfter: oxxoDetails.expires_after
                },
                amount: effectiveAmount,
                currency: 'MXN',
                status: 'pending_payment',
                message: 'Voucher generado. El usuario tiene 3 días para pagar en OXXO.'
            })
        };
    } catch (error) {
        console.error('Error creating OXXO payment:', error);
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Error al crear pago OXXO' })
        };
    }
};
