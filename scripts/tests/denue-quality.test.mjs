import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prepareDenueRecord,normalizeMexicanPhone,normalizePublicWebsite,readDenueRows,parseCsvRecord} from '../open-data/denue-quality.mjs';
const fixture={id:'123',nom_estab:'Café Central',latitud:'19.43',longitud:'-99.13',municipio:'Cuauhtémoc',codigo_act:'722515',telefono:'55 1234 5678',www:'example.com',clee:'test-clee'};

test('DENUE identity remains stable across editions and imported records are unclaimed and hidden',()=>{
 const first=prepareDenueRecord(fixture);
 const next=prepareDenueRecord({...fixture,nom_estab:'Nuevo nombre'},{release:'2026-05'});
 assert.equal(first.record.source_record_id,next.record.source_record_id);
 assert.equal(first.provenance.clee,'test-clee');
 assert.equal(first.provenance.edition_status,'unknown');
 assert.equal(next.provenance.edition_status,'declared_requires_verification');
 assert.equal(next.record.is_visible,false);
 assert.equal(next.record.is_verified,false);
 assert.equal(next.record.owner_id,null);
});

test('missing identifiers, names and malformed coordinates are rejected',()=>{
 for(const [change,reason] of [[{id:''},'invalid_source_id'],[{nom_estab:''},'missing_name'],[{latitud:'19.43junk'},'invalid_coordinates'],[{latitud:'NaN'},'invalid_coordinates'],[{longitud:'-2'},'invalid_coordinates'],[{municipio:''},'missing_locality']]) assert.equal(prepareDenueRecord({...fixture,...change}).rejected,reason);
});

test('Mexican contact formats do not double-prefix the country code or accept malformed links',()=>{
 for(const value of ['5512345678','+52 55 1234 5678','525512345678','5215512345678','00525512345678']) assert.equal(normalizeMexicanPhone(value),'+525512345678');
 for(const value of ['1234','+1 212 555 1234','5512345678 ext 3']) assert.equal(normalizeMexicanPhone(value),null);
 assert.equal(normalizePublicWebsite('example.com'),'https://example.com/');
 for(const value of ['javascript:alert(1)','mailto:test@example.com','https://user:pass@example.com','https://[bad']) assert.equal(normalizePublicWebsite(value),null);
 const result=prepareDenueRecord({...fixture,telefono:'bad',www:'javascript:bad'});
 assert.equal(result.record.phone,null);assert.equal(result.record.website,null);
 assert.deepEqual(result.warnings,['invalid_website','invalid_phone']);
});

test('CSV parsing preserves escaped quotes and knows when a record is incomplete',()=>{
 assert.deepEqual(parseCsvRecord('123,"Café, ""Central"""'),['123','Café, "Central"']);
 assert.equal(parseCsvRecord('123,"unfinished'),null);
 assert.throws(()=>parseCsvRecord('123,"closed"bad'));
});

test('credential-free CLI previews deduplicate source IDs and retain provenance without database writes',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'geobooker-denue-quality-'));
 try {
  const input=path.join(directory,'input.csv'),report=path.join(directory,'report.json'),sources=path.join(directory,'sources.jsonl');
  const keys=Object.keys(fixture);
  const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  const rows=[fixture,{...fixture}, {...fixture,id:'124',nom_estab:''},{...fixture,id:'125',latitud:'wrong'},{...fixture,id:'126',nom_estab:'Café,\n"Centro"',www:'javascript:bad'}];
  writeFileSync(input,'\uFEFF'+keys.join(',')+'\n'+rows.map(row=>keys.map(key=>quote(row[key])).join(',')).join('\n'));
  const parsed=[];for await(const row of readDenueRows(input,'utf8')) parsed.push(row);
  assert.equal(parsed.length,5);assert.equal(parsed[4].nom_estab,'Café,\n"Centro"');
  const env={...process.env};delete env.SUPABASE_SERVICE_ROLE_KEY;delete env.VITE_SUPABASE_URL;
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../import-denue-geoscore.mjs',import.meta.url)),'--dry-run',`--file=${input}`,'--encoding=utf8',`--report=${report}`,`--provenance-output=${sources}`],{env,encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
  const quality=JSON.parse(readFileSync(report,'utf8'));
  assert.equal(quality.recordsPrepared,2);assert.equal(quality.databaseRowsWritten,0);
  assert.equal(quality.rejectedByReason.duplicate_source_id,1);
  assert.equal(quality.warnings.invalid_website,1);
  assert.match(quality.sourceFileSha256,/^[a-f0-9]{64}$/);
  assert.equal(readFileSync(sources,'utf8').trim().split('\n').length,2);
 } finally {assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));rmSync(directory,{recursive:true,force:true});}
});
