// netlify/functions/send-notification-email.js
/**
 * Generic email notification function
 * Handles: welcome, business_approved, business_rejected,
 * campaign_received, connect_launch_received, campaign_approved, campaign_rejected, referral_bonus
 */
const { resolveEmailSender } = require('./_email-config');
const { buildCampaignEmail } = require('./_campaign-email');

exports.handler = async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { type, data } = JSON.parse(event.body);

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
            console.warn('RESEND_API_KEY not configured');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Email skipped - no API key' })
            };
        }

        const emailTemplate = getEmailTemplate(type, data || {});
        if (!emailTemplate) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid notification type' })
            };
        }

        const senderEmail = data?.fromEmail || data?.from_email;
        const senderName = data?.fromName || data?.from_name;
        const senderConfig = resolveEmailSender({
            preferredEmail: senderEmail,
            preferredName: (type === 'crm_campaign' || type === 'custom') ? senderName : 'Geobooker Ads'
        });

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: senderConfig.from,
                reply_to: senderConfig.replyTo,
                to: [data.email],
                subject: emailTemplate.subject,
                html: emailTemplate.html
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Resend error:', error);
            throw new Error('Failed to send email');
        }

        const result = await response.json();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                message: 'Email sent',
                emailId: result.id,
                sender: {
                    from: senderConfig.from,
                    replyTo: senderConfig.replyTo,
                    fallbackApplied: senderConfig.fallbackApplied,
                    requestedEmail: senderConfig.requestedEmail,
                    effectiveEmail: senderConfig.effectiveEmail
                }
            })
        };
    } catch (error) {
        console.error('Email error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function formatCurrency(amount = 0, currency = 'MXN') {
    const normalizedCurrency = (currency || 'MXN').toUpperCase();
    try {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: normalizedCurrency,
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);
    } catch (_error) {
        return `${Number(amount || 0).toFixed(2)} ${normalizedCurrency}`;
    }
}

function getCampaignFacts(data) {
    const amount = data.amount ?? data.budget ?? data.totalBudget ?? 0;
    const currency = data.currency || 'MXN';
    const formattedBudget = formatCurrency(amount, currency);
    const placement = data.adSpace || data.spaceName || 'Espacio publicitario Geobooker';
    const targetLocation = data.targetLocation || data.target_location || 'Segmentacion definida durante tu compra';
    const paymentMethod = data.paymentMethod || data.payment_method || 'Card';
    const dashboardUrl = data.dashboardUrl || 'https://geobooker.com.mx/advertiser/dashboard';
    const invoiceText = data.invoiceText || 'Si necesitas factura, podras solicitarla desde tu portal de facturacion.';

    return { formattedBudget, placement, targetLocation, paymentMethod, dashboardUrl, invoiceText };
}


function buildConnectLaunchReceivedEmail(data) {
    const amount = formatCurrency(data.amount || 0, data.currency || 'MXN');
    const batchSize = Number(data.batchSize || 1000).toLocaleString('es-MX');

    return `<!DOCTYPE html><html><head><style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 20px; margin: 0; }
        .container { max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #0f766e, #10b981); color: white; }
        .content { padding: 30px; color: #111827; }
        .button { display: inline-block; background: #0f766e; color: white !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .highlight { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .details { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; margin: 22px 0; }
        .details p { margin: 0 0 10px 0; }
        .details p:last-child { margin-bottom: 0; }
        .footer { text-align: center; padding: 20px 30px; background: #f9fafb; color: #6b7280; font-size: 12px; }
        .list { margin: 14px 0 0 0; padding-left: 18px; }
        .list li { margin-bottom: 8px; }
    </style></head><body><div class="container"><div class="header"><h1>Reserva de lanzamiento recibida</h1><p style="opacity:0.92;">Tu piloto Geobooker Connect ya entro a revision</p></div><div class="content"><p>Hola <strong>${data.name || "equipo"}</strong>,</p><p>Confirmamos la recepcion de tu anticipo para activar la evaluacion de tu piloto B2B administrado.</p><div class="details"><p><strong>Empresa:</strong> ${data.companyName || "No especificada"}</p><p><strong>Paquete:</strong> ${data.packageName || "Piloto Connect 1000"}</p><p><strong>Anticipo recibido:</strong> ${amount}</p><p><strong>Lote objetivo:</strong> Hasta ${batchSize} contactos elegibles</p></div><div class="highlight"><strong>Siguiente paso:</strong><ul class="list"><li>Revisamos tu brief comercial y la audiencia solicitada</li><li>Validamos alcance, cumplimiento y viabilidad operativa</li><li>Te contactamos para kickoff antes de ejecutar cualquier envio</li></ul></div><div class="details"><p><strong>Importante:</strong> La reserva no garantiza ventas, reuniones, respuestas ni entregabilidad universal. Si requieres CFDI o invoice comercial, responde este correo con tus datos fiscales antes de la ejecucion del servicio. La campana aprobada puede documentarse mediante anexo operativo de alcance.</p></div><p style="text-align:center;"><a href="mailto:hola@geobooker.com.mx" class="button">Responder al equipo Connect</a></p></div><div class="footer">&copy; ${new Date().getFullYear()} Geobooker Connect | geobooker.com.mx</div></div></body></html>`;
}

