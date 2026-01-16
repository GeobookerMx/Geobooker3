import { supabase } from '../lib/supabase';

/**
 * Procesa un lote de registros de un CSV
 * Solo requiere: Compañía, Email, Teléfono
 * @param {Array} rows - Arreglo de objetos normalizados
 * @returns {Promise<Object>} - Resultado del lote
 */
export async function bulkImportBusinesses(rows) {
    try {
        const payload = rows.map(row => {
            return {
                // Campos requeridos
                name: row.name || row.company || row.compania || 'Sin nombre',
                phone: row.phone || row.telefono || row.tel || '',
                contact_email: row.email || row.correo || '',

                // Campos opcionales con defaults
                category: row.category || row.categoria || 'General',
                city: row.city || row.ciudad || '',
                tier: 'A', // Default

                // Metadata de importación
                is_claimed: false,
                status: 'pending_verification',
                imported_at: new Date().toISOString(),
                verification_token: Math.random().toString(36).substring(2, 15),

                // Sin owner (bulk import sin dueño)
                owner_id: null
            };
        });

        const { data, error } = await supabase
            .from('businesses')
            .insert(payload)
            .select('id');

        if (error) throw error;
        return { success: true, count: data.length };
    } catch (error) {
        console.error('Error en importación masiva:', error);
        return { success: false, error: error.message };
    }
}
