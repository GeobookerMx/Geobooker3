-- Agregar Plantillas Profesionales de Email
-- Ejecutar en Supabase SQL Editor para agregar 8 templates

-- Template 2: Tier AAA Premium
INSERT INTO email_templates (name, subject, html_content, tier_target, is_active)
VALUES (
  'Premium AAA - Solución Exclusiva',
  '{company_name} - Solución Premium de Geolocalización',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <tr><td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px;">Geobooker Premium</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Soluciones Empresariales de Alto Nivel</p>
        </td></tr>
        <tr><td style="padding: 40px 30px;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Estimado/a {contact_name},</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
            Hemos identificado a <strong>{company_name}</strong> como una empresa líder en su sector. 
            Nos gustaría presentarle <strong>Geobooker Premium</strong>, nuestra solución exclusiva 
            de geolocalización empresarial.
          </p>
          <div style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); border-left: 4px solid #ffa500; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #333; margin: 0 0 15px 0;">🌟 Beneficios Premium</h3>
            <ul style="color: #555; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Posicionamiento destacado en búsquedas premium</li>
              <li>Dashboard analytics en tiempo real</li>
              <li>Gestión multi-ubicación centralizada</li>
              <li>Soporte prioritario 24/7</li>
              <li>Programa de referidos exclusivo</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:ventasgeobooker@gmail.com?subject=Reunión%20Ejecutiva%20-%20{company_name}&body=Hola%20equipo%20Geobooker%2C%0A%0AMe%20interesa%20agendar%20una%20reunión%20ejecutiva%20para%20conocer%20más%20sobre%20Geobooker%20Premium.%0A%0ASaludos" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Agendar Reunión Ejecutiva
            </a>
          </div>
          <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
            Saludos cordiales,<br><strong>Equipo Geobooker Premium</strong>
          </p>
        </td></tr>
        <tr><td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #888; font-size: 12px; margin: 0;">© 2026 Geobooker. Todos los derechos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  'AAA',
  TRUE
);

-- Template 3: Tier AA Empresarial
INSERT INTO email_templates (name, subject, html_content, tier_target, is_active)
VALUES (
  'Empresarial AA - Crecimiento',
  'Impulsa el crecimiento de {company_name} con Geobooker',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
        <tr><td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Geobooker</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0;">Crecimiento Empresarial</p>
        </td></tr>
        <tr><td style="padding: 40px 30px;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Hola {contact_name},</h2>
          <p style="color: #555; line-height: 1.6;">
            En Geobooker ayudamos a empresas como <strong>{company_name}</strong> a aumentar su visibilidad 
            y atraer más clientes en su zona.
          </p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
            <h3 style="color: #10b981; margin: 0 0 15px 0;">✅ Lo que ofrecemos</h3>
            <ul style="color: #555; line-height: 1.8;">
              <li>Posicionamiento en búsquedas locales</li>
              <li>Análisis de competencia</li>
              <li>Gestión de reseñas</li>
              <li>Reportes mensuales</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://geobooker.com.mx" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold;">
              Conocer Más
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  'AA',
  TRUE
);

-- Template 4: Tier A/B Estándar
INSERT INTO email_templates (name, subject, html_content, tier_target, is_active)
VALUES (
  'Estándar A/B - Introducción',
  'Haz que más clientes encuentren {company_name}',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
        <tr><td style="background: #3b82f6; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">Geobooker</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <h2 style="color: #333;">¡Hola!</h2>
          <p style="color: #555; line-height: 1.6;">
            Te contactamos de <strong>Geobooker</strong>, la plataforma que ayuda a negocios 
            locales como el tuyo a ser encontrados por más clientes.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Con Geobooker puedes:
          </p>
          <ul style="color: #555; line-height: 1.8;">
            <li>Aparecer en búsquedas de tu zona</li>
            <li>Recibir reseñas de clientes</li>
            <li>Actualizar tu información fácilmente</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://geobooker.com.mx" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px;">
              Ver Demo
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  'A',
  TRUE
);

