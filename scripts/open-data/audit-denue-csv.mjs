import fs from 'node:fs';
import { createInterface } from 'node:readline';
import { classifyDenueActivity } from './denue-categories.mjs';

const file = process.argv[2] || 'denue_datos.csv';
const totals = { file, sourceEdition: 'not_verified_from_local_file', records: 0, validCoordinates: 0, states: {}, cities: {}, categories: {} };
function parse(line) {
    const values = []; let field = ''; let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (quoted && line[i + 1] === '"') { field += '"'; i++; }
            else quoted = !quoted;
        } else if (char === ',' && !quoted) { values.push(field); field = ''; }
        else field += char;
    }
    values.push(field); return values;
}
let headers;
for await (const line of createInterface({ input: fs.createReadStream(file, { encoding: 'latin1' }), crlfDelay: Infinity })) {
    if (!headers) { headers = parse(line).map(value => value.replace(/^\uFEFF/, '')); continue; }
    const fields = parse(line);
    const row = Object.fromEntries(headers.map((key, i) => [key, fields[i] || '']));
    totals.records++;
    const lat = Number(row.latitud), lng = Number(row.longitud);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 14 && lat <= 33 && lng >= -118 && lng <= -86) totals.validCoordinates++;
    for (const [key, value] of [['states', row.entidad], ['cities', row.municipio], ['categories', classifyDenueActivity(row.codigo_act)]]) {
        totals[key][value] = (totals[key][value] || 0) + 1;
    }
}
totals.cities = Object.fromEntries(Object.entries(totals.cities).sort((a, b) => b[1] - a[1]).slice(0, 20));
console.log(JSON.stringify(totals, null, 2));
