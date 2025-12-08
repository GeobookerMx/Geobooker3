const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// IMPORTANTE:
// Para que esto funcione en Netlify, debes agregar estas variables en el Dashboard:
// - STRIPE_WEBHOOK_SECRET
// - STRIPE_SECRET_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY (¡No la anon key!)

exports.handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*' };

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // Inicializar cliente Supabase con permisos de Admin (Service Role)
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        switch (stripeEvent.type) {
            case 'checkout.session.completed': {
                const session = stripeEvent.data.object;
                const metadata = session.metadata || {};

                // CASO 1: Pago de Publicidad (Campaña)
                if (metadata.type === 'ad_payment') {
                    const campaignId = metadata.campaign_id;
                    if (campaignId) {
                        await supabase
                            .from('ad_campaigns')
                            .update({
                                status: 'pending_review', // Pasa a revisión del admin
                                payment_status: 'paid',   // (Si agregamos esta columna futura)
                                stripe_payment_intent: session.payment_intent
                            })
                            .eq('id', campaignId);

                        console.log(`Campaña ${campaignId} pagada y enviada a revisión.`);
                    }
                }
                // CASO 2: Suscripción Premium (Usuario)
                else {
                    const userId = metadata.userId || session.client_reference_id;
                    if (userId) {
                        const subscriptionId = session.subscription;
                        // Si es modo 'payment' (lifetime) no habrá subscriptionId, manejar con cuidado
                        // Para MVP premium recurrente asumimos subscription
                        let premiumUntil = null;

                        if (subscriptionId) {
                            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                            premiumUntil = new Date(subscription.current_period_end * 1000).toISOString();
                        } else {
                            // Caso pago único lifetime (ej. 1 año fijo sin recurrencia)
                            const oneYearLater = new Date();
                            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
                            premiumUntil = oneYearLater.toISOString();
                        }

                        await supabase
                            .from('user_profiles')
                            .update({
                                is_premium: true,
                                premium_since: new Date().toISOString(),
                                premium_until: premiumUntil,
                                stripe_customer_id: session.customer,
                                stripe_subscription_id: subscriptionId || null
                            })
                            .eq('id', userId);

                        console.log(`Usuario ${userId} actualizado a Premium hasta ${premiumUntil}`);
                    }
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = stripeEvent.data.object;
                const subscriptionId = invoice.subscription;
                const customerId = invoice.customer;

                // Obtener usuario por stripe_customer_id o subscription_id
                // Asumimos que ya tenemos guardado el stripe_customer_id

                const { data: users } = await supabase
                    .from('user_profiles')
                    .select('id')
                    .eq('stripe_subscription_id', subscriptionId);

                if (users && users.length > 0) {
                    const userId = users[0].id;
                    const premiumUntil = new Date(invoice.lines.data[0].period.end * 1000).toISOString();

                    await supabase
                        .from('user_profiles')
                        .update({
                            is_premium: true,
                            premium_until: premiumUntil
                        })
                        .eq('id', userId);

                    console.log(`Renovación exitosa para usuario ${userId}`);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = stripeEvent.data.object;
                const subscriptionId = subscription.id;

                await supabase
                    .from('user_profiles')
                    .update({
                        is_premium: false
                    })
                    .eq('stripe_subscription_id', subscriptionId);

                console.log(`Suscripción ${subscriptionId} cancelada/finalizada`);
                break;
            }

            // CASO OXXO: Pago confirmado (cuando el usuario paga en OXXO)
            case 'payment_intent.succeeded': {
                const paymentIntent = stripeEvent.data.object;
                const metadata = paymentIntent.metadata || {};

                // Verificar si es un pago OXXO
                if (metadata.payment_type === 'oxxo') {
                    console.log(`Pago OXXO confirmado: ${paymentIntent.id}`);

                    // Si es pago de publicidad
                    if (metadata.product_id) {
                        await supabase
                            .from('ad_campaigns')
                            .update({
                                status: 'pending_review',
                                payment_status: 'paid',
                                stripe_payment_intent: paymentIntent.id,
                                payment_method: 'oxxo'
                            })
                            .eq('id', metadata.product_id);

                        console.log(`Campaña ${metadata.product_id} pagada via OXXO`);
                    }

                    // Si es pago de suscripción única (no recurrente)
                    if (metadata.user_id && metadata.subscription_type) {
                        const premiumUntil = new Date();
                        premiumUntil.setMonth(premiumUntil.getMonth() + 1);

                        await supabase
                            .from('user_profiles')
                            .update({
                                is_premium: true,
                                premium_since: new Date().toISOString(),
                                premium_until: premiumUntil.toISOString(),
                                last_payment_method: 'oxxo'
                            })
                            .eq('id', metadata.user_id);

                        console.log(`Usuario ${metadata.user_id} activado Premium via OXXO`);
                    }
                }
                break;
            }
        }

        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    } catch (error) {
        console.error('Error modificando base de datos:', error);
        return { statusCode: 500, body: 'Database update failed' };
    }
};
