// Servicio para enviar emails usando Resend (via Netlify Function)
// Path: src/services/emailService.js

/**
 * Enviar email usando Resend API
 * @param {Object} emailData - Datos del email
 * @param {string} emailData.to - Email destinatario
 * @param {string} emailData.subject - Asunto
 * @param {string} emailData.html - Contenido HTML
 * @param {string} [emailData.from] - Email remitente (opcional, usa default de Resend)
 * @returns {Promise<Object>} - Resultado del envío
 */
export async function sendEmail({ to, subject, html, from }) {
  try {
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        from // Opcional: 'Geobooker <ventasgeobooker@gmail.com>'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send email');
    }

    return {
      success: true,
      messageId: data.messageId,
      message: data.message
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Template de email para campañas CRM
 * @param {Object} contact - Datos del contacto
 * @param {string} contact.company_name - Nombre de la empresa
 * @param {string} contact.contact_name - Nombre del contacto
 * @param {string} tier - Tier del contacto (AAA, AA, A, B)
 * @returns {string} - HTML del email
 */
export function generateCampaignEmailHTML({ company_name, contact_name }, tier) {
  const greeting = contact_name || 'Estimado/a';
  const companyName = company_name || 'su empresa';

  // Template diferente según tier
  const isPremium = ['AAA', 'AA'].includes(tier);

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

/**
 * Enviar email de campaña a un contacto
 * @param {Object} contact - Contacto de marketing_contacts
 * @returns {Promise<Object>} - Resultado del envío
 */
export async function sendCampaignEmail(contact) {
  const html = generateCampaignEmailHTML(contact, contact.tier);

  const subject = contact.tier === 'AAA' || contact.tier === 'AA'
    ? `${contact.company_name} - Solución Premium de Geobooker`
    : `Aumenta la visibilidad de ${contact.company_name} con Geobooker`;

  return await sendEmail({
    to: contact.email,
    subject,
    html,
    from: 'Geobooker <ventas@geobooker.com>' // ✅ Dominio verificado
  });
}
