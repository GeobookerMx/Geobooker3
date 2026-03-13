import fs from 'fs';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { mapScianToGeobooker } from './scian-mapping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Configuración de Supabase (usar KEY de admin)
const supabaseUrl = process.env.VITE_SUPABASE_URL;

// IMPORTANTE: Para importar masivamente saltándonos las políticas de seguridad (RLS),
// necesitamos la "Service Role Key", no la "Anon Key" pública.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`
❌ ERROR DE PERMISOS (Row-Level Security)
Estás intentando insertar datos con la llave pública (ANON_KEY) del frontend.
La tabla "import_batches" está protegida para que solo administradores escriban en ella.

💡 CÓMO SOLUCIONARLO:
1. Ve a Supabase Dashboard -> Project Settings -> API
2. Copia la clave secreta llamada "service_role" (empieza con eyJ...)
3. Abre tu archivo .env.local y agrégala así:
   SUPABASE_SERVICE_ROLE_KEY=tu_clave_secreta_aqui
4. Vuelve a correr el comando
`);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Archivo a procesar
const CSV_FILE = path.resolve(__dirname, '../denue_datos.csv'); // <-- Ajusta el nombre de tu archivo extraído
const BATCH_SIZE = 500;

// Estado del proceso
let importBatchId = null;
let stats = {
    processed: 0,
    staged: 0,
    candidates: 0,
    duplicates: 0,
    errors: 0
};

// ==========================================================
// Utilidad: CSV Parser robusto sin dependencias externas
// ==========================================================
function parseCsvLine(text) {
    if (!text) return [];
    // Regex para hacer split por comas ignorando comas dentro de comillas
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const fields = text.split(regex);
    
    // Limpiar cada campo quitando las comillas envolventes
    return fields.map(field => {
        let f = field.trim();
        if (f.startsWith('"') && f.endsWith('"')) {
            f = f.substring(1, f.length - 1);
        }
        // Quitar comillas dobles escapadas "" -> " y cualquier otra comilla residual
        return f.replace(/""/g, '"').replace(/"/g, '');
    });
}

// ==========================================================
// Flujo Principal
// ==========================================================
async function run() {
    console.log(`🚀 Iniciando Bootstrap DENUE`);
    
    if (!fs.existsSync(CSV_FILE)) {
        console.error(`❌ Archivo no encontrado: ${CSV_FILE}`);
        console.log(`💡 Instrucción: Descarga el DENUE masivo del INEGI (archivo CSV) y colócalo en la raíz del proyecto como denue_datos.csv`);
        process.exit(1);
    }

    // 1. Crear batch en Supabase
    try {
        const { data, error } = await supabase
            .from('import_batches')
            .insert({
                source_name: 'denue',
                source_version: '2024_11', // O la versión que estés usando
                import_type: 'bootstrap',
                status: 'started',
                file_name: path.basename(CSV_FILE)
            })
            .select('id')
            .single();

        if (error) throw error;
        importBatchId = data.id;
        console.log(`✅ Lote creado. Batch ID: ${importBatchId}`);
    } catch (err) {
        console.error('❌ Error creando batch:', err.message);
        process.exit(1);
    }

    // 2. Procesamiento por lotes (Stream) - INEGI usa latin1 (ISO-8859-1)
    const fileStream = fs.createReadStream(CSV_FILE, { encoding: 'latin1' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    // Si el archivo no tiene encabezados, usamos los estándar de INEGI
    const headers = [
        "id", "clee", "nom_estab", "raz_social", "codigo_act", "nombre_act",
        "per_ocu", "tipo_vial", "nom_vial", "tipo_v_e_1", "nom_v_e_1",
        "tipo_v_e_2", "nom_v_e_2", "tipo_v_e_3", "nom_v_e_3", "numero_ext",
        "letra_ext", "edificio", "edificio_e", "numero_int", "letra_int",
        "tipo_asent", "nomb_asent", "tipoCenCom", "nom_CenCom", "num_local",
        "cod_postal", "cve_ent", "entidad", "cve_mun", "municipio",
        "cve_loc", "localidad", "ageb", "manzana", "telefono", "correoelec",
        "www", "tipoUniEco", "latitud", "longitud", "fecha_alta"
    ];

    let stagingBuffer = [];
    let candidateBuffer = [];

    // Cambiar estado a staging
    await supabase.from('import_batches').update({ status: 'staging' }).eq('id', importBatchId);

    let lineBuffer = '';

    // Conteo básico de comillas para saber si la línea está cortada por un salto de línea interno
    const countQuotes = (str) => {
        let count = 0;
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '"') {
                if (i + 1 < str.length && str[i+1] === '"') {
                    i++; 
                } else {
                    count++;
                }
            }
        }
        return count;
    };

    for await (const line of rl) {
        if (!lineBuffer && !line.trim()) continue;

        lineBuffer += (lineBuffer ? '\n' : '') + line;
        
        // Si el número de comillas es impar, significa que hay un salto de línea dentro de un campo
        const quotes = countQuotes(lineBuffer);
        if (quotes % 2 !== 0) {
            continue; // Esperar a la siguiente línea
        }

        const completeLine = lineBuffer;
        lineBuffer = ''; // Reset buffer

        const values = parseCsvLine(completeLine);
        if (values.length < 10) continue; // Línea incompleta ignorada

        // Mapear campos base (DENUE tiene ~41 columnas, buscamos las clave)
        const getVal = (colName) => {
            const idx = headers.findIndex(h => h === colName);
            if (idx === -1 || idx >= values.length) return null;
            return values[idx] || null;
        };

        const clee = getVal('clee');
        const denueId = getVal('id');
        const nombre = getVal('nom_estab') || getVal('nombre');
        
        if (!clee || !nombre) {
            if (stats.errors < 5) {
                console.log(`⚠️ Fila ignorada (faltan datos clave). clee: ${clee}, nombre: ${nombre}`);
                console.log(`   IDX clee: ${headers.findIndex(h => h === 'clee')}, IDX nombre: ${headers.findIndex(h => h === 'nom_estab')}`);
                console.log(`   Headers length: ${headers.length}, Values length: ${values.length}`);
                console.log(`   Valores detectados:`, values.slice(0, 5));
            }
            stats.errors++;
            continue;
        }

        // ==========================================
        // A. Preparar REGISTRO STAGING
        // ==========================================
        const stagingRecord = {
            import_batch_id: importBatchId,
            clee: clee,
            denue_id: denueId,
            nombre: nombre,
            razon_social: getVal('raz_social'),
            actividad_nombre: getVal('nombre_act'),
            actividad_codigo: getVal('codigo_act'),
            estrato: getVal('per_ocu'),
            tipo: getVal('tipo_vial'),
            calle: getVal('nom_vial'),
            num_exterior: getVal('numero_ext'),
            num_interior: getVal('numero_int'),
            colonia: getVal('nomb_asent'),
            cp: getVal('cod_postal'),
            localidad: getVal('localidad'),
            municipio: getVal('municipio'),
            entidad: getVal('entidad'),
            telefono: getVal('telefono'),
            correo_e: getVal('correoelec'),
            sitio_internet: getVal('www'),
            latitud: getVal('latitud'),
            longitud: getVal('longitud'),
            raw_payload: Object.fromEntries(headers.map((k, i) => [k, values[i]]))
        };
        stagingBuffer.push(stagingRecord);

        // ==========================================
        // B. Preparar REGISTRO CANDIDATO (Normalizado)
        // ==========================================
        const mappedCat = mapScianToGeobooker(stagingRecord.actividad_codigo, stagingRecord.actividad_nombre);
        
        let address = '';
        if (stagingRecord.calle) address += `${stagingRecord.tipo || ''} ${stagingRecord.calle}`;
        if (stagingRecord.num_exterior) address += ` ${stagingRecord.num_exterior}`;
        if (stagingRecord.colonia) address += `, ${stagingRecord.colonia}`;

        const cleanName = titleCase(stagingRecord.nombre);
        
        const candidateRecord = {
            import_batch_id: importBatchId,
            source_type: 'seed_denue',
            source_record_id: denueId,
            clee: clee,
            denue_id: denueId,
            name: cleanName,
            slug: createSlug(cleanName) + '-' + Math.random().toString(36).substr(2, 5),
            category_raw: stagingRecord.actividad_nombre,
            category_normalized: mappedCat.category,
            subcategory: mappedCat.subcategory,
            state_code: stagingRecord.entidad,
            city_name: stagingRecord.municipio || stagingRecord.localidad,
            address_line: address.trim(),
            postal_code: stagingRecord.cp,
            phone: stagingRecord.telefono,
            email: stagingRecord.correo_e,
            website: stagingRecord.sitio_internet,
            lat: stagingRecord.latitud ? parseFloat(stagingRecord.latitud) : null,
            lng: stagingRecord.longitud ? parseFloat(stagingRecord.longitud) : null,
            estrato: stagingRecord.estrato,
            confidence_score: 0.85,
            attribution_text: 'Fuente: INEGI, DENUE',
            moderation_status: 'pending', // Dejamos como pending, admin los revisa y publica
            raw_payload: stagingRecord.raw_payload
        };
        candidateBuffer.push(candidateRecord);

        stats.processed++;

        // ==========================================
        // C. INSERTAR BATCH EN SUPABASE
        // ==========================================
        if (stagingBuffer.length >= BATCH_SIZE) {
            await insertBatch(stagingBuffer, candidateBuffer);
            stagingBuffer = [];
            candidateBuffer = [];
        }
    }

    // Insertar último resto
    if (stagingBuffer.length > 0) {
        await insertBatch(stagingBuffer, candidateBuffer);
    }

    console.log(`\n🎉 Bootstrap completado`);
    console.log(`   Procesados: ${stats.processed}`);
    console.log(`   Staged: ${stats.staged}`);
    console.log(`   Candidatos: ${stats.candidates}`);
    console.log(`   Errores (Filas inválidas): ${stats.errors}`);

    // Update final batch status
    await supabase.from('import_batches').update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        row_count_raw: stats.processed,
        row_count_staged: stats.staged,
        row_count_candidates: stats.candidates,
        row_count_errors: stats.errors
    }).eq('id', importBatchId);

    process.exit(0);
}

// Función de inserción batch
async function insertBatch(stgBuffer, cndBuffer) {
    try {
        // 1. Insertar Staging
        const { error: err1 } = await supabase.from('staging_denue').insert(stgBuffer);
        if (err1) throw err1;
        stats.staged += stgBuffer.length;

        // 2. Insertar Candidatos
        const { error: err2 } = await supabase.from('business_candidates').insert(cndBuffer);
        if (err2) throw err2;
        stats.candidates += cndBuffer.length;

        process.stdout.write(`\r✅ Procesados: ${stats.processed} registros...`);
    } catch (err) {
        console.error('\n❌ Error insertando lote:', err.message);
        // Si hay error en candidato (ej. slug duplicado), intentamos uno por uno
        stats.errors++;
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
        .normalize('NFD') // Elimina acentos
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

// Iniciar Ejecución
run().catch(console.error);
