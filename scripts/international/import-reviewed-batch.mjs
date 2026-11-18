import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import dotenv from 'dotenv';

const directory=path.dirname(fileURLToPath(import.meta.url));
const allowedCategories=new Set(['belleza','restaurantes','salud','servicios','tiendas','automotriz','hoteles']);

function safeWebsite(value) {
  if(!value) return true;
  try {
    const url=new URL(value);
    return ['http:','https:'].includes(url.protocol)&&Boolean(url.hostname)&&!url.username&&!url.password;
  } catch { return false; }
}

export function validateRows(rows,market,area,release) {
  if (!Array.isArray(rows) || rows.length!==1000) throw new Error('Expected exactly 1000 records');
  const ids=new Set(),slugs=new Set(),categories=new Map();
  const [west,south,east,north]=area.bbox;
  for(const row of rows){
    if(row.owner_id!==null || row.is_visible!==false || row.is_claimed!==false || row.is_verified!==false) throw new Error('Owner and publication flags must remain untouched');
    if(row.source_type!=='seed_overture' || row.status!=='approved' || row.business_status!=='active') throw new Error('Invalid import source or state');
    if(row.country_code!==market.countryCode || row.city!==market.city) throw new Error('Wrong city or country');
    if(!Number.isFinite(row.latitude)||!Number.isFinite(row.longitude)||row.latitude<south||row.latitude>north||row.longitude<west||row.longitude>east) throw new Error('Coordinate outside the reviewed bbox');
    if(!Number.isFinite(row.confidence)||row.confidence<0.75||row.confidence>1||row.source_dataset!==`overture_places/${release}`) throw new Error('Invalid confidence or source edition');
    if(!row.name?.trim()||!row.address?.trim()||!row.source_record_id?.trim()||!row.slug?.trim()) throw new Error('Missing business identity');
    if(!allowedCategories.has(row.category)) throw new Error('Unsupported business category');
    if(!safeWebsite(row.website)||!safeWebsite(row.website_url)) throw new Error('Unsafe business website');
    if(row.phone&&!/^[+\d\s().-]+$/.test(row.phone)) throw new Error('Invalid business phone');
    if(ids.has(row.source_record_id)||slugs.has(row.slug)) throw new Error('Repeated source identity or slug');
    ids.add(row.source_record_id);slugs.add(row.slug);
    categories.set(row.category,(categories.get(row.category)||0)+1);
  }
  if(categories.size<4||Math.max(...categories.values())>400) throw new Error('Sample needs at least four balanced business categories');
  return {records:rows.length,categories:Object.fromEntries(categories)};
}

export async function importRows(client,rows,{batchSize=200}={}) {
  let inserted=0;
  for(let i=0;i<rows.length;i+=batchSize){
    const now=new Date().toISOString();
    const batch=rows.slice(i,i+batchSize).map(row=>({...row,imported_at:now,updated_at:now,is_visible:false}));
    const {data,error}=await client.from('international_businesses').upsert(batch,{onConflict:'source_record_id',ignoreDuplicates:true}).select('id');
    if(error) throw new Error(`Import failed (${error.code || 'unknown'}); rows remain hidden`);
    inserted+=(data||[]).length;
  }
  return {inserted,existingSkipped:rows.length-inserted,visibility:'hidden'};
}

async function main(){
  const args=process.argv.slice(2);
  const option=name=>args.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3);
  const manifestFile=option('manifest');
  if(!manifestFile) throw new Error('Provide --manifest=FILE.review.json');
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  if(manifest.recordCount!==1000||manifest.audit?.automatedAuditPassed!==true) throw new Error('A successful content review is required');
  const raw=fs.readFileSync(manifest.recordsFile);
  if(createHash('sha256').update(raw).digest('hex')!==manifest.recordsChecksumSha256) throw new Error('Import checksum mismatch');
  const rollout=JSON.parse(fs.readFileSync(path.join(directory,'expansion-markets.json'),'utf8'));
  const areas=JSON.parse(fs.readFileSync(path.join(directory,'pilot-areas.json'),'utf8'));
  const market=rollout.markets.find(m=>m.id===manifest.marketId);
  const area=areas.areas.find(a=>a.id===manifest.marketId);
  if(!market?.extractionEnabled||!area) throw new Error('Market is not enabled for extraction');
  const rows=JSON.parse(raw);
  const quality=validateRows(rows,market,area,manifest.sourceRelease);
  if(!args.includes('--apply')){console.log(JSON.stringify({marketId:market.id,...quality,mode:'preview',databaseWrites:0}));return;}
  const envFile=option('env-file');
  const env=envFile ? dotenv.parse(fs.readFileSync(envFile)) : process.env;
  const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL;
  if(url!=='https://dllckokqkgcraxyxsfqc.supabase.co'||!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Private Geobooker server configuration is required');
  const client=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  console.log(JSON.stringify({marketId:market.id,...await importRows(client,rows)}));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
