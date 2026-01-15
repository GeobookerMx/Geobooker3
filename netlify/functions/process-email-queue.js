// Netlify Function para procesar cola de emails automáticamente
// Path: netlify/functions/process-email-queue.js

const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    try {
        console.log('🚀 Iniciando procesamiento de cola de emails...');

        // 1. Obtener límite diario configurado
        const { data: config } = await supabase
            .from('automation_config')
            .select('daily_limit')
            .eq('campaign_type', 'email')
            .single();

        const dailyLimit = config?.daily_limit || 100;

        // 2. Verificar cuántos emails se han enviado hoy
        const today = new Date().toISOString().split('T')[0];
        const { count: sentToday } = await supabase
            .from('campaign_history')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_type', 'email')
            .gte('sent_at', `${today}T00:00:00`)
            .lte('sent_at', `${today}T23:59:59`);

        const remaining = dailyLimit - (sentToday || 0);

        if (remaining <= 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Límite diario alcanzado',
                    sent: 0,
                    dailyLimit,
                    sentToday
                })
            };
        }

        console.log(`📊 Límite: ${dailyLimit}, Enviados hoy: ${sentToday}, Restantes: ${remaining}`);

        // 3. Obtener contactos pendientes de la cola (priorizando por tier)
        const { data: queueItems, error: queueError } = await supabase
            .from('email_queue')
            .select(`
                id,
                contact_id,
                marketing_contacts!inner (
                    email,
                    company_name,
                    contact_name,
                    tier,
                    assigned_email_sender
                )
            `)
            .eq('status', 'pending')
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(remaining);

        if (queueError) throw queueError;

        if (!queueItems || queueItems.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'No hay contactos pendientes en la cola',
                    sent: 0
                })
            };
        }

        console.log(`📧 Procesando ${queueItems.length} emails...`);

        // 4. Enviar emails
        const results = {
            sent: 0,
            failed: 0,
            errors: []
        };

        for (const item of queueItems) {
            try {
                const contact = item.marketing_contacts;

                // Generar HTML del email (template simple)
                const html = generateEmailHTML(contact);

                const subject = contact.tier === 'AAA' || contact.tier === 'AA'
                    ? `${contact.company_name} - Solución Premium de Geobooker`
                    : `Aumenta la visibilidad de ${contact.company_name} con Geobooker`;

                // Enviar email con Resend
                const emailResult = await resend.emails.send({
                    from: 'Geobooker <ventas@geobooker.com>',
                    to: contact.email,
                    subject,
                    html
                });

                // Registrar en historial
                await supabase
                    .from('campaign_history')
                    .insert({
                        contact_id: item.contact_id,
                        campaign_type: 'email',
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        message_id: emailResult.id,
                        details: { subject, tier: contact.tier }
                    });

                // Actualizar estado en cola
                await supabase
                    .from('email_queue')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        message_id: emailResult.id
                    })
                    .eq('id', item.id);

                // Actualizar contacto
                await supabase
                    .from('marketing_contacts')
                    .update({
                        email_status: 'sent',
                        last_email_sent: new Date().toISOString()
                    })
                    .eq('id', item.contact_id);

                results.sent++;
                console.log(`✅ Email enviado a: ${contact.email}`);

                // Delay para no saturar (100ms entre emails)
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (emailError) {
                console.error(`❌ Error enviando a ${item.marketing_contacts.email}:`, emailError);

                // Marcar como fallido
                await supabase
                    .from('email_queue')
                    .update({
                        status: 'failed',
                        error_message: emailError.message
                    })
                    .eq('id', item.id);

                results.failed++;
                results.errors.push({
                    email: item.marketing_contacts.email,
                    error: emailError.message
                });
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                message: `Procesamiento completado: ${results.sent} enviados, ${results.failed} fallidos`,
                sent: results.sent,
                failed: results.failed,
                dailyLimit,
                sentToday: (sentToday || 0) + results.sent,
                remaining: remaining - results.sent,
                errors: results.errors
            })
        };

    } catch (error) {
        console.error('❌ Error en process-email-queue:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

// Helper: Generar HTML del email
function generateEmailHTML(contact) {
    const greeting = contact.contact_name || 'Estimado/a';
    const companyName = contact.company_name || 'su empresa';
    const isPremium = ['AAA', 'AA'].includes(contact.tier);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Geobooker</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Tu plataforma de geolocalización empresarial</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333; margin: 0 0 20px 0;">Hola ${greeting},</h2>
                            
                            <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                                Nos complace presentarle <strong>Geobooker</strong>, la plataforma líder en geolocalización de negocios en México.
                            </p>

                            ${isPremium ? `
                            <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                                Hemos notado que <strong>${companyName}</strong> es una empresa destacada en su sector. Nos gustaría ofrecerle acceso prioritario a nuestras soluciones premium.
                            </p>
                            ` : `
                            <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                                Geobooker puede ayudar a <strong>${companyName}</strong> a aumentar su visibilidad y atraer más clientes en su zona.
                            </p>
                            `}

                            <!-- Benefits -->
                            <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
                                <h3 style="color: #667eea; margin: 0 0 15px 0;">¿Qué ofrecemos?</h3>
                                <ul style="color: #555; line-height: 1.8; margin: 0; padding-left: 20px;">
                                    <li>Posicionamiento destacado en búsquedas locales</li>
                                    <li>Analíticas en tiempo real de tu visibilidad</li>
                                    <li>Publicidad geolocalizada efectiva</li>
                                    <li>Gestión de reseñas y reputación online</li>
                                </ul>
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://geobooker.com.mx" 
                                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                    Conocer más
                                </a>
                            </div>

                            <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                                Saludos cordiales,<br>
                                <strong>Equipo Geobooker</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #888; font-size: 12px; margin: 0 0 10px 0;">
                                © 2026 Geobooker. Todos los derechos reservados.
                            </p>
                            <p style="color: #888; font-size: 12px; margin: 0;">
                                <a href="https://geobooker.com.mx" style="color: #667eea; text-decoration: none;">geobooker.com.mx</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}
