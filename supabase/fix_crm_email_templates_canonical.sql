-- Plantillas canonicas para el flujo CRM/Resend de produccion
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS template_type text;

UPDATE public.email_templates
SET is_active = false
WHERE template_type IN ('invitation', 'followup', 'reengagement');

INSERT INTO public.email_templates (
    name,
    subject,
    html_content,
    template_type,
    tier_target,
    is_active
) VALUES
(
    'CRM Canonica - Invitacion Inicial',
    'Impulsa {company_name} con presencia premium en Geobooker',
    '
    <p>Hola <strong>{contact_name}</strong>,</p>
    <p>Detectamos que <strong>{company_name}</strong> puede ganar mucha mas visibilidad local dentro de Geobooker.</p>
    <p>Hoy ayudamos a negocios a destacar en mapa, busqueda y espacios patrocinados con una presentacion profesional para convertir mas clientes cercanos.</p>
    <div style="margin:24px 0;padding:18px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;">
        <h3 style="margin:0 0 10px 0;color:#0f172a;">Lo mas valioso para tu negocio</h3>
        <ul style="margin:0;padding-left:20px;color:#334155;line-height:1.8;">
            <li>Mayor descubrimiento en tu zona</li>
            <li>Presencia destacada frente a clientes listos para comprar</li>
            <li>Soporte para campañas locales, premium y enterprise</li>
        </ul>
    </div>
    <p>Si te interesa, responde este correo y con gusto te compartimos la mejor opcion para <strong>{company_name}</strong>.</p>
    <p>Quedo atento.</p>
    ',
    'invitation',
    null,
    true
),
(
    'CRM Canonica - Follow Up',
    'Seguimiento rapido para {company_name} en Geobooker',
    '
    <p>Hola <strong>{contact_name}</strong>,</p>
    <p>Solo doy seguimiento a mi mensaje anterior sobre la visibilidad de <strong>{company_name}</strong> dentro de Geobooker.</p>
    <p>Podemos mostrarte de forma muy concreta como se veria tu negocio en mapa, resultados locales y espacios patrocinados.</p>
    <div style="margin:24px 0;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
        <p style="margin:0;color:#334155;"><strong>Si te parece util, te compartimos:</strong></p>
        <ul style="margin:10px 0 0 0;padding-left:20px;color:#334155;line-height:1.8;">
            <li>Un ejemplo visual de tu presencia en Geobooker</li>
            <li>La mejor categoria o cobertura para tu negocio</li>
            <li>Una propuesta comercial clara y directa</li>
        </ul>
    </div>
    <p>Si gustas, responde este correo y te enviamos la propuesta ideal para <strong>{company_name}</strong>.</p>
    ',
    'followup',
    null,
    true
),
(
    'CRM Canonica - Reengagement',
    'Ultima invitacion para revisar el crecimiento de {company_name}',
    '
    <p>Hola <strong>{contact_name}</strong>,</p>
    <p>Te escribimos una ultima vez para invitar a <strong>{company_name}</strong> a conocer Geobooker Ads.</p>
    <p>Sabemos que el tiempo es limitado, por eso dejamos esta invitacion abierta para cuando quieras revisar una opcion simple de visibilidad local con enfoque comercial.</p>
    <div style="margin:24px 0;padding:18px;border-radius:14px;background:#fff7ed;border:1px solid #fdba74;">
        <p style="margin:0;color:#9a3412;"><strong>Geobooker puede ayudarte a:</strong></p>
        <ul style="margin:10px 0 0 0;padding-left:20px;color:#9a3412;line-height:1.8;">
            <li>Generar presencia digital local mas profesional</li>
            <li>Destacar frente a negocios competidores</li>
            <li>Recibir una propuesta adaptada a tu nivel de negocio</li>
        </ul>
    </div>
    <p>Si no deseas mas mensajes comerciales, responde con la palabra <strong>BAJA</strong> y respetaremos de inmediato tu preferencia.</p>
    ',
    'reengagement',
    null,
    true
);

SELECT
    id,
    name,
    template_type,
    is_active
FROM public.email_templates
WHERE template_type IN ('invitation', 'followup', 'reengagement')
ORDER BY created_at DESC NULLS LAST, id DESC;
