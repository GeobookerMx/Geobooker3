// netlify/functions/send-notification-email.js
/**
 * Generic email notification function
 * Handles: welcome, business_approved, business_rejected, campaign_approved, referral_bonus
 * 
 * Uses Resend (free tier: 100 emails/day)
 */
const { resolveEmailSender } = require('./_email-config');
const { buildCampaignEmail } = require('./_campaign-email');

export async function handler(event) {
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

        // Get email template based on type
        const emailTemplate = getEmailTemplate(type, data);

        if (!emailTemplate) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid notification type' })
            };
        }

        // Determine sender (for CRM campaigns, use dynamic sender)
        // Acepta camelCase (fromEmail) y snake_case (from_email) para compatibilidad
        const senderEmail = data.fromEmail || data.from_email;
        const senderName = data.fromName || data.from_name;
        const senderConfig = resolveEmailSender({
            preferredEmail: senderEmail,
            preferredName: (type === 'crm_campaign' || type === 'custom') ? senderName : 'Geobooker Ads'
        });

        // Send via Resend
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
}

function getEmailTemplate(type, data) {
    const baseStyles = `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .content { padding: 30px; }
        .button { display: inline-block; background: #3b82f6; color: white !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; padding: 20px 30px; background: #f9fafb; color: #6b7280; font-size: 12px; }
        .highlight { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    `;

    const templates = {
        // ==================== WELCOME EMAIL ====================
        welcome: {
            subject: `🎉 ¡Bienvenido a Geobooker, ${data.name}!`,
            html: `
                <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white;">
                            <h1>¡Bienvenido a Geobooker! 🗺️</h1>
                            <p style="opacity: 0.9;">Tu cuenta ha sido creada exitosamente</p>
                        </div>
                        <div class="content">
                            <p>Hola <strong>${data.name}</strong>,</p>
                            <p>¡Gracias por unirte a Geobooker! Ahora eres parte de la comunidad de negocios locales más grande de México.</p>
                            
                            <div class="highlight">
                                <strong>🚀 Próximos pasos:</strong>
                                <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                                    <li>Registra tu primer negocio</li>
                                    <li>Completa tu perfil</li>
                                    <li>Invita a otros negocios y gana Premium gratis</li>
                                </ol>
                            </div>

                            <p style="text-align: center;">
                                <a href="https://geobooker.com.mx/dashboard" class="button">Ir a mi Dashboard →</a>
                            </p>

                            <p style="color: #6b7280; font-size: 14px;">
                                ¿Tienes dudas? Responde a este correo o contáctanos en WhatsApp.
                            </p>
                        </div>
                        <div class="footer">
                            © ${new Date().getFullYear()} Geobooker • geobooker.com.mx
                        </div>
                    </div>
                </body></html>
            `
        },

        // ==================== BUSINESS APPROVED ====================
        business_approved: {
            subject: `✅ ¡Tu negocio "${data.businessName}" ha sido aprobado!`,
            html: `
                <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header" style="background: linear-gradient(135deg, #10b981, #059669); color: white;">
                            <h1>¡Felicidades! ✅</h1>
                            <p style="opacity: 0.9;">Tu negocio ya está en el mapa</p>
                        </div>
                        <div class="content">
                            <p>Hola <strong>${data.name}</strong>,</p>
                            <p>Tu negocio <strong>"${data.businessName}"</strong> ha sido aprobado y ahora es visible para miles de usuarios en Geobooker.</p>
                            
                            <div class="highlight" style="background: #ecfdf5; border-color: #10b981;">
                                <strong>🎯 Tu negocio ahora puede:</strong>
                                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                                    <li>Aparecer en búsquedas de usuarios cercanos</li>
                                    <li>Recibir solicitudes de ruta/navegación</li>
                                    <li>Recibir llamadas directas desde la app</li>
                                </ul>
                            </div>

                            <p style="text-align: center;">
                                <a href="https://geobooker.com.mx/business/${data.businessId}" class="button" style="background: #10b981;">Ver mi Negocio →</a>
                            </p>

                            <p style="color: #6b7280; font-size: 14px; text-align: center;">
                                💡 <strong>Tip:</strong> Actualiza a Premium para aparecer primero en las búsquedas.
                            </p>
                        </div>
                        <div class="footer">
                            © ${new Date().getFullYear()} Geobooker • geobooker.com.mx
                        </div>
                    </div>
                </body></html>
            `
        },

        // ==================== BUSINESS REJECTED ====================
        business_rejected: {
            subject: `⚠️ Tu negocio "${data.businessName}" necesita ajustes`,
            html: `
                <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white;">
                            <h1>Ajustes Necesarios ⚠️</h1>
                            <p style="opacity: 0.9;">Tu negocio necesita algunas correcciones</p>
                        </div>
                        <div class="content">
                            <p>Hola <strong>${data.name}</strong>,</p>
                            <p>Tu negocio <strong>"${data.businessName}"</strong> no pudo ser aprobado en este momento. Por favor revisa los siguientes puntos:</p>
                            
                            <div class="highlight" style="background: #fffbeb; border-color: #f59e0b;">
                                <strong>📝 Razón del rechazo:</strong>
                                <p style="margin: 10px 0 0 0;">${data.reason || 'Por favor verifica que toda la información sea correcta y las fotos sean claras.'}</p>
                            </div>

                            <p style="text-align: center;">
                                <a href="https://geobooker.com.mx/dashboard" class="button" style="background: #f59e0b;">Editar mi Negocio →</a>
                            </p>

                            <p style="color: #6b7280; font-size: 14px;">
                                Una vez que hagas los ajustes, tu negocio será revisado nuevamente. Si tienes dudas, contáctanos.
                            </p>
                        </div>
                        <div class="footer">
                            © ${new Date().getFullYear()} Geobooker • geobooker.com.mx
                        </div>
                    </div>
                </body></html>
            `
        },

        // ==================== CAMPAIGN APPROVED ====================
        campaign_approved: {
            subject: `🚀 ¡Tu campaña publicitaria ha sido aprobada!`,
            html: `
                <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white;">
                            <h1>¡Campaña Aprobada! 🚀</h1>
                            <p style="opacity: 0.9;">Tu anuncio está listo para publicarse</p>
                        </div>
                        <div class="content">
                            <p>Hola <strong>${data.name}</strong>,</p>
                            <p>Tu campaña publicitaria ha sido aprobada y se activará según la fecha programada.</p>
                            
                            <div class="highlight" style="background: #f5f3ff; border-color: #8b5cf6;">
                                <strong>📊 Detalles de la campaña:</strong>
                                <ul style="margin: 10px 0 0 0; padding-left: 20px; list-style: none;">
                                    <li>📍 <strong>Espacio:</strong> ${data.adSpace || 'N/A'}</li>
                                    <li>📅 <strong>Inicio:</strong> ${data.startDate || 'Inmediato'}</li>
                                    <li>💰 <strong>Inversión:</strong> $${data.budget || 0} MXN</li>
                                </ul>
                            </div>

                            <p style="text-align: center;">
                                <a href="https://geobooker.com.mx/dashboard" class="button" style="background: #8b5cf6;">Ver mis Campañas →</a>
                            </p>
                        </div>
                        <div class="footer">
                            © ${new Date().getFullYear()} Geobooker Ads • geobooker.com.mx
                        </div>
                    </div>
                </body></html>
            `
        },

        // ==================== REFERRAL BONUS ====================
        referral_bonus: {
            subject: `🎁 ¡Ganaste recompensa por referido!`,
            html: `
                <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
                <body>
                    <div class="container">
                        <div class="header" style="background: linear-gradient(135deg, #ec4899, #f43f5e); color: white;">
                            <h1>¡Ganaste Premium! 🎁</h1>
                            <p style="opacity: 0.9;">Gracias por invitar a ${data.referredName}</p>
                        </div>
                        <div class="content">
                            <p>Hola <strong>${data.name}</strong>,</p>
                            <p><strong>${data.referredName}</strong> se unió a Geobooker usando tu código de referido.</p>
                            
                            <div class="highlight" style="background: #fdf2f8; border-color: #ec4899;">
                                <strong>🏆 Tu recompensa:</strong>
                                <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #ec4899;">
                                    +${data.reward || '30 días Premium'}
                                </p>
                            </div>

                            <p style="text-align: center;">
                                <strong>Referidos totales:</strong> ${data.totalReferrals || 1}<br/>
                                <strong>Tu nivel:</strong> ${data.level || 'Promotor'} ⭐
                            </p>

                            <p style="text-align: center;">
                                <a href="https://geobooker.com.mx/dashboard" class="button" style="background: #ec4899;">Ver mis Recompensas →</a>
                            </p>

                            <p style="color: #6b7280; font-size: 14px; text-align: center;">
                                ¡Sigue invitando para ganar más Premium gratis!
                            </p>
                        </div>
                        <div class="footer">
                            © ${new Date().getFullYear()} Geobooker • geobooker.com.mx
                        </div>
                    </div>
                </body></html>
            `
        },

        // ==================== CUSTOM EMAIL (for campaigns) ====================
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

        // ==================== CRM CAMPAIGN EMAIL ====================
        crm_campaign: {
            subject: data.subject || 'Mensaje de Geobooker',
            html: buildCampaignEmail({
                html: data.html,
                signatureHtml: data.signature_html || data.signatureHtml,
                subject: data.subject || 'Campa�a CRM Geobooker',
                companyName: data.company_name || data.companyName || 'tu empresa',
                contactName: data.contact_name || data.contactName || '',
                tier: data.tier || '',
                preheader: data.preheader || 'Campa�a CRM Geobooker Ads'
            })
        }
    };

    return templates[type] || null;
}

