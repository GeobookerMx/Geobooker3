// netlify/functions/create-oxxo-payment.js
// Función para generar vouchers de pago en OXXO
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Manejar preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const {
            amount,           // Monto en MXN (ej: 119 para $119)
            email,            // Email del cliente
            name,             // Nombre del cliente (requerido por Stripe OXXO)
            productName,      // Nombre del producto (ej: "Hero Banner")
            productId,        // ID del producto/campaña
            userId,           // ID del usuario en Supabase
            description       // Descripción del pago
        } = JSON.parse(event.body);

        // Validaciones
        if (!amount || amount < 10) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'El monto mínimo es $10 MXN' }),
            };
        }

        if (amount > 10000) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'El monto máximo para OXXO es $10,000 MXN' }),
            };
        }

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email es requerido' }),
            };
        }

        // Crear PaymentIntent con OXXO
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convertir a centavos
            currency: 'mxn',
            payment_method_types: ['oxxo'],
            metadata: {
                product_name: productName || 'Geobooker',
                product_id: productId || '',
                user_id: userId || '',
                payment_type: 'oxxo'
            },
            description: description || `Pago Geobooker - ${productName}`,
            receipt_email: email,
        });

        // Confirmar el PaymentIntent para generar el voucher OXXO
        const confirmedIntent = await stripe.paymentIntents.confirm(
            paymentIntent.id,
            {
                payment_method_data: {
                    type: 'oxxo',
                    billing_details: {
                        name: name || email.split('@')[0] || 'Cliente Geobooker',
                        email: email,
                    },
                },
                return_url: `${process.env.URL || 'https://geobooker.com.mx'}/payment/oxxo-pending`,
            }
        );

        // Extraer información del voucher OXXO
        const oxxoDetails = confirmedIntent.next_action?.oxxo_display_details;

        if (!oxxoDetails) {
            throw new Error('No se pudo generar el voucher de OXXO');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                paymentIntentId: confirmedIntent.id,
                voucher: {
                    // URL del voucher con código de barras
                    hostedVoucherUrl: oxxoDetails.hosted_voucher_url,
                    // Número de referencia (16 dígitos)
                    number: oxxoDetails.number,
                    // Fecha de expiración (3 días)
                    expiresAfter: oxxoDetails.expires_after,
                },
                amount: amount,
                currency: 'MXN',
                status: 'pending_payment',
                message: 'Voucher generado. El usuario tiene 3 días para pagar en OXXO.',
            }),
        };

    } catch (error) {
        console.error('Error creating OXXO payment:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Error al crear pago OXXO',
            }),
        };
    }
};
