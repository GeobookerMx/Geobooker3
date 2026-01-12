import { supabase } from '../lib/supabase';

/**
 * Procesa una plantilla reemplazando las variables {{var}} por datos del negocio
 * @param {string} content - HTML o Texto con variables
 * @param {Object} data - Datos para reemplazar
 * @returns {string} - Contenido procesado
 */
export function processTemplate(content, data) {
    let processed = content;
    const vars = {
        nombre_negocio: data.name || 'tu negocio',
        direccion: data.address || 'tu ubicación',
        telefono: data.phone || '',
        puesto: data.manager_role || 'Director',
        manager: data.manager_name || 'Estimado(a)',
        ciudad: data.city || '',
        personal: data.employee_count || '',
        web: data.website || '',
        id_negocio: data.id || '',
        token: data.verification_token || '',
        unsubscribe_url: `${window.location.origin}/unsubscribe?email=${encodeURIComponent(data.contact_email || '')}&token=${data.verification_token || ''}`,
        logo_url: `${window.location.origin}/images/geobooker-logo-clean.png`
    };

    Object.keys(vars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processed = processed.replace(regex, vars[key]);
    });

    return processed;
}

/**
 * Envía un correo a través de la infraestructura de Geobooker
 * NOTA: Esto normalmente dispararía una Supabase Edge Function o un endpoint backend.
 */
export async function sendEmail({ to, subject, html }) {
    try {
        // En una implementación real, aquí llamaríamos a Resend API 
        // o a una Supabase Edge Function de Geobooker.
        console.log(`✉️ Enviando email a: ${to} | Asunto: ${subject}`);

        // Simulación de envío exitoso
        return { success: true };
    } catch (error) {
        console.error('Error enviando email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene los destinatarios segmentados por nivel (A, AA, AAA)
 */
export async function getRecipientsByTier(tier) {
    const { data, error } = await supabase
        .from('businesses')
        .select('id, name, contact_email, address, verification_token')
        .eq('tier', tier)
        .not('contact_email', 'is', null);

    if (error) throw error;
    return data;
}