function getEmailTemplate(type, data) {
    const baseStyles = `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 20px; margin: 0; }
        .container { max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .content { padding: 30px; color: #111827; }
        .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; padding: 20px 30px; background: #f9fafb; color: #6b7280; font-size: 12px; }
        .highlight { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .details { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; margin: 22px 0; }
        .details p { margin: 0 0 10px 0; }
        .details p:last-child { margin-bottom: 0; }
        .list { margin: 14px 0 0 0; padding-left: 18px; }
        .list li { margin-bottom: 8px; }
        .muted { color: #6b7280; font-size: 14px; }
    `;

    const campaignFacts = getCampaignFacts(data);

    const templates = {
        welcome: {
            subject: `🎉 ¡Bienvenido a Geobooker, ${data.name}!`,
            html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body><div class="container"><div class="header" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white;"><h1>¡Bienvenido a Geobooker!</h1><p style="opacity: 0.9;">Tu cuenta ha sido creada exitosamente</p></div><div class="content"><p>Hola <strong>${data.name}</strong>,</p><p>Gracias por unirte a Geobooker.</p><div class="highlight"><strong>Proximos pasos:</strong><ol class="list"><li>Registra tu primer negocio</li><li>Completa tu perfil</li><li>Invita a otros negocios y gana Premium gratis</li></ol></div><p style="text-align: center;"><a href="https://geobooker.com.mx/dashboard" class="button">Ir a mi Dashboard</a></p></div><div class="footer">© ${new Date().getFullYear()} Geobooker • geobooker.com.mx</div></div></body></html>`
        },
        business_approved: {
            subject: `✅ ¡Tu negocio "${data.businessName}" ha sido aprobado!`,
            html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body><div class="container"><div class="header" style="background: linear-gradient(135deg, #10b981, #059669); color: white;"><h1>¡Felicidades!</h1><p style="opacity: 0.9;">Tu negocio ya esta en el mapa</p></div><div class="content"><p>Hola <strong>${data.name}</strong>,</p><p>Tu negocio <strong>"${data.businessName}"</strong> ha sido aprobado y ahora es visible para miles de usuarios en Geobooker.</p><div class="highlight" style="background: #ecfdf5; border-color: #10b981;"><strong>Tu negocio ahora puede:</strong><ul class="list"><li>Aparecer en busquedas de usuarios cercanos</li><li>Recibir solicitudes de ruta o navegacion</li><li>Recibir llamadas directas desde la app</li></ul></div><p style="text-align: center;"><a href="https://geobooker.com.mx/business/${data.businessId}" class="button" style="background: #10b981;">Ver mi Negocio</a></p></div><div class="footer">© ${new Date().getFullYear()} Geobooker • geobooker.com.mx</div></div></body></html>`
        },
        business_rejected: {
            subject: `⚠️ Tu negocio "${data.businessName}" necesita ajustes`,
            html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body><div class="container"><div class="header" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white;"><h1>Ajustes necesarios</h1><p style="opacity: 0.9;">Tu negocio necesita algunas correcciones</p></div><div class="content"><p>Hola <strong>${data.name}</strong>,</p><p>Tu negocio <strong>"${data.businessName}"</strong> no pudo ser aprobado en este momento.</p><div class="highlight" style="background: #fffbeb; border-color: #f59e0b;"><strong>Razon del rechazo:</strong><p>${data.reason || 'Por favor verifica que toda la informacion sea correcta y las fotos sean claras.'}</p></div><p style="text-align: center;"><a href="https://geobooker.com.mx/dashboard" class="button" style="background: #f59e0b;">Editar mi Negocio</a></p></div><div class="footer">© ${new Date().getFullYear()} Geobooker • geobooker.com.mx</div></div></body></html>`
        },
        campaign_received: {
            subject: isEnglish(data)
                ? '✅ Your advertising purchase has been received — Geobooker'
                : '✅ Recibimos tu compra publicitaria — Geobooker',
            html: buildCampaignReceivedEmail(data)
        },
        connect_launch_received: {
            subject: 'Reserva recibida para Geobooker Connect',
            html: buildConnectLaunchReceivedEmail(data)
        },
        campaign_approved: {
            subject: '🚀 ¡Tu campaña publicitaria ha sido aprobada!',
            html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body><div class="container"><div class="header" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white;"><h1>¡Campaña aprobada!</h1><p style="opacity: 0.9;">Tu anuncio esta listo para publicarse</p></div><div class="content"><p>Hola <strong>${data.name}</strong>,</p><p>Tu campaña publicitaria fue aprobada correctamente y se activara segun la fecha programada.</p><div class="details"><p><strong>Espacio:</strong> ${data.adSpace || 'N/A'}</p><p><strong>Inicio:</strong> ${data.startDate || 'Inmediato'}</p><p><strong>Inversion:</strong> ${formatCurrency(data.budget || 0, data.currency || 'MXN')}</p><p><strong>KPIs disponibles:</strong> Impresiones, clics, CTR y taps a WhatsApp</p></div><p style="text-align: center;"><a href="${data.dashboardUrl || 'https://geobooker.com.mx/advertiser/dashboard'}" class="button" style="background: #8b5cf6;">Ver mis campañas</a></p></div><div class="footer">© ${new Date().getFullYear()} Geobooker Ads • geobooker.com.mx</div></div></body></html>`
        },
        campaign_rejected: {
            subject: '⚠️ Tu campaña necesita ajustes antes de publicarse',
            html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body><div class="container"><div class="header" style="background: linear-gradient(135deg, #f59e0b, #ea580c); color: white;"><h1>Tu campaña requiere ajustes</h1><p style="opacity: 0.9;">Aun no puede publicarse</p></div><div class="content"><p>Hola <strong>${data.name || 'Anunciante'}</strong>,</p><p>Revisamos tu campaña y necesitamos algunos ajustes antes de activarla.</p><div class="details"><p><strong>Espacio:</strong> ${data.adSpace || 'Espacio publicitario Geobooker'}</p><p><strong>Motivo:</strong> ${data.reason || 'Necesitamos validar mejor tu creatividad o informacion comercial.'}</p></div><div class="highlight" style="background: #fff7ed; border-color: #ea580c;"><strong>Siguiente paso recomendado:</strong><ul class="list"><li>Edita la creatividad, texto o enlace de destino</li><li>Confirma que la oferta y la marca coincidan con tu negocio</li><li>Vuelve a enviar para nueva revision</li></ul></div><p style="text-align: center;"><a href="${data.dashboardUrl || 'https://geobooker.com.mx/advertiser/dashboard'}" class="button" style="background: #ea580c;">Revisar mi campaña</a></p></div><div class="footer">© ${new Date().getFullYear()} Geobooker Ads • geobooker.com.mx</div></div></body></html>`
        },
        referral_bonus: {
            subject: '🎁 ¡Ganaste recompensa por referido!',
            html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body><div class="container"><div class="header" style="background: linear-gradient(135deg, #ec4899, #f43f5e); color: white;"><h1>¡Ganaste Premium!</h1><p style="opacity: 0.9;">Gracias por invitar a ${data.referredName}</p></div><div class="content"><p>Hola <strong>${data.name}</strong>,</p><p><strong>${data.referredName}</strong> se unio a Geobooker usando tu codigo de referido.</p><div class="highlight" style="background: #fdf2f8; border-color: #ec4899;"><strong>Tu recompensa:</strong><p style="font-size: 24px; font-weight: bold; color: #ec4899;">+${data.reward || '30 dias Premium'}</p></div><p style="text-align: center;"><strong>Referidos totales:</strong> ${data.totalReferrals || 1}<br/><strong>Tu nivel:</strong> ${data.level || 'Promotor'}</p><p style="text-align: center;"><a href="https://geobooker.com.mx/dashboard" class="button" style="background: #ec4899;">Ver mis recompensas</a></p></div><div class="footer">© ${new Date().getFullYear()} Geobooker • geobooker.com.mx</div></div></body></html>`
        },
        custom: {
            subject: data.subject || 'Mensaje de Geobooker',
            html: buildCampaignEmail({
                html: data.html,
                signatureHtml: data.signature_html || data.signatureHtml,
                subject: data.subject || 'Mensaje de Geobooker',
                companyName: data.company_name || data.companyName || 'tu empresa',
                contactName: data.contact_name || data.contactName || '',
                tier: data.tier || '',
                preheader: data.preheader || 'Conoce Geobooker Ads y descarga la app'
            })
        },
        crm_campaign: {
            subject: data.subject || 'Mensaje de Geobooker',
            html: buildCampaignEmail({
                html: data.html,
                signatureHtml: data.signature_html || data.signatureHtml,
                subject: data.subject || 'Campana CRM Geobooker',
                companyName: data.company_name || data.companyName || 'tu empresa',
                contactName: data.contact_name || data.contactName || '',
                tier: data.tier || '',
                preheader: data.preheader || 'Campana CRM Geobooker Ads'
            })
        }
    };

    return templates[type] || null;
}
