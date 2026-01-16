-- SQL PARA AGREGAR LOGO A TODAS LAS PLANTILLAS
-- Incluye el logo horizontal oficial de Geobooker en el encabezado de cada correo

-- Actualizar TODAS las plantillas existentes para incluir el logo
-- Se inserta una imagen de 180px de ancho aproximadamente para que sea visible pero elegante

-- 1. Actualizar "Geobooker - Presentación"
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<h1 style="color: #ffffff; margin: 0; font-size: 28px;">Geobooker</h1>',
  '<img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" style="width: 200px; height: auto; margin-bottom: 20px; display: inline-block;"><br><h1 style="color: #ffffff; margin: 0; font-size: 28px;">Geobooker</h1>'
)
WHERE name = 'Geobooker - Presentación' OR name = 'Estándar A/B - Introducción';

-- 2. Actualizar "Premium AAA"
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<h1 style="color: #ffffff; margin: 0; font-size: 32px;">Geobooker Premium</h1>',
  '<img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" style="width: 220px; height: auto; margin-bottom: 20px; display: inline-block;"><br><h1 style="color: #ffffff; margin: 0; font-size: 32px;">Geobooker Premium</h1>'
)
WHERE name = 'Premium AAA - Solución Exclusiva';

-- 3. Actualizar otras plantillas con encabezados similares
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<h1 style="color: #ffffff; margin: 0; font-size: 28px;">Geobooker</h1>',
  '<img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" style="width: 200px; height: auto; margin-bottom: 20px; display: inline-block;"><br><h1 style="color: #ffffff; margin: 0; font-size: 28px;">Geobooker</h1>'
)
WHERE name NOT IN ('Geobooker - Presentación', 'Estándar A/B - Introducción', 'Premium AAA - Solución Exclusiva') 
AND html_content LIKE '%<h1 style="color: #ffffff; margin: 0; font-size: 28px;">Geobooker</h1>%';

-- 4. Para las plantillas de Re-engagement o Promoción que usan emojis en H1
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<h1 style="color: #ffffff; margin: 0;">⏰ Segunda Oportunidad</h1>',
  '<img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" style="width: 180px; height: auto; margin-bottom: 20px; display: inline-block;"><br><h1 style="color: #ffffff; margin: 0;">⏰ Segunda Oportunidad</h1>'
)
WHERE name = 'Re-engagement - Segunda Oportunidad';

UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<h1 style="color: #ffffff; margin: 0;">📈 Casos de Éxito</h1>',
  '<img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" style="width: 180px; height: auto; margin-bottom: 20px; display: inline-block;"><br><h1 style="color: #ffffff; margin: 0;">📈 Casos de Éxito</h1>'
)
WHERE name = 'Caso de Éxito - Testimonial';

UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<h1 style="color: #ffffff; margin: 0; font-size: 32px;">🔥 OFERTA LIMITADA</h1>',
  '<img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" style="width: 220px; height: auto; margin-bottom: 20px; display: inline-block;"><br><h1 style="color: #ffffff; margin: 0; font-size: 32px;">🔥 OFERTA LIMITADA</h1>'
)
WHERE name = 'Promoción - Oferta Limitada';

-- 5. Para la de Follow-up que no tiene encabezado de color (insertar al principio del contenido)
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<h2 style="color: #333;">Hola {contact_name},</h2>',
  '<div style="text-align: center; margin-bottom: 30px;"><img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" style="width: 180px; height: auto;"></div><h2 style="color: #333;">Hola {contact_name},</h2>'
)
WHERE name = 'Follow-up - Respuesta Rápida';

-- ✅ Success! Logo agregado a todas las plantillas.
