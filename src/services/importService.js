import { supabase } from '../lib/supabase';

/**
 * Procesa un lote de registros de un CSV
 * @param {Array} rows - Arreglo de objetos normalizados
 * @returns {Promise<Object>} - Resultado del lote
 */
export async function bulkImportBusinesses(rows) {
    try {
        const payload = rows.map(row => {
            // Lógica de mapeo de niveles
            let tier = 'A';
            if (row.tier === 'AAA' || row.tamano === 'AAA') tier = 'AAA';
            else if (row.tier === 'AA' || row.tamano === 'AA') tier = 'AA';
            else if (row.tier === 'A' || row.tamano === 'A') tier = 'A';
            else if (row.tier === 'B' || row.tamano === 'B') tier = 'A'; // B mapea a A por defecto

            return {
                name: row.name,
                address: row.address,
                phone: row.phone,
                category: row.category || 'Empresa',
                contact_email: row.email,
                manager_name: row.manager_name,
                manager_role: row.manager_role,
                city: row.city,
                postal_code: row.postal_code || row.pc,
                suburb: row.suburb,
                employee_count: row.employee_count,
                website_url: row.website,
                preferred_language: row.language || 'es',
                country_code: row.country || 'MX',
                tier: tier,
                is_claimed: false,
                status: 'pending_verification',
                imported_at: new Date().toISOString(),
                verification_token: Math.random().toString(36).substring(2, 15)
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
