#!/usr/bin/env node
/**
 * DENUE → Geobooker GeoScore Import
 * ====================================
 * Lee denue_datos.csv (INEGI) y lo importa en lotes a
 * public.international_businesses en Supabase.
 *
 * Uso:
 *   node scripts/import-denue-geoscore.mjs --dry-run --city=Guadalajara --limit=100
 *   node scripts/import-denue-geoscore.mjs --apply --source-release=EDICION_COMPROBADA --city=Guadalajara --limit=1000
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
import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { classifyDenueActivity } from './open-data/denue-categories.mjs';
import { prepareDenueRecord, readDenueRows } from './open-data/denue-quality.mjs';

// ── Config ─────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.join(ROOT, '.env.local');
dotenv.config({ path: envPath });
const envVars = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = envVars['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE   = 300;   // registros por lote
const MAX_RETRIES  = 3;     // reintentos por lote fallido
const DELAY_MS     = 400;   // pausa entre lotes (ms)

const args = process.argv.slice(2);
for (const flag of ['apply','dry-run','publish']) {
  if (args.some(arg => arg.startsWith(`--${flag}=`))) throw new Error(`Usa --${flag} sin asignar un valor; no se admiten booleanos como texto.`);
}
const getArg = (name, fallback = null) => {
  const found = args.find((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (!found) return fallback;
  if (found === `--${name}`) return true;
  return found.split('=').slice(1).join('=');
};
const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const LIMIT = Number(getArg('limit', 5000));
const STATE_FILTER = normalizeText(getArg('state', ''));
const CITY_FILTER = normalizeText(getArg('city', ''));
const DRY_RUN = Boolean(getArg('dry-run', false)) || !getArg('apply', false);
const SOURCE_RELEASE = String(getArg('source-release', '')).trim();
const PUBLISH = Boolean(getArg('publish', false));
const CSV_FILE = path.resolve(String(getArg('file', path.join(ROOT,'denue_datos.csv'))));
const ENCODING = String(getArg('encoding','latin1'));
const REPORT_FILE = getArg('report') ? path.resolve(String(getArg('report'))) : null;
const PROVENANCE_FILE = getArg('provenance-output') ? path.resolve(String(getArg('provenance-output'))) : null;
if (!['latin1','utf8'].includes(ENCODING)) throw new Error('Usa --encoding=latin1 o --encoding=utf8.');
if ([REPORT_FILE,PROVENANCE_FILE].includes(CSV_FILE) || (REPORT_FILE && REPORT_FILE === PROVENANCE_FILE)) throw new Error('Las salidas deben ser distintas entre sí y del CSV original.');

if (!Number.isInteger(LIMIT) || LIMIT < 1 || LIMIT > 25000) {
  console.error('El límite debe ser un entero entre 1 y 25000 por lote.');
  process.exit(1);
}
if (!DRY_RUN && !SOURCE_RELEASE) {
  console.error('Para aplicar un lote indica --source-release con la edición comprobada del archivo.');
  process.exit(1);
}

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('❌ Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

if (!fs.existsSync(CSV_FILE)) {
  console.error(`❌ No se encontró: ${CSV_FILE}`);
  process.exit(1);
}

if (!DRY_RUN && SUPABASE_URL !== 'https://dllckokqkgcraxyxsfqc.supabase.co') throw new Error('Este importador solo admite el proyecto Geobooker.');
const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── Mapeo SCIAN → GeoScore category ────────────────────────────────────────
// SCIAN 2018: https://www.inegi.org.mx/app/scian/

function mapCategory(codigoAct) {
  return classifyDenueActivity(codigoAct);
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
  if (n.includes('autolavado') || n.includes('lavado de autom'))
    return 'car_wash';
  if (n.includes('reparación') && (n.includes('autom') || n.includes('camion')))
    return 'auto_repair';
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
  if (DRY_RUN) {
    return { inserted: batch.length, error: false };
  }

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
  console.log(`Modo: ${DRY_RUN ? 'revisión sin escritura' : 'aplicar'}; edición: ${SOURCE_RELEASE || 'sin comprobar'}`);
  console.log(`🔗 Supabase: ${DRY_RUN ? 'sin conexión; no se requieren credenciales' : SUPABASE_URL}`);
  console.log('');

  // Contar líneas primero
  const totalLines = await new Promise(resolve => {
    let count = 0;
    const rl = createInterface({ input: fs.createReadStream(CSV_FILE, { encoding: ENCODING }) });
    rl.on('line', () => count++);
    rl.on('close', () => resolve(count));
  });
  console.log(`📊 Total líneas en CSV (incluye header): ${totalLines.toLocaleString()}`);
  console.log('');

  let batch = [];
  let batchNum = 0;
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const seenIds = new Set();
  const seenLocations = new Set();
  const quality = {source:'inegi_denue',sourceEdition:SOURCE_RELEASE || null,editionStatus:'not_independently_verified',mode:DRY_RUN ? 'preview' : 'apply',rejectedByReason:{},warnings:{},potentialLocationDuplicates:0,categories:{},withPhone:0,withWebsite:0};
  if (PROVENANCE_FILE) { fs.mkdirSync(path.dirname(PROVENANCE_FILE),{recursive:true}); fs.writeFileSync(PROVENANCE_FILE,''); }
  const startTime = Date.now();

  for await (const row of readDenueRows(CSV_FILE,ENCODING)) {
    totalProcessed++;

    // Filtrar registros sin coordenadas válidas
    const prepared = prepareDenueRecord(row,{release:SOURCE_RELEASE,publish:!DRY_RUN && PUBLISH});
    if (prepared.rejected) {
      quality.rejectedByReason[prepared.rejected] = (quality.rejectedByReason[prepared.rejected] || 0) + 1;
      totalSkipped++;
      continue;
    }

    const category    = mapCategory(row.codigo_act);
    const subcategory = mapSubcategory(row.nombre_act);
    const state       = (row.entidad || '').replace(/\?/g, 'e').trim().slice(0, 80);

    if (STATE_FILTER && normalizeText(state) !== STATE_FILTER) {
      totalSkipped++;
      continue;
    }
    if (CITY_FILTER && ![row.municipio, row.localidad].some((value) => normalizeText(value).includes(CITY_FILTER))) {
      totalSkipped++;
      continue;
    }

    if (seenIds.has(prepared.record.source_record_id)) {
      quality.rejectedByReason.duplicate_source_id = (quality.rejectedByReason.duplicate_source_id || 0) + 1;
      totalSkipped++; continue;
    }
    seenIds.add(prepared.record.source_record_id);
    if (seenLocations.has(prepared.duplicateKey)) quality.potentialLocationDuplicates++;
    seenLocations.add(prepared.duplicateKey);
    for (const warning of prepared.warnings) quality.warnings[warning] = (quality.warnings[warning] || 0) + 1;
    quality.categories[category] = (quality.categories[category] || 0) + 1;
    if (prepared.record.phone) quality.withPhone++;
    if (prepared.record.website) quality.withWebsite++;
    batch.push({...prepared.record,subcategory});
    if (PROVENANCE_FILE) fs.appendFileSync(PROVENANCE_FILE,JSON.stringify(prepared.provenance)+'\n');

    if (LIMIT > 0 && totalInserted + batch.length >= LIMIT) {
      const remaining = LIMIT - totalInserted;
      const finalBatch = batch.slice(0, remaining);
      if (finalBatch.length > 0) {
        batchNum++;
        const result = await insertBatch(finalBatch, batchNum);
        totalInserted += result.inserted;
        if (result.error) totalErrors += finalBatch.length;
      }
      batch = [];
      break;
    }

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
        `${totalInserted.toLocaleString()} ${DRY_RUN ? 'preparados' : 'procesados'} | ` +
        `${totalSkipped.toLocaleString()} omitidos | ` +
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
  console.log(`${DRY_RUN ? 'Registros preparados (sin escritura)' : 'Registros procesados (incluye duplicados omitidos)'}: ${totalInserted.toLocaleString()}`);
  console.log(`⏭️  Omitidos por coordenadas o filtros: ${totalSkipped.toLocaleString()}`);
  console.log(`❌ Errores de lote:   ${totalErrors.toLocaleString()}`);
  console.log(`⏱️  Tiempo total:      ${totalTime}s`);
  console.log('');
  console.log(DRY_RUN ? 'Revisión completada sin modificar la base de datos.' : 'Lote procesado; comprueba recuentos reales y calidad antes de publicarlo.');
  console.log('');
  quality.recordsRead = totalProcessed;
  quality.recordsPrepared = totalInserted;
  quality.batchErrors = totalErrors;
  quality.rejectedOrFiltered = totalSkipped;
  quality.databaseRowsWritten = DRY_RUN ? 0 : null;
  quality.requiresReviewBeforePublication = true;
  console.log('QUALITY_JSON=' + JSON.stringify(quality));
  if (REPORT_FILE) {
    const hash = createHash('sha256');
    for await (const chunk of fs.createReadStream(CSV_FILE)) hash.update(chunk);
    quality.sourceFileSha256 = hash.digest('hex');
    fs.mkdirSync(path.dirname(REPORT_FILE),{recursive:true});
    fs.writeFileSync(REPORT_FILE,JSON.stringify(quality,null,2)+'\n');
  }
  if (totalErrors) process.exitCode = 1;
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