-- Template 5: Re-engagement
INSERT INTO email_templates (name, subject, html_content, tier_target, is_active)
VALUES (
  'Re-engagement - Segunda Oportunidad',
  '¿Aún te interesa aumentar la visibilidad de {company_name}?',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
        <tr><td style="background: #f59e0b; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">⏰ Segunda Oportunidad</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <h2 style="color: #333;">Hola {contact_name},</h2>
          <p style="color: #555; line-height: 1.6;">
            Te contactamos hace unos días sobre <strong>Geobooker</strong> y no tuvimos respuesta.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Entendemos que estás ocupado/a, pero queríamos ofrecerte una <strong>última oportunidad</strong> 
            para conocer cómo podemos ayudar a {company_name}.
          </p>
          <div style="background-color: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="color: #92400e; margin: 0; font-weight: bold;">
              🎁 Oferta Especial: 30% descuento en el primer mes
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://geobooker.com.mx" style="display: inline-block; background: #f59e0b; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold;">
              Aprovechar Oferta
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            Si no te interesa, responde "NO" y no te contactaremos de nuevo.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  NULL,
  TRUE
);

-- Template 6: Caso de Éxito
INSERT INTO email_templates (name, subject, html_content, tier_target, is_active)
VALUES (
  'Caso de Éxito - Testimonial',
  'Empresas como {company_name} están creciendo con Geobooker',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
        <tr><td style="background: #8b5cf6; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">📈 Casos de Éxito</h1>
        </td></tr>
        <tr><td style="padding: 30px;">
          <h2 style="color: #333;">Hola {contact_name},</h2>
          <p style="color: #555; line-height: 1.6;">
            Empresas similares a {company_name} están viendo resultados increíbles con Geobooker.
          </p>
          <div style="background-color: #f5f3ff; padding: 20px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
            <p style="color: #555; font-style: italic; margin: 0 0 10px 0;">
              "En 3 meses aumentamos 40% nuestras visitas y 25% las conversiones. Geobooker cambió nuestro negocio."
            </p>
            <p style="color: #8b5cf6; margin: 0; font-weight: bold;">
              - Restaurant La Bodega, CDMX
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://geobooker.com.mx/casos-exito" style="display: inline-block; background: #8b5cf6; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold;">
              Ver Más Casos
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  NULL,
  TRUE
);

-- Template 7: Promoción Temporal
INSERT INTO email_templates (name, subject, html_content, tier_target, is_active)
VALUES (
  'Promoción - Oferta Limitada',
  '🔥 Oferta especial para {company_name} - Solo 48 horas',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
        <tr><td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🔥 OFERTA LIMITADA</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">Solo 48 horas</p>
        </td></tr>
        <tr><td style="padding: 30px;">
          <h2 style="color: #333;">¡Última oportunidad, {contact_name}!</h2>
          <div style="background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); padding: 30px; margin: 20px 0; border-radius: 8px; text-align: center;">
            <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 36px;">50% OFF</h3>
            <p style="color: #991b1b; margin: 0; font-size: 18px;">Primer trimestre</p>
          </div>
          <p style="color: #555; line-height: 1.6;">
            Oferta exclusiva para empresas como {company_name}. Aprovecha ahora y empieza a crecer.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://geobooker.com.mx/promo" style="display: inline-block; background: #ef4444; color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 5px; font-weight: bold; font-size: 18px;">
              ACTIVAR DESCUENTO
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            ⏰ Oferta válida hasta: Viernes 23:59 hrs
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  NULL,
  TRUE
);

-- Template 8: Follow-up Personalizado
INSERT INTO email_templates (name, subject, html_content, tier_target, is_active)
VALUES (
  'Follow-up - Respuesta Rápida',
  'Re: Geobooker para {company_name}',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
        <tr><td style="padding: 30px;">
          <h2 style="color: #333;">Hola {contact_name},</h2>
          <p style="color: #555; line-height: 1.6;">
            Solo un seguimiento rápido a mi correo anterior sobre cómo Geobooker puede 
            ayudar a {company_name}.
          </p>
          <p style="color: #555; line-height: 1.6;">
            ¿Tienes 10 minutos esta semana para una llamada rápida? Puedo mostrarte:
          </p>
          <ul style="color: #555; line-height: 1.8;">
            <li>Cómo aparecerías en el mapa</li>
            <li>Dashboard de ejemplo</li>
            <li>Precio específico para tu negocio</li>
          </ul>
          <p style="color: #555; line-height: 1.6;">
            Responde este email o llámame al <strong>+52 55 2670 2368</strong>
          </p>
          <p style="color: #555; line-height: 1.6; margin: 30px 0 0 0;">
            Saludos,<br>
            <strong>Juan Pablo Pérez</strong><br>
            CEO, Geobooker
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  NULL,
  TRUE
);

-- ✅ Success! 8 plantillas profesionales agregadas
