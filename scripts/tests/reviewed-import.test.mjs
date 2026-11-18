import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRows,importRows} from '../international/import-reviewed-batch.mjs';
const market={countryCode:'US',city:'Houston'};
const area={bbox:[-95.85,29.5,-95.05,30.15]};
function fixtures(){return Array.from({length:1000},(_,index)=>({owner_id:null,is_visible:false,is_claimed:false,is_verified:false,source_type:'seed_overture',status:'approved',business_status:'active',country_code:'US',city:'Houston',latitude:29.7,longitude:-95.4,confidence:0.9,source_dataset:'overture_places/2026-10-21.0',name:`Fixture ${index}`,address:'Fixture street 1',source_record_id:`fixture-${index}`,slug:`fixture-${index}`,category:['belleza','restaurantes','salud','servicios','tiendas'][index%5]}));}

test('reviewed samples require 1000 diverse, bounded, unclaimed source records',()=>{
 assert.equal(validateRows(fixtures(),market,area,'2026-10-21.0').records,1000);
 assert.throws(()=>validateRows(fixtures().slice(1),market,area,'2026-10-21.0'));
 for(const change of [{owner_id:'someone'},{is_visible:true},{is_verified:true},{city:'Wrong'},{latitude:0},{confidence:NaN},{source_dataset:'unreviewed'},{category:'invalid'},{website:'javascript:alert(1)'},{website_url:'https://user:pass@example.com'},{phone:'not a phone'}]){
  const rows=fixtures();Object.assign(rows[0],change);
  assert.throws(()=>validateRows(rows,market,area,'2026-10-21.0'));
 }
 const mono=fixtures().map(row=>({...row,category:'tiendas'}));
 assert.throws(()=>validateRows(mono,market,area,'2026-10-21.0'));
});

test('repeated IDs are rejected before imports begin',()=>{
 const rows=fixtures();rows[1].source_record_id=rows[0].source_record_id;
 assert.throws(()=>validateRows(rows,market,area,'2026-10-21.0'),/Repeated/);
});

test('replaying a sample never replaces an owner-managed record or publishes new rows',async()=>{
 const existing={...fixtures()[0],owner_id:'real-owner',is_claimed:true,name:'Owner edited name',updated_at:'preserve-this'};
 const stored=new Map([[existing.source_record_id,existing]]);
 const client={from:()=>({upsert:(batch,options)=>{
  assert.equal(options.ignoreDuplicates,true);assert.equal(options.onConflict,'source_record_id');
  return {select:async()=>{const added=[];for(const row of batch){if(!stored.has(row.source_record_id)){stored.set(row.source_record_id,row);added.push({id:row.source_record_id});}}return {data:added,error:null};}};
 }})};
 const first=await importRows(client,fixtures());
 assert.equal(first.inserted,999);assert.equal(first.existingSkipped,1);
 assert.deepEqual(stored.get(existing.source_record_id),existing);
 assert.ok([...stored.values()].every(row=>row.is_visible===false));
 const retry=await importRows(client,fixtures());
 assert.equal(retry.inserted,0);assert.deepEqual(stored.get(existing.source_record_id),existing);
});

test('a failing batch aborts without changing its publication state',async()=>{
 const client={from:()=>({upsert:batch=>{assert.ok(batch.every(row=>!row.is_visible));return {select:async()=>({data:null,error:{code:'TEST_FAILURE'}})};}})};
 await assert.rejects(importRows(client,fixtures()),/rows remain hidden/);
});
