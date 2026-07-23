// netlify/functions/send-welcome-email.js
/**
 * Sends welcome email to new Enterprise advertisers
 * Called by stripe-webhook after successful payment
 */

exports.handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { email, password, campaignName, companyName, dashboardUrl } = JSON.parse(event.body);

        // Para MVP: Log the credentials (en producción usar servicio de email real)
        console.log(`
        ============================================
        🎉 NEW ENTERPRISE ADVERTISER ACCOUNT
        ============================================
        Email: ${email}
        Password: ${password}
        Company: ${companyName}
        Campaign: ${campaignName}
        Dashboard: ${dashboardUrl}
        ============================================
        `);

        // TODO: Integrar con servicio de email (SendGrid, Resend, etc)
        // Por ahora, retornar success
        // En producción, deberías enviar un email HTML profesional

        /* EJEMPLO CON RESEND (cuando lo integres):
        
        const resend = require('resend');
        const resendClient = new resend.Resend(process.env.RESEND_API_KEY);
        
        await resendClient.emails.send({
            from: 'enterprise@geobooker.com.mx',
            to: email,
            subject: `Bienvenido a Geobooker Enterprise - ${companyName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #3B82F6;">🎉 ¡Bienvenido a Geobooker Enterprise!</h1>
                    
                    <p>Hola,</p>
                    
                    <p>Tu cuenta Enterprise ha sido creada exitosamente. Aquí están tus credenciales de acceso:</p>
                    
                    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Contraseña temporal:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
                    </div>
                    
                    <p><strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.</p>
                    
                    <h2>Tu Campaña</h2>
                    <p>Tu campaña "<strong>${campaignName}</strong>" está siendo revisada por nuestro equipo. Recibirás una notificación cuando esté activa (normalmente dentro de 12 a 72 horas).</p>
                    
                    <div style="margin: 30px 0;">
                        <a href="${dashboardUrl}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                            🚀 Acceder al Dashboard
                        </a>
                    </div>
                    
                    <h2>Próximos Pasos</h2>
                    <ol>
                        <li>Inicia sesión en tu dashboard</li>
                        <li>Revisa el progreso de tu campaña</li>
                        <li>Monitorea tus métricas en tiempo real</li>
                    </ol>
                    
                    <p>Si tienes alguna pregunta, nuestro equipo está aquí para ayudarte:</p>
                    <p>
                        📧 <a href="mailto:enterprise@geobooker.com.mx">enterprise@geobooker.com.mx</a><br>
                        📱 WhatsApp: +52 55 2670 2368
                    </p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
                    
                    <p style="color: #6B7280; font-size: 12px;">
                        Geobooker | Conectando negocios con clientes<br>
                        geobooker.com.mx
                    </p>
                </div>
            `
        });
        */

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Welcome email logged (email service not configured yet)',
                recipient: email
            })
        };

    } catch (error) {
        console.error('Error in send-welcome-email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to send welcome email', details: error.message })
        };
    }
};
