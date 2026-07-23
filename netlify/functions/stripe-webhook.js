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

async function upsertCommercialEvent(supabase, payload) {
    if (!payload?.source_type || !payload?.source_id) return;

    const record = {
        source_type: payload.source_type,
        source_id: payload.source_id,
        stripe_session_id: payload.stripe_session_id || null,
        stripe_payment_intent: payload.stripe_payment_intent || null,
        customer_email: payload.customer_email || null,
        customer_name: payload.customer_name || null,
        company_name: payload.company_name || payload.customer_name || null,
        service_line: payload.service_line || null,
        package_name: payload.package_name || null,
        currency: payload.currency || 'MXN',
        amount: Number(payload.amount || 0),
        billing_country: payload.billing_country || 'MX',
        tax_status: payload.tax_status || 'pending',
        payment_status: payload.payment_status || 'pending',
        payment_method: payload.payment_method || 'card',
        operational_status: payload.operational_status || 'new',
        crm_status: payload.crm_status || 'new',
        notes: payload.notes || null,
        metadata: payload.metadata || {}
    };

    const { error } = await supabase
        .from('crm_commercial_events')
        .upsert(record, { onConflict: 'source_type,source_id' });

    if (!error) return;

    const missingTable = error.code === '42P01' || String(error.message || '').toLowerCase().includes('crm_commercial_events');
    if (missingTable) {
        console.warn('[stripe-webhook] crm_commercial_events not available yet; skipping bridge sync');
        return;
    }

    throw error;
}

