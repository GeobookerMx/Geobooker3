-- ACTUALIZAR Template Premium AAA - Cambiar botón a mailto
-- Ejecutar en Supabase SQL Editor

UPDATE email_templates
SET html_content = REPLACE(
    html_content,
    'href="https://geobooker.com.mx/enterprise"',
    'href="mailto:ventasgeobooker@gmail.com?subject=Reunión%20Ejecutiva%20-%20Geobooker%20Premium&body=Hola%20equipo%20Geobooker%2C%0A%0AMe%20interesa%20agendar%20una%20reunión%20ejecutiva%20para%20conocer%20más%20sobre%20Geobooker%20Premium.%0A%0ASaludos"'
)
WHERE name LIKE '%Premium%' OR tier_target = 'AAA';

-- Verificar el cambio
SELECT name, 
       CASE 
         WHEN html_content LIKE '%mailto:ventasgeobooker@gmail.com%' THEN '✅ Actualizado'
         ELSE '❌ No actualizado'
       END as status
FROM email_templates
WHERE name LIKE '%Premium%' OR tier_target = 'AAA';
