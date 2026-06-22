const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// IMPORTANTE:
// Para que esto funcione en Netlify, debes agregar estas variables en el Dashboard:
// - STRIPE_WEBHOOK_SECRET
// - STRIPE_SECRET_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY (Â¡No la anon key!)

// Helper: Generate secure temporary password
function generateRandomPassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    const array = new Uint8Array(length);

    // Use crypto for better randomness
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            password += charset[array[i] % charset.length];
        }
    } else {
        // Fallback for older environments
        for (let i = 0; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
    }

    return password;
}

async function updateUserProfileWithFallback(supabase, userId, fullPayload, fallbackPayload = null) {
    const primaryPayload = { ...fullPayload };
    const safeFallbackPayload = fallbackPayload || fullPayload;

    const { error } = await supabase
        .from('user_profiles')
        .update(primaryPayload)
        .eq('id', userId);

    if (!error) {
        return;
    }

    const isMissingColumnError =
        error.code === '42703' ||
        (typeof error.message === 'string' &&
            error.message.toLowerCase().includes('does not exist'));

    if (!isMissingColumnError || JSON.stringify(primaryPayload) === JSON.stringify(safeFallbackPayload)) {
        throw error;
    }

    console.warn('[stripe-webhook] Optional user_profiles column missing, retrying with fallback payload:', error.message);

    const { error: fallbackError } = await supabase
        .from('user_profiles')
        .update(safeFallbackPayload)
        .eq('id', userId);

    if (fallbackError) {
        throw fallbackError;
    }
}


