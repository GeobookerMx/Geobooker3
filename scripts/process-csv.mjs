// scripts/process-csv.mjs
/**
 * Script para procesar y limpiar CSV de leads
 * - Lee el CSV original
 * - Filtra solo emails válidos
 * - Clasifica por Tier
 * - Exporta archivos separados
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración - buscar cualquier archivo xlsx o csv en data/
const DATA_DIR = path.join(__dirname, '../data');
const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'));
const INPUT_FILE = files.length > 0 ? path.join(DATA_DIR, files[0]) : null;
const OUTPUT_DIR = path.join(__dirname, '../data/processed');

// Crear directorio de salida
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Validar email
function isValidEmail(email) {
    if (!email) return false;
    const e = String(email).trim().toLowerCase();
    return e.includes('@') && e.includes('.') && e.length > 5;
}

// Normalizar email
function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

// Determinar Tier basado en tipo de empresa y puesto
function determineTier(row) {
    const tipo = String(row.Tipo || row['Tipo de empresa'] || '').toLowerCase();
    const puesto = String(row.Puesto || row.Position || '').toLowerCase();

    // AAA: Grandes empresas, directores
    if (puesto.includes('director') || puesto.includes('ceo') || puesto.includes('presidente')) {
        return 'AAA';
    }
    if (tipo.includes('corporativo') || tipo.includes('multinacional') || tipo.includes('grande')) {
        return 'AAA';
    }

    // AA: Gerentes, empresas medianas
    if (puesto.includes('gerente') || puesto.includes('manager') || puesto.includes('jefe')) {
        return 'AA';
    }
    if (tipo.includes('mediana') || tipo.includes('comercial')) {
        return 'AA';
    }

    // A: Coordinadores, pequeñas empresas
    if (puesto.includes('coordinador') || puesto.includes('supervisor')) {
        return 'A';
    }

    // B: Resto
    return 'B';
}

// Procesar el CSV
async function processCSV() {
    console.log('\n🔄 PROCESADOR DE CSV DE LEADS');
    console.log('='.repeat(50));

    if (!INPUT_FILE || !fs.existsSync(INPUT_FILE)) {
        console.error('❌ No se encontró ningún archivo CSV/XLSX en data/');
        console.log('\n📋 Instrucciones:');
        console.log('1. Copia tu archivo CSV o Excel a: data/');
        console.log('2. Ejecuta este script de nuevo');
        return;
    }

    console.log('📂 Archivo encontrado:', path.basename(INPUT_FILE));
    console.log('📊 Procesando...\n');

    // Leer CSV/XLSX
    const workbook = XLSX.readFile(INPUT_FILE);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Total filas en archivo: ${data.length.toLocaleString()}`);

    // Mostrar headers del archivo
    if (data.length > 0) {
        console.log('📋 Columnas detectadas:', Object.keys(data[0]).join(', '));
    }

    // Filtrar y limpiar
    const seen = new Set();
    const cleaned = [];
    let duplicates = 0;
    let noEmail = 0;

    for (const row of data) {
        const email = normalizeEmail(row.Email || row.email || row['Email corporativo']);

        if (!isValidEmail(email)) {
            noEmail++;
            continue;
        }

        if (seen.has(email)) {
            duplicates++;
            continue;
        }
        seen.add(email);

        cleaned.push({
            name: String(row.Nombre || row.name || row.Name || '').trim(),
            email: email,
            company: String(row.Compañía || row.Empresa || row.company || '').trim(),
            position: String(row.Puesto || row.Position || '').trim(),
            phone: String(row.Telefono || row.phone || row['Teléfono'] || '').trim(),
            tier: determineTier(row),
            company_type: String(row.Tipo || row['Tipo de empresa'] || '').trim(),
            city: String(row.Ciudad || row.city || '').trim(),
            website: String(row.Web || row.website || '').trim()
        });
    }

    console.log(`\n✅ Contactos con email válido: ${cleaned.length.toLocaleString()}`);
    console.log(`🚫 Sin email válido: ${noEmail.toLocaleString()}`);
    console.log(`🔄 Duplicados removidos: ${duplicates.toLocaleString()}`);

    // Separar por Tier
    const tiers = {
        AAA: cleaned.filter(c => c.tier === 'AAA'),
        AA: cleaned.filter(c => c.tier === 'AA'),
        A: cleaned.filter(c => c.tier === 'A'),
        B: cleaned.filter(c => c.tier === 'B')
    };

    console.log('\n📊 DISTRIBUCIÓN POR TIER:');
    console.log('-'.repeat(40));
    for (const [tier, contacts] of Object.entries(tiers)) {
        const pct = cleaned.length > 0 ? ((contacts.length / cleaned.length) * 100).toFixed(1) : 0;
        console.log(`   ${tier}: ${contacts.length.toLocaleString().padStart(8)} contactos (${pct}%)`);

        // Exportar a CSV
        if (contacts.length > 0) {
            const ws = XLSX.utils.json_to_sheet(contacts);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, tier);
            const outFile = path.join(OUTPUT_DIR, `tier_${tier}.csv`);
            XLSX.writeFile(wb, outFile);
        }
    }

    // Exportar todo limpio
    const wsAll = XLSX.utils.json_to_sheet(cleaned);
    const wbAll = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbAll, wsAll, 'All');
    const allCleanedPath = path.join(OUTPUT_DIR, 'all_cleaned.csv');
    XLSX.writeFile(wbAll, allCleanedPath);

    console.log('\n💾 ARCHIVOS GENERADOS:');
    console.log('-'.repeat(40));
    console.log(`   📁 ${OUTPUT_DIR}/`);
    console.log(`      • all_cleaned.csv (${cleaned.length.toLocaleString()} contactos)`);
    console.log(`      • tier_AAA.csv (${tiers.AAA.length.toLocaleString()} contactos)`);
    console.log(`      • tier_AA.csv (${tiers.AA.length.toLocaleString()} contactos)`);
    console.log(`      • tier_A.csv (${tiers.A.length.toLocaleString()} contactos)`);
    console.log(`      • tier_B.csv (${tiers.B.length.toLocaleString()} contactos)`);

    console.log('\n📌 SIGUIENTE PASO:');
    console.log('-'.repeat(40));
    console.log('   Ve a /admin/marketing e importa el archivo all_cleaned.csv');
    console.log('   O importa archivos por tier según tu estrategia.');

    console.log('\n✅ ¡Proceso completado!\n');
}

// Ejecutar
processCSV().catch(console.error);
