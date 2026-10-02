#!/usr/bin/env node
/**
 * DENUE → Geobooker GeoScore Import
 * ====================================
 * Lee denue_datos.csv (INEGI) y lo importa en lotes a
 * public.international_businesses en Supabase.
 *
 * Uso:
 *   node scripts/import-denue-geoscore.mjs
 *
 * Variables requeridas (.env.local):
 *   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * El script:
 *   - Filtra solo registros con latitud y longitud válidas
 *   - Mapea codigo_act (SCIAN) a category/subcategory
 *   - Genera slug único por id DENUE
 *   - Importa en lotes de 300 con retries automáticos
 *   - Muestra progreso en tiempo real
 *   - Es idempotente: ON CONFLICT DO NOTHING
 */

import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// ── Config ─────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.join(ROOT, '.env.local');
const envVars = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = envVars['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;
const CSV_FILE     = path.join(ROOT, 'denue_datos.csv');
const BATCH_SIZE   = 300;   // registros por lote
const MAX_RETRIES  = 3;     // reintentos por lote fallido
const DELAY_MS     = 400;   // pausa entre lotes (ms)

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

if (!fs.existsSync(CSV_FILE)) {
  console.error(`❌ No se encontró: ${CSV_FILE}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── Mapeo SCIAN → GeoScore category ────────────────────────────────────────
// SCIAN 2018: https://www.inegi.org.mx/app/scian/
const SCIAN_CATEGORY_MAP = {
  // Restaurantes y alimentos
  '7221': 'restaurantes', '7222': 'restaurantes', '7223': 'restaurantes',
  '7224': 'restaurantes', '7225': 'restaurantes', '7226': 'restaurantes',
  // Cafeterías
  '7227': 'restaurantes', // Servicios de preparación de alimentos para consumo inmediato (incluye cafés)
  // Farmacias
  '4612': 'salud', '4613': 'salud',
  // Gimnasios y deportes
  '7139': 'deporte', '7131': 'deporte', '7132': 'deporte',
  // Autolavados y talleres
  '8111': 'hogar_autos', '8112': 'hogar_autos', '8119': 'hogar_autos',
  '8121': 'hogar_autos', // Lavado y lubricación de autos
  // Retail / comercio local
  '4611': 'tiendas', '4621': 'tiendas', '4622': 'tiendas', '4623': 'tiendas',
  '4631': 'tiendas', '4632': 'tiendas', '4633': 'tiendas', '4641': 'tiendas',
  '4642': 'tiendas', '4643': 'tiendas', '4644': 'tiendas', '4645': 'tiendas',
  '4646': 'tiendas', '4647': 'tiendas', '4648': 'tiendas', '4649': 'tiendas',
  '4651': 'tiendas', '4652': 'tiendas', '4653': 'tiendas', '4659': 'tiendas',
  '4661': 'tiendas', '4662': 'tiendas', '4663': 'tiendas', '4664': 'tiendas',
  '4665': 'tiendas', '4669': 'tiendas', '4671': 'tiendas', '4679': 'tiendas',
  '4681': 'tiendas', '4682': 'tiendas', '4683': 'tiendas', '4689': 'tiendas',
  '4691': 'tiendas', '4699': 'tiendas',
  // Supermercados
  '4711': 'tiendas', '4719': 'tiendas',
  // Servicios bancarios y financieros
  '5211': 'servicios', '5221': 'servicios', '5222': 'servicios', '5223': 'servicios',
  '5231': 'servicios', '5239': 'servicios', '5241': 'servicios',
  // Hoteles
  '7211': 'hospedaje', '7212': 'hospedaje', '7213': 'hospedaje',
  // Educación
  '6111': 'servicios', '6112': 'servicios', '6113': 'servicios', '6114': 'servicios',
  '6115': 'servicios', '6116': 'servicios', '6117': 'servicios',
  // Salud / clínicas
  '6211': 'salud', '6212': 'salud', '6213': 'salud', '6214': 'salud',
  '6215': 'salud', '6216': 'salud', '6219': 'salud', '6221': 'salud',
  '6231': 'salud', '6232': 'salud', '6239': 'salud', '6241': 'salud',
  '6242': 'salud', '6243': 'salud', '6244': 'salud',
  // Entretenimiento
  '7111': 'entretenimiento', '7112': 'entretenimiento', '7113': 'entretenimiento',
  '7114': 'entretenimiento', '7115': 'entretenimiento', '7121': 'entretenimiento',
  '7131': 'entretenimiento', '7132': 'entretenimiento', '7139': 'entretenimiento',
  '7141': 'entretenimiento', '7151': 'entretenimiento',
};

function mapCategory(codigoAct) {
  if (!codigoAct) return 'servicios';
  // Los primeros 4 dígitos del código SCIAN son la clase
  const prefix4 = String(codigoAct).substring(0, 4);
  const prefix3 = String(codigoAct).substring(0, 3);
  return SCIAN_CATEGORY_MAP[prefix4] || SCIAN_CATEGORY_MAP[prefix3] || 'servicios';
}

function mapSubcategory(nombreAct) {
  if (!nombreAct) return null;
  const n = nombreAct.toLowerCase();
  if (n.includes('restaurant') || n.includes('taquer') || n.includes('comida'))
    return 'restaurant';
  if (n.includes('cafe') || n.includes('café') || n.includes('coffee') || n.includes('panaderi'))
    return 'cafe';
  if (n.includes('farmacia') || n.includes('drogueri'))
    return 'pharmacy';
  if (n.includes('gimnasio') || n.includes('gym') || n.includes('fitness') || n.includes('sport'))
    return 'gym';
  if (n.includes('lavado') || n.includes('autolavado') || n.includes('taller'))
    return 'car_wash';
  if (n.includes('tienda') || n.includes('abarrot') || n.includes('minisuper') || n.includes('minisúper'))
    return 'local_retail';
  if (n.includes('super') || n.includes('mercado'))
    return 'supermarket';
  if (n.includes('banco') || n.includes('bancari'))
    return 'bank';
  if (n.includes('hotel') || n.includes('hostal') || n.includes('motel'))
    return 'hotel';
  if (n.includes('clin') || n.includes('médic') || n.includes('medic') || n.includes('hospital'))
    return 'clinic';
  return null;
}

function slugify(text, id) {
  const base = String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${base}-denue-${id}`;
}

function buildAddress(row) {
  const parts = [
    row.tipo_vial !== 'Ninguno' ? row.tipo_vial : '',
    row.nom_vial !== 'Ninguno' ? row.nom_vial : '',
    row.numero_ext && row.numero_ext !== '0' ? row.numero_ext : '',
    row.letra_ext || '',
    row.nomb_asent || '',
    row.municipio || ''
  ].filter(Boolean).join(' ').trim();
  return parts || null;
}

function parseCSVLine(line) {
  // Simple CSV parser que respeta comillas
  const fields = [];
  let inQuote = false;
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function insertBatch(batch, batchNum, retries = 0) {
  const { error } = await supabase
    .from('international_businesses')
    .upsert(batch, { onConflict: 'source_record_id', ignoreDuplicates: true });

  if (error) {
    if (retries < MAX_RETRIES) {
      await sleep(1000 * (retries + 1));
      return insertBatch(batch, batchNum, retries + 1);
    }
    console.error(`  ❌ Lote ${batchNum} falló tras ${MAX_RETRIES} reintentos:`, error.message);
    return { inserted: 0, error: true };
  }
  return { inserted: batch.length, error: false };
}

async function main() {
  console.log('');
  console.log('🚀 DENUE → Geobooker GeoScore Import');
  console.log('=====================================');
  console.log(`📁 Archivo: ${CSV_FILE}`);
  console.log(`📦 Lote: ${BATCH_SIZE} registros`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}`);
  console.log('');

  // Contar líneas primero
  const totalLines = await new Promise(resolve => {
    let count = 0;
    const rl = createInterface({ input: fs.createReadStream(CSV_FILE, { encoding: 'latin1' }) });
    rl.on('line', () => count++);
    rl.on('close', () => resolve(count));
  });
  console.log(`📊 Total líneas en CSV (incluye header): ${totalLines.toLocaleString()}`);
  console.log('');

  let headers = null;
  let batch = [];
  let batchNum = 0;
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const startTime = Date.now();

  const rl = createInterface({
    input: fs.createReadStream(CSV_FILE, { encoding: 'latin1' }),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!headers) {
      headers = parseCSVLine(line);
      console.log(`📋 Columnas detectadas: ${headers.slice(0, 6).join(', ')} ... (+${headers.length - 6} más)`);
      console.log('');
      continue;
    }

    const fields = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (fields[i] || '').trim(); });

    totalProcessed++;

    // Filtrar registros sin coordenadas válidas
    const lat = parseFloat(row.latitud);
    const lng = parseFloat(row.longitud);
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat < 14 || lat > 33 || lng < -118 || lng > -86) {
      totalSkipped++;
      continue;
    }

    const category    = mapCategory(row.codigo_act);
    const subcategory = mapSubcategory(row.nombre_act);
    const name        = (row.nom_estab || row.raz_social || 'Negocio DENUE').trim().slice(0, 200);
    const address     = buildAddress(row);
    const city        = (row.municipio || row.localidad || '').trim().slice(0, 120);
    const state       = (row.entidad || '').replace(/\?/g, 'e').trim().slice(0, 80);
    const phone       = row.telefono ? row.telefono.replace(/\D/g, '').slice(0, 20) : null;
    const website     = row.www ? (row.www.startsWith('http') ? row.www : `https://${row.www}`) : null;
    const slug        = slugify(name, row.id);

    batch.push({
      owner_id:          null,
      name,
      description:       row.nombre_act ? `${row.nombre_act}. Importado de DENUE INEGI.` : 'Importado de DENUE INEGI.',
      category,
      subcategory,
      address,
      city,
      state_code:        row.cve_ent || null,
      postal_code:       row.cod_postal || null,
      country_code:      'MX',
      latitude:          lat,
      longitude:         lng,
      website,
      website_url:       website,
      phone:             phone ? `+52${phone}` : null,
      slug,
      source_type:       'denue_inegi',
      source_record_id:  `denue-mx-${row.id}`,
      attribution_text:  'DENUE INEGI 2025. Directorio Nacional de Unidades Económicas.',
      status:            'approved',
      business_status:   'active',
      is_visible:        true,  // MX siempre aprobado tras migración 20261002091000
      is_claimed:        false,
      is_verified:       false,
      preferred_language:'es',
      imported_at:       new Date().toISOString(),
      updated_at:        new Date().toISOString()
    });

    // Cuando el lote está lleno, insertar
    if (batch.length >= BATCH_SIZE) {
      batchNum++;
      const result = await insertBatch(batch, batchNum);
      totalInserted += result.inserted;
      if (result.error) totalErrors += batch.length;

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = Math.round(totalInserted / ((Date.now() - startTime) / 1000));
      const pct = ((totalProcessed / (totalLines - 1)) * 100).toFixed(1);

      process.stdout.write(
        `\r  📥 Lote ${batchNum} | ` +
        `${totalInserted.toLocaleString()} insertados | ` +
        `${totalSkipped.toLocaleString()} sin coords | ` +
        `${pct}% | ` +
        `${rate} reg/s | ${elapsed}s`
      );

      batch = [];
      await sleep(DELAY_MS);
    }
  }

  // Insertar último lote parcial
  if (batch.length > 0) {
    batchNum++;
    const result = await insertBatch(batch, batchNum);
    totalInserted += result.inserted;
    if (result.error) totalErrors += batch.length;
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('✅ IMPORT COMPLETADO');
  console.log('════════════════════════════════════════');
  console.log(`📊 Total procesados:  ${totalProcessed.toLocaleString()}`);
  console.log(`✅ Insertados en BD:  ${totalInserted.toLocaleString()}`);
  console.log(`⏭️  Sin coordenadas:   ${totalSkipped.toLocaleString()}`);
  console.log(`❌ Errores de lote:   ${totalErrors.toLocaleString()}`);
  console.log(`⏱️  Tiempo total:      ${totalTime}s`);
  console.log('');
  console.log('🎯 GeoScore ahora puede calcular en cualquier punto de México.');
  console.log('');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
