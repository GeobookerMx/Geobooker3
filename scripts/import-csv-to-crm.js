/**
 * 📥 Importador CSV → marketing_contacts (Geobooker CRM)
 * Sin dependencias externas - usa solo Node.js nativo + dotenv + supabase-js
 * 
 * Uso:
 *   node scripts/import-csv-to-crm.js --dry-run          (solo muestra resumen)
 *   node scripts/import-csv-to-crm.js --tier=AAA         (solo tier AAA)
 *   node scripts/import-csv-to-crm.js --limit=500        (solo 500 registros)
 *   node scripts/import-csv-to-crm.js                    (importa todo con email)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname2 = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname2, '../.env.local') });

// ── Args ───────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? 'true']; })
);
const FILTER_TIER = (args.tier || 'todos').toUpperCase();
const LIMIT       = args.limit ? parseInt(args.limit) : Infinity;
const DRY_RUN     = args['dry-run'] === 'true';

// ── Config ─────────────────────────────────────────────────────
const CSV_PATH    = 'C:\\Users\\juanpablo\\OneDrive\\Escritorio\\Base de DAtos 1\\Empresarial AAA AA A y B.csv';
const BATCH_SIZE  = 100;

// ── Parser CSV nativo ──────────────────────────────────────────
function parseCSV(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Headers (primera línea) - limpiar BOM y espacios
  const headers = splitCSVLine(lines[0]).map(h => h.trim().replace(/^\uFEFF/, '').replace(/\r/, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = splitCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let curr = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { curr += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(curr); curr = '';
    } else {
      curr += ch;
    }
  }
  result.push(curr);
  return result;
}

// Columnas reales del CSV:
// Compañía, Puesto, Nombre, Email, Tipo, Tamaño, personal,
// Colonia, Código postal, Ciudad, Estado, Teléfono, Teléfono 2, Teléfono 3,
// Email corporativo, www

// ── Clasificador de tier ────────────────────────────────────────
function clasificarTier(row) {
  const tipo = (row['Tipo'] || '').trim().toUpperCase();
  if (['AAA', 'AA', 'A', 'B'].includes(tipo)) return tipo;
  // Fallback por tamaño
  const tamano   = (row['Tamaño'] || '').trim().toUpperCase();
  const personal = parseInt(row['personal'] || '0') || 0;
  if (personal >= 250 || tamano.includes('GRANDE'))  return 'AAA';
  if (personal >= 50  || tamano.includes('MEDIANA')) return 'AA';
  if (personal >= 11  || tamano.includes('PEQUEÑA')) return 'A';
  return 'B';
}

// ── Normalizar fila ─────────────────────────────────────────────
function normalizarFila(row) {
  const compania = (row['Compañía'] || '').trim();
  const nombre   = (row['Nombre']   || '').trim();
  const puesto   = (row['Puesto']   || '').trim();
  // Priorizar email corporativo, fallback a columna Email
  const emailCorp = (row['Email corporativo'] || '').trim().toLowerCase();
  const emailMain = (row['Email'] || '').trim().toLowerCase();
  const email     = emailCorp || emailMain;
  const colonia   = (row['Colonia'] || '').trim();
  const cp        = (row['Código postal'] || '').trim();
  const telefono  = (row['Teléfono'] || row['Telefono 2'] || '').trim();
  const website   = (row['www'] || '').trim();
  const ciudad    = (row['Ciudad'] || '').trim();
  const estado    = (row['Estado'] || '').trim();
  const tier      = clasificarTier(row);
  return { compania, nombre, puesto, email, colonia, cp, telefono, website, ciudad, estado, tier };
}

// ── Validar email ───────────────────────────────────────────────
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Importador CSV → Geobooker CRM\n');

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ No se encontró: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log('📖 Leyendo CSV...');
  // Intentar utf8, fallback a latin1
  // El CSV usa codificación latin1 (Windows-1252)
  let raw;
  try {
    raw = fs.readFileSync(CSV_PATH, 'latin1');
  } catch {
    raw = fs.readFileSync(CSV_PATH, 'utf8');
  }

  const records = parseCSV(raw);
  console.log(`📊 Total filas: ${records.length.toLocaleString()}`);
  if (records.length) {
    console.log(`📋 Columnas: ${Object.keys(records[0]).join(', ')}\n`);
  }

  // Normalizar
  let todos = records.map(normalizarFila);

  // Filtrar: debe tener empresa o nombre
  todos = todos.filter(r => r.compania || r.nombre);

  // Solo con email válido
  const conEmail = todos.filter(r => emailRegex.test(r.email));
  console.log(`📧 Con email válido: ${conEmail.toLocaleString ? conEmail.length.toLocaleString() : conEmail.length}`);

  // Filtrar duplicados por email (quedarse con el primero)
  const emailSet = new Set();
  const sinDuplicados = conEmail.filter(r => {
    if (emailSet.has(r.email)) return false;
    emailSet.add(r.email);
    return true;
  });
  console.log(`🔁 Sin duplicados de email: ${sinDuplicados.length.toLocaleString()}`);

  // Filtrar por tier
  const filtrados = FILTER_TIER === 'TODOS'
    ? sinDuplicados
    : sinDuplicados.filter(r => r.tier === FILTER_TIER);

  // Aplicar límite
  const aImportar = filtrados.slice(0, LIMIT);

  // Estadísticas por tier
  const byTier = aImportar.reduce((acc, r) => { acc[r.tier] = (acc[r.tier]||0)+1; return acc; }, {});
  console.log(`\n✅ A importar: ${aImportar.length.toLocaleString()} registros`);
  console.log(`   AAA: ${byTier.AAA||0} | AA: ${byTier.AA||0} | A: ${byTier.A||0} | B: ${byTier.B||0}`);

  if (DRY_RUN) {
    console.log('\n🧪 DRY-RUN - Primeros 3 registros:');
    console.log(JSON.stringify(aImportar.slice(0, 3), null, 2));
    console.log('\n✅ Dry-run listo. Corre sin --dry-run para insertar en Supabase.');
    return;
  }

  // Conectar Supabase
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('❌ Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  let insertados = 0, errores = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < aImportar.length; i += BATCH_SIZE) {
    const batch = aImportar.slice(i, i + BATCH_SIZE).map(r => ({
      company_name:  r.compania  || null,
      contact_name:  r.nombre    || null,
      contact_title: r.puesto    || null,
      email:         r.email     || null,
      phone:         r.telefono  || null,
      website:       r.website   || null,
      address:       [r.colonia, r.cp].filter(Boolean).join(', ') || null,
      city:          r.ciudad    || null,
      state:         r.estado    || null,
      tier:          r.tier,
      source:        'csv_import',
      status:        'pendiente',
      notes:         `CSV: Empresarial AAA/AA/A/B - ${today}`
    }));

    const { error } = await supabase
      .from('marketing_contacts')
      .upsert(batch, { onConflict: 'email', ignoreDuplicates: true });

    if (error) {
      console.error(`❌ Error lote ${i}–${i+BATCH_SIZE}: ${error.message}`);
      errores += batch.length;
    } else {
      insertados += batch.length;
    }

    if (insertados % 1000 === 0 || i + BATCH_SIZE >= aImportar.length) {
      const pct = Math.round(((i + BATCH_SIZE) / aImportar.length) * 100);
      console.log(`📥 ${insertados.toLocaleString()} insertados | ❌ ${errores} errores | ${Math.min(pct,100)}%`);
    }
  }

  console.log(`\n🎉 ¡Importación completada!`);
  console.log(`   ✅ Insertados: ${insertados.toLocaleString()}`);
  console.log(`   ❌ Errores:    ${errores}`);
  console.log(`\n🤖 N8N procesará los leads AAA automáticamente vía webhook.`);
}

main().catch(console.error);
