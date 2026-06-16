// Netlify Function para enviar emails con Resend
// Path: netlify/functions/send-email.js

const { Resend } = require('resend');
const { resolveEmailSender } = require('./_email-config');

exports.handler = async (event, context) => {
    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Inicializar Resend con API Key
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Parsear body
        const { to, subject, html, from, fromName } = JSON.parse(event.body);

        // Validar campos requeridos
        if (!to || !subject || !html) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Missing required fields: to, subject, html'
                })
            };
        }

        const senderConfig = resolveEmailSender({
            preferredEmail: from,
            preferredName: fromName || 'Geobooker Ads'
        });

        // Enviar email
        const data = await resend.emails.send({
            from: senderConfig.from,
            reply_to: senderConfig.replyTo,
            to: to,
            subject: subject,
            html: html
        });

        if (data?.error) {
            throw new Error(data.error.message || 'Resend send failed');
        }

        // Respuesta exitosa
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                messageId: data?.data?.id || null,
                message: 'Email sent successfully',
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
        console.error('Error sending email:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Failed to send email'
            })
        };
    }
};
