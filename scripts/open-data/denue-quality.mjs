import fs from 'node:fs';
import { createInterface } from 'node:readline';
import { classifyDenueActivity } from './denue-categories.mjs';

export const normalizeText = value => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function normalizePublicWebsite(value) {
  const input = String(value ?? '').trim();
  if (!input || /\s/.test(input)) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(input) && !/^https?:\/\//i.test(input)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) return null;
    return url.href;
  } catch { return null; }
}

export function normalizeMexicanPhone(value) {
  const input = String(value ?? '').trim();
  if (!input || !/^[+\d\s().-]+$/.test(input)) return null;
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('0052')) digits = digits.slice(2);
  if (/^521\d{10}$/.test(digits)) digits = `52${digits.slice(3)}`;
  if (/^\d{10}$/.test(digits)) digits = `52${digits}`;
  return /^52\d{10}$/.test(digits) ? `+${digits}` : null;
}

// Null means an RFC 4180 quoted record continues on the next physical line.
export function parseCsvRecord(line) {
  const fields = []; let field = ''; let quoted = false; let closed = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else field += ch;
    } else if (ch === ',') { fields.push(field); field = ''; closed = false; }
    else if (ch === '"' && !field && !closed) quoted = true;
    else if ((closed && !/\s/.test(ch)) || ch === '"') throw new Error('Malformed CSV quoting');
    else if (!closed) field += ch;
  }
  if (quoted) return null;
  fields.push(field);
  return fields;
}

export async function* readDenueRows(file, encoding = 'latin1') {
  const input = fs.createReadStream(file,{encoding});
  const lines = createInterface({input,crlfDelay:Infinity});
  let headers; let pending = ''; let physicalLine = 0;
  try {
    for await (let line of lines) {
      physicalLine++;
      if (physicalLine === 1) line = line.replace(/^\uFEFF|^ï»¿/, '');
      if (!pending && !line.trim()) continue;
      pending += (pending ? '\n' : '') + line;
      if (pending.length > 1024 * 1024) throw new Error(`CSV record exceeds 1 MiB near line ${physicalLine}`);
      const fields = parseCsvRecord(pending);
      if (!fields) continue;
      pending = '';
      if (!headers) {
        headers = fields.map(value => value.trim());
        if (new Set(headers).size !== headers.length || !['id','nom_estab','latitud','longitud'].every(key => headers.includes(key))) throw new Error('DENUE CSV headers are missing or duplicated');
        continue;
      }
      if (fields.length !== headers.length) throw new Error(`CSV column count mismatch near line ${physicalLine}`);
      yield Object.fromEntries(headers.map((key,i) => [key,fields[i].trim()]));
    }
    if (pending || !headers) throw new Error('DENUE CSV is empty or has an unfinished quoted record');
  } finally { lines.close(); input.destroy(); }
}

export function prepareDenueRecord(row, {release='', publish=false, now=new Date().toISOString()}={}) {
  const id = String(row.id ?? '').trim();
  const name = String(row.nom_estab || row.raz_social || '').trim();
  const latitude = Number(String(row.latitud ?? '').trim());
  const longitude = Number(String(row.longitud ?? '').trim());
  if (!/^\d{1,20}$/.test(id)) return {rejected:'invalid_source_id'};
  if (!name) return {rejected:'missing_name'};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 14 || latitude > 33 || longitude < -118 || longitude > -86) return {rejected:'invalid_coordinates'};
  const city = String(row.municipio || row.localidad || '').trim();
  if (!city) return {rejected:'missing_locality'};
  const website = normalizePublicWebsite(row.www);
  const phone = normalizeMexicanPhone(row.telefono);
  const warnings = [];
  if (row.www && !website) warnings.push('invalid_website');
  if (row.telefono && !phone) warnings.push('invalid_phone');
  if (!/^\d{6}$/.test(String(row.codigo_act || ''))) warnings.push('unknown_activity_code');
  const address = [row.tipo_vial,row.nom_vial,row.numero_ext,row.letra_ext,row.nomb_asent,city]
    .filter(value => value && !['ninguno','0'].includes(normalizeText(value))).join(' ').trim();
  const slug = normalizeText(name).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50);
  const sourceRecordId = `denue-mx-${id}`; // Preserve existing identity across editions.
  const record = {
    owner_id:null, name:name.slice(0,200), description:row.nombre_act ? `${row.nombre_act}. Importado de DENUE INEGI.` : 'Importado de DENUE INEGI.',
    category:classifyDenueActivity(row.codigo_act), subcategory:null, address:address || null,
    city:city.slice(0,120),state_code:row.cve_ent || null,postal_code:row.cod_postal || null,country_code:'MX',
    latitude,longitude,website,website_url:website,phone,slug:`${slug}-denue-${id}`,
    source_type:'denue_inegi',source_record_id:sourceRecordId,
    attribution_text:`INEGI. Directorio Estadístico Nacional de Unidades Económicas (DENUE). Edición: ${release || 'sin comprobar; solo revisión'}.`,
    status:'approved',business_status:'active',is_visible:Boolean(publish && release),is_claimed:false,is_verified:false,
    preferred_language:'es',imported_at:now,updated_at:now
  };
  return {
    record,warnings,
    provenance:{source:'inegi_denue',source_record_id:sourceRecordId,clee:row.clee || null,activity_code:row.codigo_act || null,release:release || null,edition_status:release ? 'declared_requires_verification' : 'unknown'},
    duplicateKey:[normalizeText(name),normalizeText(address),latitude.toFixed(5),longitude.toFixed(5)].join('|')
  };
}
