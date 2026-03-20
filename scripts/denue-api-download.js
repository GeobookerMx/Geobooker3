/**
 * DENUE API Downloader — Descarga negocios por estado directo del INEGI API
 * 
 * Uso:
 *   node scripts/denue-api-download.js --estado=14         # Jalisco
 *   node scripts/denue-api-download.js --estado=19         # Nuevo León
 *   node scripts/denue-api-download.js --estado=14,19      # Ambos
 * 
 * Requisitos:
 *   - INEGI_DENUE_TOKEN en .env.local (obtener en https://www.inegi.org.mx/app/api/denue/v1/tokenVerify.aspx)
 *   - SUPABASE_SERVICE_ROLE_KEY en .env.local
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { mapScianToGeobooker } from './scian-mapping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// =====================================================
// Configuración
// =====================================================
const INEGI_TOKEN = process.env.INEGI_DENUE_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!INEGI_TOKEN) {
    console.error(`
❌ Falta tu token del API DENUE de INEGI.

💡 Cómo obtenerlo (GRATIS):
  1. Ve a: https://www.inegi.org.mx/app/api/denue/v1/tokenVerify.aspx
  2. Ingresa tu email y te envían el token
  3. Agrégalo en .env.local:
     INEGI_DENUE_TOKEN=tu_token_aqui
`);
    process.exit(1);
}

if (!SUPABASE_KEY) {
    console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Catálogo de estados
const ESTADOS = {
    '01': 'Aguascalientes', '02': 'Baja California', '03': 'Baja California Sur',
    '04': 'Campeche', '05': 'Coahuila', '06': 'Colima', '07': 'Chiapas',
    '08': 'Chihuahua', '09': 'Ciudad de México', '10': 'Durango',
    '11': 'Guanajuato', '12': 'Guerrero', '13': 'Hidalgo', '14': 'Jalisco',
    '15': 'Estado de México', '16': 'Michoacán', '17': 'Morelos', '18': 'Nayarit',
    '19': 'Nuevo León', '20': 'Oaxaca', '21': 'Puebla', '22': 'Querétaro',
    '23': 'Quintana Roo', '24': 'San Luis Potosí', '25': 'Sinaloa', '26': 'Sonora',
    '27': 'Tabasco', '28': 'Tamaulipas', '29': 'Tlaxcala', '30': 'Veracruz',
    '31': 'Yucatán', '32': 'Zacatecas'
};

// Config
const PAGE_SIZE = 1000;       // Registros por request API
const BATCH_SIZE = 500;       // Registros por insert a Supabase
const DELAY_MS = 300;         // Delay entre requests API (ser amable con INEGI)
const MAX_RETRIES = 3;        // Reintentos por página fallida

// =====================================================
// Parse args
// =====================================================
const args = process.argv.slice(2);
const estadoArg = args.find(a => a.startsWith('--estado='));
if (!estadoArg) {
    console.error('❌ Uso: node scripts/denue-api-download.js --estado=14,19');
    console.log('\nEstados disponibles:');
    Object.entries(ESTADOS).forEach(([code, name]) => console.log(`  ${code}: ${name}`));
    process.exit(1);
}
const estadoCodes = estadoArg.split('=')[1].split(',').map(s => s.trim());

// Validar
for (const code of estadoCodes) {
    if (!ESTADOS[code]) {
        console.error(`❌ Estado '${code}' no válido. Códigos válidos: ${Object.keys(ESTADOS).join(', ')}`);
        process.exit(1);
    }
}

// =====================================================
// API DENUE — BuscarEntidad
// =====================================================
async function fetchPage(estadoCode, start, end) {
    const url = `https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarEntidad/todos/${estadoCode}/${start}/${end}/${INEGI_TOKEN}`;

    for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(30000) // 30s timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data || [];
        } catch (err) {
            console.warn(`  ⚠️ Intento ${retry + 1}/${MAX_RETRIES} falló: ${err.message}`);
            if (retry < MAX_RETRIES - 1) {
                await sleep(2000 * (retry + 1)); // Backoff
            }
        }
    }
    console.error(`  ❌ Página ${start}-${end} falló después de ${MAX_RETRIES} intentos`);
    return [];
}

// =====================================================
// Cuantificar — Obtener total de registros por estado
// =====================================================
async function countRecords(estadoCode) {
    const url = `https://www.inegi.org.mx/app/api/denue/v1/consulta/Cuantificar/todos/${estadoCode}/0/0/${INEGI_TOKEN}`;
    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(15000)
        });
        const data = await response.json();
        // API returns array or object with count
        if (Array.isArray(data) && data.length > 0) {
            return parseInt(data[0]) || 0;
        }
        if (typeof data === 'number') return data;
        if (data?.Total) return parseInt(data.Total);
        // Try parsing the full response
        const str = JSON.stringify(data);
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    } catch (err) {
        console.warn(`⚠️ No se pudo cuantificar estado ${estadoCode}: ${err.message}`);
        return 0;
    }
}

// =====================================================
// Mapear record del API → business_candidates
// =====================================================
function mapApiRecord(record, importBatchId) {
    // BuscarEntidad fields:
    // CLEE, Id, Nombre, RazonSocial, Actividad, Estrato,
    // TipoVialidad, Calle, NumExterior, NumInterior, Colonia, CP,
    // UbicacionCompleta, Telefono, Email, Web, TipoEstablecimiento,
    // Longitud, Latitud

    const clee = record.CLEE || record.clee || '';
    const denueId = record.Id || record.id || '';
    const nombre = record.Nombre || record.nombre || '';
    const razonSocial = record.Razon_social || record.razon_social || '';
    const actividad = record.Clase_actividad || record.clase_actividad || record.Actividad || '';
    const estrato = record.Estrato || record.estrato || record.Per_ocu || '';
    const tipoVialidad = record.Tipo_vialidad || record.tipo_vialidad || '';
    const calle = record.Calle || record.calle || '';
    const numExterior = record.Num_Exterior || record.num_exterior || '';
    const numInterior = record.Num_Interior || record.num_interior || '';
    const colonia = record.Colonia || record.colonia || '';
    const cp = record.Cod_postal || record.cod_postal || record.CP || '';
    const ubicacion = record.Ubicacion || record.ubicacion || '';
    const telefono = record.Telefono || record.telefono || '';
    const email = record.Correo_e || record.correo_e || '';
    const web = record.Sitio_internet || record.sitio_internet || record.www || '';
    const lng = parseFloat(record.Longitud || record.longitud || '0');
    const lat = parseFloat(record.Latitud || record.latitud || '0');

    if (!clee || !nombre) return null;

    // Extraer entidad, municipio, localidad del campo Ubicacion 
    // Formato: "Localidad, Municipio, EntidadFederativa"
    const ubicParts = ubicacion.split(',').map(s => s.trim());
    const entidad = ubicParts.length >= 3 ? ubicParts[ubicParts.length - 1] : '';
    const municipio = ubicParts.length >= 2 ? ubicParts[ubicParts.length - 2] : '';
    const localidad = ubicParts.length >= 1 ? ubicParts[0] : '';

    // SCIAN mapping
    // Extract SCIAN code from actividad — API returns description, we need to handle this
    const actividadLower = actividad.toLowerCase();
    const mappedCat = mapScianToGeobooker('', actividadLower);

    // Build address
    let address = '';
    if (calle) address += `${tipoVialidad} ${calle}`.trim();
    if (numExterior) address += ` ${numExterior}`;
    if (colonia) address += `, ${colonia}`;

    const cleanName = titleCase(nombre);

    return {
        import_batch_id: importBatchId,
        source_type: 'seed_denue',
        source_record_id: denueId,
        clee: clee,
        denue_id: denueId,
        name: cleanName,
        slug: createSlug(cleanName) + '-' + Math.random().toString(36).substr(2, 5),
        category_raw: actividad,
        category_normalized: mappedCat.category,
        subcategory: mappedCat.subcategory,
        state_code: entidad,
        city_name: municipio || localidad,
        address_line: address.trim(),
        postal_code: cp,
        phone: telefono || null,
        email: email || null,
        website: web || null,
        lat: lat || null,
        lng: lng || null,
        estrato: estrato,
        confidence_score: 0.85,
        attribution_text: 'Fuente: INEGI, DENUE',
        moderation_status: 'pending'
    };
}

// =====================================================
// Main — Procesar un estado
// =====================================================
async function processEstado(estadoCode) {
    const estadoName = ESTADOS[estadoCode];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏛️  Descargando: ${estadoName} (código ${estadoCode})`);
    console.log(`${'='.repeat(60)}`);

    // 1. Cuantificar registros
    const totalEstimado = await countRecords(estadoCode);
    console.log(`📊 Registros estimados: ${totalEstimado.toLocaleString()}`);

    if (totalEstimado === 0) {
        console.log('⚠️ No se obtuvo conteo, intentaremos descargar de todas formas...');
    }

    // 2. Crear batch en Supabase
    const { data: batchData, error: batchError } = await supabase
        .from('import_batches')
        .insert({
            source_name: 'denue',
            source_version: 'API_2025',
            import_type: 'bootstrap',
            country_code: 'MX',
            state_code: estadoCode,
            city_name: estadoName,
            status: 'started',
            file_name: `api_estado_${estadoCode}`
        })
        .select('id')
        .single();

    if (batchError) {
        console.error('❌ Error creando batch:', batchError.message);
        return;
    }
    const importBatchId = batchData.id;
    console.log(`✅ Batch creado: ${importBatchId}`);

    // 3. Descargar por páginas
    let start = 1;
    let totalFetched = 0;
    let totalInserted = 0;
    let totalErrors = 0;
    let candidateBuffer = [];
    let emptyPages = 0;
    const maxTotal = totalEstimado || 500000; // fallback

    await supabase.from('import_batches').update({ status: 'staging' }).eq('id', importBatchId);

    const startTime = Date.now();

    while (start <= maxTotal + PAGE_SIZE) {
        const end = start + PAGE_SIZE - 1;
        const records = await fetchPage(estadoCode, start, end);

        if (!records || records.length === 0) {
            emptyPages++;
            if (emptyPages >= 3) {
                console.log(`\n🏁 Fin de datos (${emptyPages} páginas vacías consecutivas)`);
                break;
            }
            start += PAGE_SIZE;
            await sleep(DELAY_MS);
            continue;
        }

        emptyPages = 0; // Reset
        totalFetched += records.length;

        // Mapear y bufferizar
        for (const record of records) {
            const mapped = mapApiRecord(record, importBatchId);
            if (mapped) {
                candidateBuffer.push(mapped);
            } else {
                totalErrors++;
            }
        }

        // Insertar cuando el buffer esté lleno
        if (candidateBuffer.length >= BATCH_SIZE) {
            const inserted = await insertBatch(candidateBuffer.splice(0, BATCH_SIZE));
            totalInserted += inserted;
        }

        // Progress
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = Math.round(totalFetched / (elapsed || 1) * 60);
        const pct = totalEstimado > 0 ? ` (${Math.round(totalFetched / totalEstimado * 100)}%)` : '';
        process.stdout.write(`\r📥 ${totalFetched.toLocaleString()}${pct} descargados | ✅ ${totalInserted.toLocaleString()} insertados | ⏱️ ${elapsed}s | ~${rate}/min  `);

        start += PAGE_SIZE;
        await sleep(DELAY_MS);
    }

    // Insertar resto del buffer
    if (candidateBuffer.length > 0) {
        const inserted = await insertBatch(candidateBuffer);
        totalInserted += inserted;
    }

    // Actualizar batch
    await supabase.from('import_batches').update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        row_count_raw: totalFetched,
        row_count_candidates: totalInserted,
        row_count_errors: totalErrors
    }).eq('id', importBatchId);

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n\n🎉 ${estadoName} completado:`);
    console.log(`   📥 Descargados: ${totalFetched.toLocaleString()}`);
    console.log(`   ✅ Insertados:  ${totalInserted.toLocaleString()}`);
    console.log(`   ❌ Errores:     ${totalErrors}`);
    console.log(`   ⏱️  Tiempo:      ${elapsed} minutos`);
}

// =====================================================
// Insert batch a Supabase (con upsert para evitar dupes)
// =====================================================
async function insertBatch(batch) {
    try {
        const { data, error } = await supabase
            .from('business_candidates')
            .upsert(batch, {
                onConflict: 'clee',
                ignoreDuplicates: true
            });

        if (error) {
            // Si upsert falla (e.g., no unique en clee), intentar insert normal
            const { error: err2 } = await supabase
                .from('business_candidates')
                .insert(batch);
            if (err2) {
                console.warn(`\n⚠️ Error insertando lote: ${err2.message}`);
                return 0;
            }
        }
        return batch.length;
    } catch (err) {
        console.warn(`\n⚠️ Error en batch insert: ${err.message}`);
        return 0;
    }
}

// Utils
function titleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
}

function createSlug(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================
// RUN
// =====================================================
async function main() {
    console.log(`🚀 DENUE API Downloader`);
    console.log(`📡 Token: ${INEGI_TOKEN.substring(0, 8)}...`);
    console.log(`🗄️  Supabase: ${SUPABASE_URL}`);
    console.log(`📋 Estados: ${estadoCodes.map(c => `${ESTADOS[c]} (${c})`).join(', ')}`);
    console.log('');

    for (const code of estadoCodes) {
        await processEstado(code);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Todos los estados procesados.`);
    console.log(`\n💡 Siguiente paso: ejecuta en Supabase SQL Editor:`);
    console.log(`   ANALYZE business_candidates;`);
    console.log(`   NOTIFY pgrst, 'reload schema';`);
    console.log(`${'='.repeat(60)}`);
}

main().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