async function postInternalNotification(functionName, payload) {
    if (!process.env.URL) {
        console.warn('[stripe-webhook] process.env.URL is not configured; skipping internal notification', functionName);
        return;
    }

    try {
        await fetch(`${process.env.URL}/.netlify/functions/${functionName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error(`[stripe-webhook] Error calling ${functionName}:`, error);
    }
}

async function loadCampaignForNotifications(supabase, campaignId) {
    const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*, ad_spaces(display_name)')
        .eq('id', campaignId)
        .single();

    if (error) {
        console.error('[stripe-webhook] Could not load campaign for notifications:', error);
        return null;
    }

    return data;
}

async function notifyCampaignReceived(campaign, paymentMethod = 'card') {
    if (!campaign?.advertiser_email) return;

    await postInternalNotification('send-notification-email', {
        type: 'campaign_received',
        data: {
            email: campaign.advertiser_email,
            name: campaign.advertiser_name || 'Anunciante',
            adSpace: campaign.ad_spaces?.display_name || 'Espacio publicitario Geobooker',
            targetLocation: campaign.target_location || 'Segmentacion definida durante tu compra',
            amount: campaign.total_budget || campaign.budget || 0,
            currency: campaign.currency || (campaign.billing_country === 'MX' ? 'MXN' : 'USD'),
            paymentMethod,
            dashboardUrl: 'https://geobooker.com.mx/advertiser/dashboard',
            invoiceText: 'Si necesitas factura, podras solicitarla mas tarde desde tu portal de facturacion.'
        }
    });
}
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

                // CASO 1: Pago de Publicidad (CampaÃ±a normal)
                if (metadata.type === 'ad_payment') {
                    const campaignId = metadata.campaign_id;
                    if (campaignId) {
                        await supabase
                            .from('ad_campaigns')
                            .update({
                                status: 'pending_review',
                                payment_status: 'paid',
                                stripe_payment_intent: session.payment_intent,
                                payment_method: 'card'
                            })
                            .eq('id', campaignId);

                        const campaign = await loadCampaignForNotifications(supabase, campaignId);
                        if (campaign) {
                            await postInternalNotification('notify-admin-campaign', { campaign });
                            await notifyCampaignReceived(campaign, 'card');
                        }

                        console.log(`CampaÃ±a ${campaignId} pagada y enviada a revisiÃ³n.`);
                    }
                }
                // CASO 1B: CampaÃ±a Enterprise (auto-activaciÃ³n para clientes verificados)
                else if (metadata.type === 'enterprise_campaign') {
                    const campaignId = metadata.campaign_id;
                    const advertiserEmail = metadata.advertiser_email || session.customer_details?.email;

                    if (campaignId && advertiserEmail) {
                        // ðŸ†• PASO 1: Crear cuenta de usuario si no existe
                        let userId = null;
                        let temporaryPassword = null;
                        let isNewUser = false;

                        try {
                            // Verificar si el usuario ya existe
                            const { data: existingUser } = await supabase.auth.admin.getUserByEmail(advertiserEmail);

                            if (!existingUser || !existingUser.user) {
                                // Usuario NO existe, crearlo
                                temporaryPassword = generateRandomPassword();

                                const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
                                    email: advertiserEmail,
                                    password: temporaryPassword,
                                    email_confirm: true, // Auto-confirm email
                                    user_metadata: {
                                        role: 'advertiser',
                                        company_name: metadata.company || metadata.advertiser_name,
                                        created_via: 'enterprise_checkout'
                                    }
                                });

                                if (signUpError) {
                                    console.error('Error creating user:', signUpError);
                                } else {
                                    userId = newUser.user.id;
                                    isNewUser = true;
                                    console.log(`âœ… New advertiser account created: ${advertiserEmail}`);
                                }
                            } else {
                                userId = existingUser.user.id;
                                console.log(`â„¹ï¸ Advertiser account already exists: ${advertiserEmail}`);
                            }
                        } catch (authError) {
                            console.error('Auth error:', authError);
                        }

                        // ðŸ†• PASO 2: Actualizar campaÃ±a con fechas y payment
                        const startDate = new Date();
                        const durationMonths = parseInt(metadata.duration_months) || 1;
                        const endDate = new Date(startDate);
                        endDate.setMonth(endDate.getMonth() + durationMonths);

                        const { data: updatedCampaign } = await supabase
                            .from('ad_campaigns')
                            .update({
                                status: 'pending_review',
                                payment_status: 'paid',
                                stripe_payment_intent: session.payment_intent,
                                start_date: startDate.toISOString().split('T')[0],
                                end_date: endDate.toISOString().split('T')[0],
                                currency: 'USD',
                                tax_status: metadata.billing_country === 'MX' ? 'domestic_mx' : 'export_0_iva',
                                advertiser_email: advertiserEmail,
                                // Set user_id if we created the account
                                ...(userId && { user_id: userId })
                            })
                            .eq('id', campaignId)
                            .select()
                            .single();

                        await postInternalNotification('notify-admin-campaign', { campaign: updatedCampaign });
                        await notifyCampaignReceived(updatedCampaign, 'card');

                        // ðŸ†• PASO 3:  Enviar email de bienvenida (solo si es nuevo usuario)
                        if (isNewUser && temporaryPassword) {
                            try {
                                // Llamar funciÃ³n de email (debes crear send-welcome-email.js)
                                await fetch(`${process.env.URL}/.netlify/functions/send-welcome-email`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        email: advertiserEmail,
                                        password: temporaryPassword,
                                        campaignName: updatedCampaign?.advertiser_name || 'Tu CampaÃ±a',
                                        companyName: metadata.company || metadata.advertiser_name,
                                        dashboardUrl: `${process.env.URL}/advertiser/dashboard`
                                    })
                                });
                                console.log(`ðŸ“§ Welcome email sent to ${advertiserEmail}`);
                            } catch (emailError) {
                                console.error('Error sending welcome email:', emailError);
                                // Don't fail the webhook if email fails
                            }
                        }

                        console.log(`âœ… Enterprise campaign ${campaignId} paid. Plan: ${metadata.plan}, Company: ${metadata.company}, IsNew: ${isNewUser}`);
                    }
                }
                // CASO 2: SuscripciÃ³n Premium (Usuario)
                else {
                    const userId = metadata.userId || session.client_reference_id;
                    if (userId) {
                        const subscriptionId = session.subscription;
                        // Si es modo 'payment' (lifetime) no habrÃ¡ subscriptionId, manejar con cuidado
                        // Para MVP premium recurrente asumimos subscription
                        let premiumUntil = null;

                        if (subscriptionId) {
                            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                            premiumUntil = new Date(subscription.current_period_end * 1000).toISOString();
                        } else {
                            // Caso pago Ãºnico lifetime (ej. 1 aÃ±o fijo sin recurrencia)
                            const oneYearLater = new Date();
                            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
                            premiumUntil = oneYearLater.toISOString();
                        }

                        await updateUserProfileWithFallback(
                            supabase,
                            userId,
                            {
                                is_premium: true,
                                premium_since: new Date().toISOString(),
                                premium_until: premiumUntil,
                                stripe_customer_id: session.customer,
                                stripe_subscription_id: subscriptionId || null
                            },
                            {
                                is_premium: true,
                                premium_since: new Date().toISOString(),
                                premium_until: premiumUntil
                            }
                        );

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

                    await updateUserProfileWithFallback(
                        supabase,
                        userId,
                        {
                            is_premium: true,
                            premium_until: premiumUntil
                        }
                    );

                    console.log(`RenovaciÃ³n exitosa para usuario ${userId}`);
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

                console.log(`SuscripciÃ³n ${subscriptionId} cancelada/finalizada`);
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

                        const campaign = await loadCampaignForNotifications(supabase, metadata.product_id);
                        if (campaign) {
                            await postInternalNotification('notify-admin-campaign', { campaign });
                            await notifyCampaignReceived(campaign, 'oxxo');
                        }

                        console.log(`CampaÃ±a ${metadata.product_id} pagada via OXXO`);
                    }

                    // Si es pago de suscripciÃ³n Ãºnica (no recurrente)
                    if (metadata.user_id && metadata.subscription_type) {
                        const premiumUntil = new Date();
                        premiumUntil.setMonth(premiumUntil.getMonth() + 1);

                        await updateUserProfileWithFallback(
                            supabase,
                            metadata.user_id,
                            {
                                is_premium: true,
                                premium_since: new Date().toISOString(),
                                premium_until: premiumUntil.toISOString(),
                                last_payment_method: 'oxxo'
                            },
                            {
                                is_premium: true,
                                premium_since: new Date().toISOString(),
                                premium_until: premiumUntil.toISOString()
                            }
                        );

                        console.log(`Usuario ${metadata.user_id} activado Premium via OXXO`);
                    }
                }
                break;
            }

            // CASO: ExpiraciÃ³n de SesiÃ³n de Checkout (Limpieza de borradores)
            case 'checkout.session.expired': {
                const session = stripeEvent.data.object;
                const metadata = session.metadata || {};
                
                if (metadata.type === 'ad_payment' || metadata.type === 'enterprise_campaign') {
                    const campaignId = metadata.campaign_id;
                    if (campaignId) {
                        const { error } = await supabase
                            .from('ad_campaigns')
                            .delete()
                            .eq('id', campaignId);
                        
                        if (error) {
                            console.error(`Error eliminando campaÃ±a expirada ${campaignId}:`, error);
                        } else {
                            console.log(`Borrador de campaÃ±a expirada ${campaignId} eliminado de la BD.`);
                        }
                    }
                }
                break;
            }

            // CASO: Error de Pago (Tarjeta declinada, etc.)
            case 'payment_intent.payment_failed': {
                const paymentIntent = stripeEvent.data.object;
                const metadata = paymentIntent.metadata || {};
                const campaignId = metadata.campaign_id || metadata.product_id;
                
                if (campaignId) {
                    const { error } = await supabase
                        .from('ad_campaigns')
                        .update({
                            payment_status: 'failed'
                        })
                        .eq('id', campaignId);
                    
                    if (error) {
                        console.error(`Error actualizando campaÃ±a fallida ${campaignId}:`, error);
                    } else {
                        console.log(`Pago fallido para campaÃ±a ${campaignId}. Estado de pago marcado como failed.`);
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


