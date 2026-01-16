// Netlify Function: Check Outdated Businesses (Cron Job)
// Path: netlify/functions/check-outdated-businesses.js
// Schedule: Diario a las 9am

import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
    console.log('Running check-outdated-businesses cron job...');

    try {
        // Inicializar Supabase con service key para bypass RLS
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // Ejecutar función SQL
        const { data: outdatedBusinesses, error } = await supabase
            .rpc('check_outdated_businesses');

        if (error) {
            console.error('Error executing check_outdated_businesses:', error);
            throw error;
        }

        console.log(`Found ${outdatedBusinesses.length} businesses requiring action`);

        // Procesar cada negocio según su acción
        const emailsSent = {
            reminder_60d: 0,
            mark_outdated: 0,
            final_warning: 0,
            deactivate: 0
        };

        for (const business of outdatedBusinesses) {
            const { action, business_id, business_name, owner_email, days_old } = business;

            console.log(`Processing: ${business_name} (${action}, ${days_old} days)`);

            // Enviar email según acción
            switch (action) {
                case 'reminder_60d':
                    // Primer recordatorio (60 días)
                    await sendUpdateReminder(owner_email, business_name, business_id, days_old);
                    emailsSent.reminder_60d++;
                    break;

                case 'mark_outdated':
                    // Badge "desactualizado" (90 días)
                    // La función SQL ya lo marca, solo log
                    console.log(`Marked as outdated: ${business_name}`);
                    emailsSent.mark_outdated++;
                    break;

                case 'final_warning':
                    // Advertencia final (150 días)
                    await sendFinalWarning(owner_email, business_name, business_id, 180 - days_old);
                    emailsSent.final_warning++;
                    break;

                case 'deactivate':
                    // Desactivación automática (180 días)
                    await sendDeactivationNotice(owner_email, business_name, business_id);
                    emailsSent.deactivate++;
                    break;
            }
        }

        console.log('Email summary:', emailsSent);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                processed: outdatedBusinesses.length,
                emailsSent
            })
        };

    } catch (error) {
        console.error('Cron job error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

// Helper: Enviar recordatorio 60 días
async function sendUpdateReminder(email, businessName, businessId, daysOld) {
    // Aquí integrar con tu sistema de emails (Resend, SendGrid, etc)
    console.log(`[EMAIL] Reminder 60d to ${email} for ${businessName}`);

    // Ejemplo con Resend:
    // await fetch('https://api.resend.com/emails', {
    //     method: 'POST',
    //     headers: {
    //         'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //         from: 'Geobooker <noreply@geobooker.com.mx>',
    //         to: email,
    //         subject: '🔔 Actualiza tu negocio en Geobooker',
    //         html: generateReminderEmail(businessName, businessId, daysOld)
    //     })
    // });
}

// Helper: Enviar advertencia final
async function sendFinalWarning(email, businessName, businessId, daysRemaining) {
    console.log(`[EMAIL] Final warning to ${email} for ${businessName} (${daysRemaining} days left)`);
    // Implementar envío de email urgente
}

// Helper: Enviar notificación de desactivación
async function sendDeactivationNotice(email, businessName, businessId) {
    console.log(`[EMAIL] Deactivation notice to ${email} for ${businessName}`);
    // Implementar envío de email de desactivación
}

// Helper: Generar HTML del email de recordatorio
function generateReminderEmail(businessName, businessId, daysOld) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 Actualiza tu Negocio</h1>
                </div>
                <div class="content">
                    <p>Hola,</p>
                    <p>Han pasado <strong>${daysOld} días</strong> desde la última actualización de <strong>${businessName}</strong> en Geobooker.</p>
                    <p>Para mantener la confianza de tus clientes y tu visibilidad en la plataforma, necesitamos que verifiques que tu información esté actualizada.</p>
                    
                    <h3>✅ Beneficios de actualizar:</h3>
                    <ul>
                        <li>Badge "Actualizado" ✨</li>
                        <li>+15 puntos Trust Score</li>
                        <li>Mayor visibilidad en búsquedas</li>
                        <li>Próxima actualización en 3 meses</li>
                    </ul>
                    
                    <a href="https://geobooker.com.mx/dashboard/my-business?update=${businessId}" class="button">
                        Actualizar Ahora (2 minutos)
                    </a>
                    
                    <p style="color: #999; font-size: 14px; margin-top: 20px;">
                        Si no actualizas en los próximos 30 días, tu negocio mostrará un badge "Desactualizado" ⚠️
                    </p>
                </div>
                <div class="footer">
                    <p>Geobooker - Tu directorio de confianza</p>
                    <p><a href="https://geobooker.com.mx">geobooker.com.mx</a></p>
                </div>
            </div>
        </body>
        </html>
    `;
}
