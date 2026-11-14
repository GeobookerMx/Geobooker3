import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('🚀 Iniciando actualización Fase 2 en Supabase...');

    // 1. Actualizar plantillas en email_templates
    console.log('📝 Desactivando plantillas anteriores...');
    const { error: deactivateError } = await supabase
        .from('email_templates')
        .update({ is_active: false })
        .in('template_type', ['invitation', 'followup', 'reengagement']);

    if (deactivateError) console.warn('Advertencia al desactivar plantillas:', deactivateError.message);

    console.log('✨ Insertando nuevas plantillas profesionales con herramientas y alianzas...');
    const templates = [
        {
            name: 'CRM 2.0 - Invitacion Premium y Alianzas',
            subject: 'Invitación especial para impulsar {company_name} en Geobooker',
            template_type: 'invitation',
            is_active: true,
            html_content: `
            <p>Hola <strong>{contact_name}</strong>,</p>

            <p>
                Te saludamos del equipo directivo de <strong>Geobooker</strong>. Hemos seleccionado a
                <strong>{company_name}</strong> dentro de nuestro programa de lanzamiento para negocios destacados,
                con el objetivo de brindarte mayor exposición frente a clientes que buscan activamente servicios y productos en tu zona.
            </p>

            <div style="margin:22px 0;padding:20px;border-radius:14px;background:#f0fdf4;border:1px solid #bbf7d0;">
                <p style="margin:0 0 8px;color:#166534;font-size:17px;font-weight:700;">
                    ✨ Acceso Premium Sin Costo por Etapa de Lanzamiento
                </p>
                <p style="margin:0;color:#15803d;font-size:14px;line-height:1.6;">
                    Queremos que <strong>{company_name}</strong> active su presencia destacada en nuestro mapa interactivo,
                    verifique su información y explore nuestras opciones de publicidad local y patrocinios medibles.
                </p>
            </div>

            <p>
                Para validar la ficha de <strong>{company_name}</strong> y activar tu acceso premium de lanzamiento,
                simplemente responde a este correo con la palabra <strong>PREMIUM</strong> o contáctanos directamente.
            </p>

            <p style="color:#64748b;font-size:13.5px;margin-top:18px;">
                <em>Nota: Los accesos preferenciales se liberan en cupos programados para garantizar la calidad del servicio.</em>
            </p>

            <p>Atentamente,<br><strong>Dirección Comercial Geobooker</strong></p>
            `
        },
        {
            name: 'CRM 2.0 - Seguimiento Comercial',
            subject: '¿Deseas activar la presencia destacada de {company_name}?',
            template_type: 'followup',
            is_active: true,
            html_content: `
            <p>Hola <strong>{contact_name}</strong>,</p>

            <p>
                Te escribo para dar seguimiento a la invitación enviada para <strong>{company_name}</strong>.
                Queremos asegurarnos de que no pierdas la oportunidad de contar con presencia preferencial en Geobooker.
            </p>

            <div style="margin:20px 0;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                <p style="margin:0 0 10px;color:#0f172a;font-weight:600;">En minutos podemos ayudarte a:</p>
                <ul style="margin:0;padding-left:20px;color:#334155;line-height:1.75;">
                    <li>Posicionar a <strong>{company_name}</strong> en los primeros resultados de búsqueda local.</li>
                    <li>Vincular tu catálogo y botón de WhatsApp directo en tu perfil.</li>
                    <li>Evaluar opciones de patrocinio o alianzas comerciales estratégicas.</li>
                </ul>
            </div>

            <p>
                Si te interesa revisarlo, responde a este correo con la palabra <strong>PREMIUM</strong>
                o indícanos con quién de tu equipo podemos coordinarlo.
            </p>

            <p>Saludos cordiales,<br><strong>Equipo Geobooker</strong></p>
            `
        },
        {
            name: 'CRM 2.0 - Ultima Ronda y Red de Socios',
            subject: 'Última oportunidad de acceso preferente para {company_name}',
            template_type: 'reengagement',
            is_active: true,
            html_content: `
            <p>Hola <strong>{contact_name}</strong>,</p>

            <p>
                Te contactamos por última ocasión respecto al acceso de lanzamiento en Geobooker para
                <strong>{company_name}</strong>.
            </p>

            <div style="margin:20px 0;padding:18px;border-radius:14px;background:#fff7ed;border:1px solid #fdba74;">
                <p style="margin:0;color:#9a3412;font-size:14px;line-height:1.6;">
                    Estamos completando el bloque actual de incorporaciones comerciales en tu sector. Si deseas evaluar
                    presencia premium, publicidad por geocercas o integrarte a nuestra <strong>Red de Socios Comerciales</strong>,
                    este es el momento oportuno.
                </p>
            </div>

            <p>
                Responde <strong>PREMIUM</strong> a este mensaje o pulsa el botón de WhatsApp abajo si prefieres
                hablar directamente con uno de nuestros ejecutivos de cuenta.
            </p>

            <p>Atentamente,<br><strong>Equipo Geobooker</strong></p>
            `
        }
    ];

    const { data: insertedTemplates, error: insertError } = await supabase
        .from('email_templates')
        .insert(templates)
        .select('id, name, template_type, is_active');

    if (insertError) {
        console.error('❌ Error al insertar plantillas:', insertError.message);
    } else {
        console.log('✅ Plantillas insertadas y activas:', insertedTemplates);
    }

    console.log('✅ Proceso completado.');
}

run().catch(console.error);
