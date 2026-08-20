-- CRM 2.0: plantillas comerciales de lanzamiento con mayor claridad, valor y urgencia.
-- Ejecutar en Supabase SQL Editor si las migraciones no se aplican automáticamente.

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
    'CRM 2.0 Launch - Invitacion Premium Gratis',
    'Acceso premium gratis para impulsar {company_name} en Geobooker',
    '
    <p>Hola <strong>{contact_name}</strong>,</p>

    <p>
        Soy parte del equipo de <strong>Geobooker</strong>. Detectamos a
        <strong>{company_name}</strong> dentro de una revisión comercial de negocios con potencial para ganar
        más visibilidad en búsquedas locales, mapa y espacios publicitarios.
    </p>

    <div style="margin:24px 0;padding:18px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;">
        <p style="margin:0 0 10px;color:#0f172a;font-size:18px;"><strong>Estamos abriendo acceso premium sin costo durante el lanzamiento.</strong></p>
        <p style="margin:0;color:#334155;">
            La intención es que negocios seleccionados puedan revisar su presencia, reclamar o actualizar su perfil
            y conocer formatos de publicidad local, premium o enterprise antes de la siguiente etapa comercial.
        </p>
    </div>

    <p><strong>¿Qué puede obtener {company_name}?</strong></p>
    <ul style="margin:0 0 18px;padding-left:20px;color:#334155;line-height:1.8;">
        <li>Presencia en búsqueda local y mapa de Geobooker.</li>
        <li>Perfil más profesional para aparecer frente a clientes cercanos.</li>
        <li>Opción de espacios patrocinados medibles por ciudad, zona o país.</li>
        <li>Acceso a la app en Android, iPhone y web para validar la experiencia.</li>
    </ul>

    <p>
        Si eres la persona indicada, responde este correo con la palabra <strong>PREMIUM</strong> y te compartimos
        los pasos para activar o revisar la presencia de <strong>{company_name}</strong>.
    </p>

    <p style="margin-top:18px;color:#92400e;">
        <strong>Nota de lanzamiento:</strong> estamos revisando accesos por bloques para cuidar la calidad de la plataforma.
    </p>

    <p>Saludos,<br><strong>Equipo Geobooker</strong></p>
    ',
    'invitation',
    null,
    true
),
(
    'CRM 2.0 Launch - Seguimiento Visibilidad',
    '¿Reservamos la revisión premium de {company_name}?',
    '
    <p>Hola <strong>{contact_name}</strong>,</p>

    <p>
        Te doy seguimiento sobre la invitación para revisar la presencia de
        <strong>{company_name}</strong> en Geobooker.
    </p>

    <div style="margin:24px 0;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
        <p style="margin:0 0 10px;color:#0f172a;"><strong>Podemos ayudarte a validar tres cosas rápidamente:</strong></p>
        <ul style="margin:0;padding-left:20px;color:#334155;line-height:1.8;">
            <li>Cómo podría verse tu negocio en búsqueda y mapa.</li>
            <li>Qué categoría o cobertura conviene usar.</li>
            <li>Qué formato publicitario tendría más sentido: local, premium o enterprise.</li>
        </ul>
    </div>

    <p>
        Si quieres que lo revisemos, responde <strong>PREMIUM</strong> o indícanos quién ve alianzas,
        marketing o crecimiento comercial en <strong>{company_name}</strong>.
    </p>

    <p>Quedo atento,<br><strong>Equipo Geobooker</strong></p>
    ',
    'followup',
    null,
    true
),
(
    'CRM 2.0 Launch - Ultima Invitacion',
    'Última invitación de lanzamiento para {company_name}',
    '
    <p>Hola <strong>{contact_name}</strong>,</p>

    <p>
        Te escribimos una última vez para dejar abierta la invitación de lanzamiento de Geobooker para
        <strong>{company_name}</strong>.
    </p>

    <div style="margin:24px 0;padding:18px;border-radius:14px;background:#fff7ed;border:1px solid #fdba74;">
        <p style="margin:0;color:#9a3412;">
            <strong>Estamos cerrando esta ronda de revisión por bloques.</strong>
            Si te interesa explorar presencia premium, publicidad local o cobertura por ciudad/país,
            este es buen momento para responder y recibir la información inicial.
        </p>
    </div>

    <p>
        Responde <strong>PREMIUM</strong> para recibir los pasos o simplemente indícanos el contacto correcto.
    </p>

    <p>
        Si no deseas más mensajes comerciales, responde con la palabra <strong>BAJA</strong>
        y respetaremos de inmediato tu preferencia.
    </p>

    <p>Saludos,<br><strong>Equipo Geobooker</strong></p>
    ',
    'reengagement',
    null,
    true
);

SELECT
    id,
    name,
    subject,
    template_type,
    is_active
FROM public.email_templates
WHERE template_type IN ('invitation', 'followup', 'reengagement')
ORDER BY created_at DESC NULLS LAST, id DESC;
