-- Actualizar plantilla vacía "Geobooker - Presentación"
-- Ejecutar en Supabase para llenar contenido

UPDATE email_templates
SET html_content = '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        
        <!-- Header -->
        <tr><td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Geobooker</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Tu plataforma de geolocalización empresarial</p>
        </td></tr>

        <!-- Content -->
        <tr><td style="padding: 40px 30px;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Hola {contact_name},</h2>
          
          <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
            Nos complace presentarle <strong>Geobooker</strong>, la plataforma líder en geolocalización de negocios en México.
          </p>

          <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
            Hemos notado que <strong>{company_name}</strong> tiene potencial para aumentar significativamente su visibilidad local. 
            Con Geobooker, más clientes podrán encontrarle fácilmente.
          </p>

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

          <!-- Download App Section -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <h3 style="color: #ffffff; margin: 0 0 10px 0; font-size: 18px;">📱 Descarga nuestra App</h3>
            <p style="color: #ffffff; margin: 0 0 15px 0; font-size: 14px; opacity: 0.95;">
              Accede a Geobooker desde tu celular en cualquier momento
            </p>
            <a href="https://geobooker.com.mx#descargar-app" 
               style="display: inline-block; background: #ffffff; color: #059669; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: bold; font-size: 14px; margin: 5px;">
              📲 Descargar App
            </a>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 11px; opacity: 0.8;">
              Compatible con Android e iOS • Gratis
            </p>
          </div>

          <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
            Saludos cordiales,<br>
            <strong>Equipo Geobooker</strong>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #888; font-size: 12px; margin: 0 0 10px 0;">
            © 2026 Geobooker. Todos los derechos reservados.
          </p>
          <p style="color: #888; font-size: 12px; margin: 0;">
            <a href="https://geobooker.com.mx" style="color: #667eea; text-decoration: none;">geobooker.com.mx</a> | 
            <a href="tel:+525526702368" style="color: #667eea; text-decoration: none;">+52 55 2670 2368</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>'
WHERE name = 'Geobooker - Presentación';

-- ✅ Plantilla actualizada con contenido completo
