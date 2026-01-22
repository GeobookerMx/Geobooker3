-- ================================================================
-- ACTUALIZAR BOTÓN "AGENDAR REUNIÓN" EN TEMPLATES DE EMAIL
-- Cambiar de link a /enterprise por WhatsApp directo
-- ================================================================

-- Template AAA Premium - Actualizar botón
UPDATE email_templates
SET html_content = REPLACE(
    html_content,
    '<a href="https://geobooker.com.mx/enterprise"',
    '<a href="https://wa.me/525526702368?text=Hola,%20me%20interesa%20Geobooker%20Premium.%20Vi%20su%20correo%20y%20me%20gustar%C3%ADa%20agendar%20una%20reuni%C3%B3n%20ejecutiva."'
)
WHERE name LIKE '%Premium%' OR tier_target = 'AAA';

-- Verificar el cambio
SELECT 
    name,
    tier_target,
    CASE 
        WHEN html_content LIKE '%wa.me%' THEN '✅ WhatsApp Link'
        ELSE '❌ Aún apunta a /enterprise'
    END as estado_boton
FROM email_templates
WHERE name LIKE '%Premium%' OR tier_target = 'AAA';

-- Si quieres actualizar TODOS los templates que tengan el botón
UPDATE email_templates
SET html_content = REPLACE(
    html_content,
    '<a href="https://geobooker.com.mx/enterprise"',
    '<a href="https://wa.me/525526702368?text=Hola,%20me%20interesa%20Geobooker.%20¿Podemos%20agendar%20una%20llamada?"'
)
WHERE html_content LIKE '%geobooker.com.mx/enterprise%';

-- Verificar cuántos templates se actualizaron
SELECT 
    COUNT(*) as templates_actualizados,
    COUNT(CASE WHEN html_content LIKE '%wa.me%' THEN 1 END) as con_whatsapp
FROM email_templates;

-- ✅ Ahora los emails tendrán el botón de WhatsApp directo
