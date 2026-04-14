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

  const isPremium = ['AAA', 'AA'].includes(tier);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Geobooker</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:30px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Logo Header -->
        <tr>
          <td style="background-color:#ffffff;padding:32px 40px 20px;text-align:center;border-bottom:3px solid #E8365D;">
            <img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" width="220" style="display:block;margin:0 auto;height:auto;">
            <p style="color:#5B63D3;font-size:12px;margin:10px 0 0;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">El Mapa de Negocios de Mexico</p>
          </td>
        </tr>
        <tr><td style="background:linear-gradient(90deg,#E8365D 0%,#5B63D3 100%);height:4px;"></td></tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:40px 40px 30px;">
            <h2 style="color:#1a1a2e;font-size:22px;margin:0 0 16px;font-weight:700;">Hola ${greeting}</h2>
            <p style="color:#4a5568;font-size:15px;line-height:1.7;margin:0 0 20px;">
              Le escribimos de parte de <strong style="color:#E8365D;">Geobooker</strong>, la plataforma #1 de geolocalizacion de negocios en Mexico con mas de <strong>500,000 empresas</strong> registradas en todo el pais.
            </p>

            ${isPremium ? `
            <div style="background:linear-gradient(135deg,#fff5f7 0%,#f0f0ff 100%);border-radius:12px;padding:24px;margin:0 0 24px;border-left:4px solid #E8365D;">
              <p style="color:#1a1a2e;font-size:15px;line-height:1.7;margin:0;">
                Identificamos que <strong>${companyName}</strong> es una empresa destacada en su sector y queremos ofrecerle <strong>acceso prioritario</strong> a nuestras soluciones premium para maximizar su visibilidad y captacion de clientes en toda la Republica Mexicana.
              </p>
            </div>
            ` : `
            <div style="background:#f7f9ff;border-radius:12px;padding:24px;margin:0 0 24px;border-left:4px solid #5B63D3;">
              <p style="color:#1a1a2e;font-size:15px;line-height:1.7;margin:0;">
                Geobooker puede ayudar a <strong>${companyName}</strong> a aumentar su visibilidad digital y atraer mas clientes en su area de influencia, completamente gratis para empezar.
              </p>
            </div>
            `}

            <p style="color:#1a1a2e;font-size:15px;font-weight:700;margin:0 0 16px;">Que incluye nuestra plataforma:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:36px;font-size:20px;vertical-align:top;">&#128205;</td>
                  <td style="color:#4a5568;font-size:14px;padding-left:8px;line-height:1.5;vertical-align:top;"><strong style="color:#1a1a2e;">Posicionamiento local</strong> &mdash; su negocio aparece primero en busquedas de su zona</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:36px;font-size:20px;vertical-align:top;">&#128202;</td>
                  <td style="color:#4a5568;font-size:14px;padding-left:8px;line-height:1.5;vertical-align:top;"><strong style="color:#1a1a2e;">Analiticas en tiempo real</strong> &mdash; vea cuantas personas visitan su perfil y de donde vienen</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:36px;font-size:20px;vertical-align:top;">&#127919;</td>
                  <td style="color:#4a5568;font-size:14px;padding-left:8px;line-height:1.5;vertical-align:top;"><strong style="color:#1a1a2e;">Publicidad geolocalizada</strong> &mdash; llegue a clientes en un radio exacto alrededor de su negocio</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:10px 0;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:36px;font-size:20px;vertical-align:top;">&#11088;</td>
                  <td style="color:#4a5568;font-size:14px;padding-left:8px;line-height:1.5;vertical-align:top;"><strong style="color:#1a1a2e;">Resenas verificadas</strong> &mdash; gestione su reputacion online y genere confianza</td>
                </tr></table>
              </td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#5B63D3 0%,#E8365D 100%);border-radius:12px;margin:0 0 28px;">
              <tr><td style="padding:20px 24px;text-align:center;">
                <p style="color:#ffffff;font-size:15px;font-weight:700;margin:0 0 6px;">&#128241; Disponible en tu celular</p>
                <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0 0 14px;">Accede a Geobooker desde tu smartphone en cualquier momento</p>
                <a href="https://geobooker.com.mx" style="display:inline-block;background:#ffffff;color:#5B63D3;text-decoration:none;padding:10px 28px;border-radius:25px;font-weight:700;font-size:13px;">Descargar App &bull; Gratis</a>
              </td></tr>
            </table>

            <div style="text-align:center;margin:28px 0 24px;">
              <a href="https://geobooker.com.mx" style="display:inline-block;background:linear-gradient(135deg,#E8365D 0%,#5B63D3 100%);color:#ffffff;text-decoration:none;padding:16px 52px;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 4px 20px rgba(232,54,93,0.3);">
                Conocer Geobooker &rarr;
              </a>
              <p style="color:#aaa;font-size:12px;margin:10px 0 0;">Sin costo de registro &middot; Configuracion en 5 minutos</p>
            </div>

            <p style="color:#4a5568;font-size:14px;line-height:1.6;margin:24px 0 0;">
              Con gusto agendamos una llamada para mostrarle como Geobooker puede impulsar a <strong>${companyName}</strong>. Simplemente responda este correo y con gusto le atendemos.
            </p>
            <p style="color:#4a5568;font-size:14px;line-height:1.6;margin:16px 0 0;">
              Atentamente,<br>
              <strong style="color:#1a1a2e;">Equipo de Ventas &middot; Geobooker</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8f9fa;padding:24px 40px;border-top:1px solid #f0f0f0;text-align:center;">
            <img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" width="120" style="display:block;margin:0 auto 12px;height:auto;opacity:0.7;">
            <p style="color:#888;font-size:12px;margin:0 0 8px;">
              &#128231; <a href="mailto:ventas@geobooker.com.mx" style="color:#E8365D;text-decoration:none;">ventas@geobooker.com.mx</a>
              &nbsp;&middot;&nbsp;
              &#127760; <a href="https://geobooker.com.mx" style="color:#5B63D3;text-decoration:none;">geobooker.com.mx</a>
            </p>
            <p style="color:#bbb;font-size:11px;margin:0;">
              &copy; 2026 Geobooker &middot; Todos los derechos reservados<br>
              <a href="https://geobooker.com.mx/unsubscribe" style="color:#ccc;text-decoration:underline;">Cancelar suscripcion</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
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
