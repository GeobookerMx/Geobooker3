// Netlify Function para enviar emails con Resend
// Path: netlify/functions/send-email.js

const { Resend } = require('resend');

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
        const { to, subject, html, from } = JSON.parse(event.body);

        // Validar campos requeridos
        if (!to || !subject || !html) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Missing required fields: to, subject, html'
                })
            };
        }

        // Enviar email
        const data = await resend.emails.send({
            from: from || 'Geobooker <onboarding@resend.dev>', // Default: dominio de Resend
            to: to,
            subject: subject,
            html: html
        });

        // Respuesta exitosa
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                messageId: data.id,
                message: 'Email sent successfully'
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