async function upsertConnectClientAccount(supabase, payload = {}) {
    const primaryContactEmail = payload.primary_contact_email || payload.billing_email || payload.contact_email;
    if (!primaryContactEmail) return null;

    const record = {
        company_name: payload.company_name || payload.primary_contact_name || 'Cliente Connect',
        primary_contact_name: payload.primary_contact_name || null,
        primary_contact_email: primaryContactEmail,
        primary_contact_phone: payload.primary_contact_phone || null,
        company_website: payload.company_website || null,
        country: payload.country || 'Mexico',
        status: payload.status || 'active',
        notes: payload.notes || null
    };

    const { data, error } = await supabase
        .from('connect_client_accounts')
        .upsert(record, { onConflict: 'primary_contact_email' })
        .select('*')
        .single();

    if (!error) {
        return data;
    }

    const missingTable = error.code === '42P01' || String(error.message || '').toLowerCase().includes('connect_client_accounts');
    if (missingTable) {
        console.warn('[stripe-webhook] connect_client_accounts not available yet; skipping client account sync');
        return null;
    }

    throw error;
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
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[stripe-webhook] Missing Supabase credentials:', {
            hasUrl: Boolean(supabaseUrl),
            hasKey: Boolean(supabaseKey)
        });
        return { statusCode: 500, body: 'Server configuration error: missing Supabase credentials' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        switch (stripeEvent.type) {
            case 'checkout.session.completed': {
                const session = stripeEvent.data.object;
                const metadata = session.metadata || {};

                // CASO 1: Pago de Publicidad (CampaÃ±a normal)
                if (metadata.type === 'ad_payment') {
                    const campaignId = metadata.campaign_id;
                    if (campaignId) {
                        const billingCountry = metadata.billing_country || 'MX';
                        const stripeAmount = typeof session.amount_total === 'number' ? session.amount_total / 100 : 0;
                        const ivaAmount = Number(metadata.iva_amount_mxn || metadata.iva_amount_usd || metadata.iva_amount || 0);
                        const totalWithIva = Number(metadata.total_amount_mxn || metadata.total_amount_usd || metadata.total_with_iva || 0) || stripeAmount;
                        const invoiceRequired = metadata.invoice_required !== 'false';

                        await supabase
                            .from('ad_campaigns')
                            .update({
                                status: 'pending_review',
                                payment_status: 'paid',
                                stripe_payment_intent: session.payment_intent,
                                payment_method: 'card',
                                stripe_session_id: session.id,
                                billing_country: billingCountry,
                                tax_status: metadata.tax_status || (billingCountry === 'MX' ? 'domestic_mx' : 'export_0_iva'),
                                currency: billingCountry === 'MX' ? 'MXN' : 'USD',
                                client_tax_id: metadata.client_tax_id || null,
                                invoice_required: invoiceRequired,
                                invoice_status: invoiceRequired ? 'pending' : 'not_required',
                                iva_amount: ivaAmount,
                                total_with_iva: totalWithIva
                            })
                            .eq('id', campaignId);

                        const campaign = await loadCampaignForNotifications(supabase, campaignId);
                        if (campaign) {
                            await upsertCommercialEvent(supabase, {
                                source_type: 'ad_campaign',
                                source_id: campaign.id,
                                stripe_payment_intent: session.payment_intent,
                                customer_email: campaign.advertiser_email || session.customer_details?.email || metadata.advertiser_email || null,
                                customer_name: campaign.advertiser_name || metadata.advertiser_name || null,
                                company_name: campaign.advertiser_name || metadata.company || metadata.advertiser_name || null,
                                service_line: 'geobooker_ads',
                                package_name: campaign.ad_level || campaign.campaign_type || metadata.plan || 'ad_campaign',
                                currency: campaign.currency || (billingCountry === 'MX' ? 'MXN' : 'USD'),
                                amount: campaign.total_budget || campaign.budget || metadata.total_budget || metadata.amount || 0,
                                billing_country: campaign.billing_country || billingCountry,
                                tax_status: campaign.tax_status || (billingCountry === 'MX' ? 'domestic_mx' : 'export_0_iva'),
                                payment_status: 'paid',
                                payment_method: 'card',
                                operational_status: campaign.status || 'pending_review',
                                notes: 'Ads purchase | ' + (campaign.target_location || 'Sin segmentacion'),
                                metadata: {
                                    target_location: campaign.target_location || null,
                                    campaign_type: campaign.campaign_type || null,
                                    ad_level: campaign.ad_level || null
                                }
                            });
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

                        // PASO 2: actualizar pago conservando fechas elegidas en checkout
                        const { data: existingCampaign } = await supabase
                            .from('ad_campaigns')
                            .select('start_date, end_date, total_budget, budget')
                            .eq('id', campaignId)
                            .single();

                        const fallbackStartDate = new Date();
                        const durationMonths = parseInt(metadata.duration_months) || 1;
                        const fallbackEndDate = new Date(fallbackStartDate);
                        fallbackEndDate.setMonth(fallbackEndDate.getMonth() + durationMonths);
                        const billingCountry = metadata.billing_country || 'US';
                        const stripeAmount = typeof session.amount_total === 'number' ? session.amount_total / 100 : 0;
                        const ivaAmount = Number(metadata.iva_amount_usd || metadata.iva_amount_mxn || 0);
                        const totalWithIva = Number(metadata.total_amount_usd || metadata.total_amount_mxn || 0) || stripeAmount;
                        const invoiceRequired = billingCountry === 'MX';
                        const preservedStartDate = existingCampaign?.start_date || fallbackStartDate.toISOString().split('T')[0];
                        const preservedEndDate = existingCampaign?.end_date || fallbackEndDate.toISOString().split('T')[0];

                        const { data: updatedCampaign } = await supabase
                            .from('ad_campaigns')
                            .update({
                                status: 'pending_review',
                                payment_status: 'paid',
                                stripe_payment_intent: session.payment_intent,
                                stripe_session_id: session.id,
                                start_date: preservedStartDate,
                                end_date: preservedEndDate,
                                currency: 'USD',
                                billing_country: billingCountry,
                                tax_status: billingCountry === 'MX' ? 'domestic_mx' : 'export_0_iva',
                                invoice_required: invoiceRequired,
                                invoice_status: invoiceRequired ? 'pending' : 'not_required',
                                iva_amount: ivaAmount,
                                total_with_iva: totalWithIva || existingCampaign?.total_budget || existingCampaign?.budget || 0,
                                advertiser_email: advertiserEmail,
                                // Set user_id if we created the account
                                ...(userId && { user_id: userId })
                            })
                            .eq('id', campaignId)
                            .select()
                            .single();

                                                if (updatedCampaign) {
                            try {
                                const contractLanguage = (billingCountry || '').toUpperCase() === 'MX' ? 'es' : 'en';
                                const { error: contractError } = await supabase.from('ad_campaign_contracts').upsert({
                                    campaign_id: updatedCampaign.id,
                                    contract_type: 'enterprise_ads',
                                    language: contractLanguage,
                                    legal_version: 'ads_terms_2026_v1',
                                    status: 'draft',
                                    advertiser_name: updatedCampaign.advertiser_name || metadata.advertiser_name || metadata.company || null,
                                    advertiser_email: advertiserEmail,
                                    billing_country: billingCountry,
                                    campaign_scope: {
                                        plan: metadata.plan || null,
                                        start_date: updatedCampaign.start_date || null,
                                        end_date: updatedCampaign.end_date || null,
                                        target_countries: updatedCampaign.target_countries || [],
                                        target_cities: updatedCampaign.target_cities || [],
                                        ad_level: updatedCampaign.ad_level || null
                                    },
                                    fiscal_snapshot: {
                                        billing_country: billingCountry,
                                        tax_status: updatedCampaign.tax_status || null,
                                        currency: updatedCampaign.currency || 'USD',
                                        subtotal: updatedCampaign.total_budget || updatedCampaign.budget || 0,
                                        iva_amount: updatedCampaign.iva_amount || 0,
                                        total_with_iva: updatedCampaign.total_with_iva || 0
                                    },
                                    terms_snapshot: {
                                        review_sla: '12-72h',
                                        publication_requires_approval: true,
                                        no_guaranteed_sales: true,
                                        digital_payment_required: true
                                    }
                                }, { onConflict: 'campaign_id,contract_type,language,legal_version' });

                                if (contractError) {
                                    console.warn('[stripe-webhook] Contract draft not created:', contractError.message);
                                }
                            } catch (contractError) {
                                console.warn('[stripe-webhook] Contract draft skipped:', contractError.message);
                            }

                            await upsertCommercialEvent(supabase, {
                                source_type: 'ad_campaign',
                                source_id: updatedCampaign.id,
                                stripe_payment_intent: session.payment_intent,
                                customer_email: advertiserEmail,
                                customer_name: updatedCampaign.advertiser_name || metadata.advertiser_name || metadata.company || null,
                                company_name: metadata.company || updatedCampaign.advertiser_name || metadata.advertiser_name || null,
                                service_line: 'geobooker_ads',
                                package_name: updatedCampaign.ad_level || updatedCampaign.campaign_type || metadata.plan || 'enterprise_campaign',
                                currency: updatedCampaign.currency || (metadata.billing_country === 'MX' ? 'MXN' : 'USD'),
                                amount: updatedCampaign.total_budget || updatedCampaign.budget || metadata.total_budget || metadata.amount || 0,
                                billing_country: metadata.billing_country || updatedCampaign.billing_country || 'US',
                                tax_status: updatedCampaign.tax_status || (metadata.billing_country === 'MX' ? 'domestic_mx' : 'export_0_iva'),
                                payment_status: 'paid',
                                payment_method: 'card',
                                operational_status: updatedCampaign.status || 'pending_review',
                                notes: 'Enterprise ads purchase | ' + (updatedCampaign.target_location || 'Sin segmentacion'),
                                metadata: {
                                    start_date: updatedCampaign.start_date || null,
                                    end_date: updatedCampaign.end_date || null,
                                    plan: metadata.plan || null,
                                    company: metadata.company || null
                                }
                            });
                        }

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
                // CASO 1C: Geobooker Connect Launch Reservation
                else if (metadata.type === 'connect_launch_payment') {
                    const connectCampaignId = metadata.connect_campaign_id;
                    const enterpriseLeadId = metadata.enterprise_lead_id;
                    const billingEmail = metadata.billing_email || session.customer_details?.email;

                    if (connectCampaignId) {
                        const { data: connectCampaign, error: connectError } = await supabase
                            .from('connect_campaigns')
                            .update({
                                payment_status: 'paid',
                                fulfillment_status: 'brief_review',
                                stripe_session_id: session.id,
                                stripe_payment_intent: session.payment_intent
                            })
                            .eq('id', connectCampaignId)
                            .select()
                            .single();

                        if (connectError) {
                            console.error('[stripe-webhook] Error updating connect_campaigns:', connectError);
                        }

                        if (enterpriseLeadId) {
                            await supabase
                                .from('enterprise_leads')
                                .update({
                                    status: 'qualified',
                                    service_line: 'geobooker_connect',
                                    intake_source: 'connect_checkout',
                                    launch_offer_code: metadata.package_code || metadata.type,
                                    pricing_snapshot: {
                                        reservation_price_mxn: Number(metadata.reservation_price_mxn || 0),
                                        package_code: metadata.package_code || null,
                                        package_name: metadata.package_name || null
                                    }
                                })
                                .eq('id', enterpriseLeadId);
                        }

                        let clientAccount = null;
                        try {
                            clientAccount = await upsertConnectClientAccount(supabase, {
                                company_name: metadata.company_name || 'Cliente Connect',
                                primary_contact_name: metadata.contact_name || null,
                                primary_contact_email: billingEmail,
                                primary_contact_phone: metadata.contact_phone || null,
                                company_website: metadata.company_website || null,
                                country: metadata.billing_country || 'Mexico',
                                status: 'active',
                                notes: metadata.target_audience
                                    ? 'Connect lead | ' + metadata.target_audience
                                    : 'Connect lead'
                            });
                        } catch (clientError) {
                            console.error('[stripe-webhook] Error syncing connect client account:', clientError);
                        }

                        let hydratedConnectCampaign = connectCampaign;

                        if (connectCampaign && clientAccount?.id) {
                            const { data: linkedCampaign, error: linkError } = await supabase
                                .from('connect_campaigns')
                                .update({ client_account_id: clientAccount.id })
                                .eq('id', connectCampaignId)
                                .select()
                                .single();

                            if (linkError) {
                                console.error('[stripe-webhook] Error linking connect campaign to client account:', linkError);
                            } else {
                                hydratedConnectCampaign = linkedCampaign;
                            }
                        }

                        if (hydratedConnectCampaign) {
                            await upsertCommercialEvent(supabase, {
                                source_type: 'connect_campaign',
                                source_id: hydratedConnectCampaign.id,
                                stripe_session_id: session.id,
                                stripe_payment_intent: session.payment_intent,
                                customer_email: billingEmail,
                                customer_name: metadata.contact_name || metadata.company_name || null,
                                company_name: metadata.company_name || null,
                                service_line: 'geobooker_connect',
                                package_name: hydratedConnectCampaign.package_name || metadata.package_name || 'Piloto Connect 1000',
                                currency: 'MXN',
                                amount: Number(hydratedConnectCampaign.launch_price_mxn || metadata.reservation_price_mxn || 0),
                                billing_country: 'MX',
                                tax_status: 'domestic_mx',
                                payment_status: 'paid',
                                payment_method: 'card',
                                operational_status: hydratedConnectCampaign.fulfillment_status || 'brief_review',
                                notes: 'Connect reservation | Batch ' + (hydratedConnectCampaign.batch_size || 1000),
                                metadata: {
                                    batch_size: hydratedConnectCampaign.batch_size || 1000,
                                    enterprise_lead_id: enterpriseLeadId || null,
                                    package_code: metadata.package_code || null,
                                    client_account_id: clientAccount?.id || null,
                                    target_audience: metadata.target_audience || null,
                                    objective: metadata.objective || null
                                }
                            });
                            await postInternalNotification('notify-admin-connect', {
                                campaign: {
                                    ...hydratedConnectCampaign,
                                    company_name: metadata.company_name,
                                    billing_email: billingEmail,
                                    client_account_id: clientAccount?.id || null
                                }
                            });

                            if (billingEmail) {
                                await postInternalNotification('send-notification-email', {
                                    type: 'connect_launch_received',
                                    data: {
                                        email: billingEmail,
                                        name: metadata.company_name || 'equipo',
                                        companyName: metadata.company_name || '',
                                        packageName: metadata.package_name || 'Piloto Connect 1000',
                                        amount: Number(metadata.reservation_price_mxn || 0),
                                        currency: 'MXN',
                                        batchSize: hydratedConnectCampaign.batch_size || 1000
                                    }
                                });
                            }
                        }

                        console.log('Connect launch reservation paid:', connectCampaignId);
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
                        const billingCountry = metadata.billing_country || 'MX';
                        const ivaAmount = Number(metadata.iva_amount_mxn || metadata.iva_amount || 0);
                        const totalWithIva = Number(metadata.total_amount_mxn || metadata.total_with_iva || 0) || (paymentIntent.amount_received ? paymentIntent.amount_received / 100 : 0);
                        const invoiceRequired = metadata.invoice_required !== 'false';

                        await supabase
                            .from('ad_campaigns')
                            .update({
                                status: 'pending_review',
                                payment_status: 'paid',
                                stripe_payment_intent: paymentIntent.id,
                                payment_method: 'oxxo',
                                billing_country: billingCountry,
                                tax_status: metadata.tax_status || (billingCountry === 'MX' ? 'domestic_mx' : 'export_0_iva'),
                                currency: 'MXN',
                                client_tax_id: metadata.client_tax_id || null,
                                invoice_required: invoiceRequired,
                                invoice_status: invoiceRequired ? 'pending' : 'not_required',
                                iva_amount: ivaAmount,
                                total_with_iva: totalWithIva
                            })
                            .eq('id', metadata.product_id);

                                                const campaign = await loadCampaignForNotifications(supabase, metadata.product_id);
                        if (campaign) {
                            await upsertCommercialEvent(supabase, {
                                source_type: 'ad_campaign',
                                source_id: campaign.id,
                                stripe_payment_intent: paymentIntent.id,
                                customer_email: campaign.advertiser_email || metadata.advertiser_email || null,
                                customer_name: campaign.advertiser_name || metadata.advertiser_name || null,
                                company_name: campaign.advertiser_name || metadata.company || null,
                                service_line: 'geobooker_ads',
                                package_name: campaign.ad_level || campaign.campaign_type || 'ad_campaign',
                                currency: campaign.currency || 'MXN',
                                amount: campaign.total_budget || campaign.budget || metadata.total_budget || metadata.amount || 0,
                                billing_country: campaign.billing_country || metadata.billing_country || 'MX',
                                tax_status: campaign.tax_status || (metadata.billing_country === 'MX' ? 'domestic_mx' : 'export_0_iva'),
                                payment_status: 'paid',
                                payment_method: 'oxxo',
                                operational_status: campaign.status || 'pending_review',
                                notes: 'Ads purchase OXXO | ' + (campaign.target_location || 'Sin segmentacion'),
                                metadata: { payment_type: metadata.payment_type || 'oxxo', target_location: campaign.target_location || null }
                            });
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

                if (metadata.type === 'connect_launch_payment') {
                    const connectCampaignId = metadata.connect_campaign_id;
                    if (connectCampaignId) {
                        const { error } = await supabase
                            .from('connect_campaigns')
                            .update({
                                payment_status: 'expired',
                                fulfillment_status: 'intake'
                            })
                            .eq('id', connectCampaignId);

                        if (error) {
                            console.error(`Error actualizando reserva Connect expirada ${connectCampaignId}:`, error);
                        } else {
                            await upsertCommercialEvent(supabase, {
                                source_type: 'connect_campaign',
                                source_id: connectCampaignId,
                                stripe_session_id: session.id,
                                stripe_payment_intent: session.payment_intent || null,
                                customer_email: metadata.billing_email || session.customer_details?.email || null,
                                customer_name: metadata.company_name || null,
                                company_name: metadata.company_name || null,
                                service_line: 'geobooker_connect',
                                package_name: metadata.package_name || 'Piloto Connect 1000',
                                currency: 'MXN',
                                amount: Number(metadata.reservation_price_mxn || 0),
                                billing_country: 'MX',
                                tax_status: 'domestic_mx',
                                payment_status: 'expired',
                                payment_method: 'card',
                                operational_status: 'intake',
                                notes: 'Connect reservation expired',
                                metadata: { package_code: metadata.package_code || null }
                            });
                            console.log(`Reserva Connect expirada ${connectCampaignId} marcada como expired.`);
                        }
                    }
                } else if (metadata.type === 'ad_payment' || metadata.type === 'enterprise_campaign') {
                    const campaignId = metadata.campaign_id;
                    if (campaignId) {
                        await upsertCommercialEvent(supabase, {
                            source_type: 'ad_campaign',
                            source_id: campaignId,
                            stripe_session_id: session.id,
                            stripe_payment_intent: session.payment_intent || null,
                            customer_email: metadata.advertiser_email || session.customer_details?.email || null,
                            customer_name: metadata.advertiser_name || metadata.company || null,
                            company_name: metadata.company || metadata.advertiser_name || null,
                            service_line: 'geobooker_ads',
                            package_name: metadata.plan || metadata.ad_level || metadata.campaign_type || 'ad_campaign',
                            currency: metadata.billing_country === 'MX' ? 'MXN' : 'USD',
                            amount: Number(metadata.total_budget || metadata.amount || 0),
                            billing_country: metadata.billing_country || 'MX',
                            tax_status: metadata.tax_status || (metadata.billing_country === 'MX' ? 'domestic_mx' : 'export_0_iva'),
                            payment_status: 'expired',
                            payment_method: 'card',
                            operational_status: 'draft_expired',
                            notes: 'Ads checkout session expired',
                            metadata: { original_type: metadata.type || null }
                        });

                        const { error } = await supabase
                            .from('ad_campaigns')
                            .delete()
                            .eq('id', campaignId);

                        if (error) {
                            console.error(`Error eliminando campana expirada ${campaignId}:`, error);
                        } else {
                            console.log(`Borrador de campana expirada ${campaignId} eliminado de la BD.`);
                        }
                    }
                }
                break;
            }

            // CASO: Error de Pago (Tarjeta declinada, etc.)
            case 'payment_intent.payment_failed': {
                const paymentIntent = stripeEvent.data.object;
                const metadata = paymentIntent.metadata || {};
                const connectCampaignId = metadata.connect_campaign_id;
                const campaignId = metadata.campaign_id || metadata.product_id;

                if (connectCampaignId) {
                    const { error } = await supabase
                        .from('connect_campaigns')
                        .update({
                            payment_status: 'failed'
                        })
                        .eq('id', connectCampaignId);

                    if (error) {
                        console.error(`Error actualizando reserva Connect fallida ${connectCampaignId}:`, error);
                    } else {
                        await upsertCommercialEvent(supabase, {
                            source_type: 'connect_campaign',
                            source_id: connectCampaignId,
                            stripe_payment_intent: paymentIntent.id,
                            customer_email: metadata.billing_email || null,
                            customer_name: metadata.company_name || null,
                            company_name: metadata.company_name || null,
                            service_line: 'geobooker_connect',
                            package_name: metadata.package_name || 'Piloto Connect 1000',
                            currency: 'MXN',
                            amount: Number(metadata.reservation_price_mxn || 0),
                            billing_country: 'MX',
                            tax_status: 'domestic_mx',
                            payment_status: 'failed',
                            payment_method: 'card',
                            operational_status: 'intake',
                            notes: 'Connect payment failed',
                            metadata: { failure_type: stripeEvent.type }
                        });
                        console.log(`Pago fallido para reserva Connect ${connectCampaignId}. Estado de pago marcado como failed.`);
                    }
                } else if (campaignId) {
                    const { error } = await supabase
                        .from('ad_campaigns')
                        .update({
                            payment_status: 'failed'
                        })
                        .eq('id', campaignId);

                    if (error) {
                        console.error(`Error actualizando campana fallida ${campaignId}:`, error);
                    } else {
                        await upsertCommercialEvent(supabase, {
                            source_type: 'ad_campaign',
                            source_id: campaignId,
                            stripe_payment_intent: paymentIntent.id,
                            customer_email: metadata.advertiser_email || null,
                            customer_name: metadata.advertiser_name || metadata.company || null,
                            company_name: metadata.company || metadata.advertiser_name || null,
                            service_line: 'geobooker_ads',
                            package_name: metadata.plan || metadata.ad_level || metadata.campaign_type || 'ad_campaign',
                            currency: metadata.billing_country === 'MX' ? 'MXN' : 'USD',
                            amount: Number(metadata.total_budget || metadata.amount || 0),
                            billing_country: metadata.billing_country || 'MX',
                            tax_status: metadata.tax_status || (metadata.billing_country === 'MX' ? 'domestic_mx' : 'export_0_iva'),
                            payment_status: 'failed',
                            payment_method: metadata.payment_type === 'oxxo' ? 'oxxo' : 'card',
                            operational_status: 'payment_failed',
                            notes: 'Ads payment failed',
                            metadata: { failure_type: stripeEvent.type }
                        });
                        console.log(`Pago fallido para campana ${campaignId}. Estado de pago marcado como failed.`);
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





