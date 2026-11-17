import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

test('auth funnel fits the live user_sessions contract without a failed metadata insert or lost method', async () => {
  // Column names were checked through information_schema on the Geobooker DB.
  // The database is not modified by this test.
  const columns = ['id','user_id','session_type','ip_address','user_agent','country','city','referral_source','created_at','traffic_source','traffic_medium','traffic_campaign','language','attribution_snapshot','platform','app_version','os','device_type'];
  const insertions=[];
  globalThis.__geobookerAuthTestInsert = async (table,payload) => {
    insertions.push({table,payload});
    return Object.keys(payload).some(key=>!columns.includes(key))
      ? {error:{code:'PGRST204',message:'Could not find metadata column in schema cache'}} : {error:null};
  };
  const mocks={
    supabase:'export const supabase={from:table=>({insert:payload=>globalThis.__geobookerAuthTestInsert(table,payload)})};',
    logger:'export const logger={dev:()=>{},info:()=>{},warn:()=>{},success:()=>{}};',
    attribution:'export const appendAttributionToEvent=x=>x;export const getAttributionSummary=()=>"direct";export const getCurrentAttribution=()=>({utm_source:"test"});export const getFirstTouchAttribution=()=>({utm_source:"first"});',
    platform:'export const getPlatform=()=>"web";',
    pixel:'export const metaTrackSearch=()=>{};',
  };
  const keys=new Map([['lib/supabase','supabase'],['utils/logger','logger'],['services/attributionService','attribution'],['./attributionService','attribution'],['utils/platformDetection','platform'],['lib/metaPixel','pixel']]);
  const result=await build({stdin:{contents:"export {trackAuthFunnelEvent} from './src/services/analyticsService.js';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',treeShaking:true,define:{'import.meta.env':'{}'},plugins:[{name:'funnel-schema-mocks',setup(builder){
    builder.onResolve({filter:/.*/},args=>{const name=args.path.replace(/\\/g,'/').replace(/\.js$/,'');for(const[suffix,key]of keys)if(name.endsWith(suffix))return{path:key,namespace:'funnel-test'};});
    builder.onLoad({filter:/.*/,namespace:'funnel-test'},args=>({contents:mocks[args.path],loader:'js'}));
  }}]});
  const saved={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage};
  const storage=()=>{const map=new Map();return{getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};};
  globalThis.window={location:{hostname:'geobooker.com.mx',pathname:'/login'},gtag:()=>{}};
  globalThis.document={documentElement:{lang:'es-MX'}};
  globalThis.localStorage=storage();globalThis.sessionStorage=storage();
  try {
    const {trackAuthFunnelEvent}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
    await trackAuthFunnelEvent('login_form_view',{funnel:'login',method:'email',dedupeKey:'schema-test'});
    await trackAuthFunnelEvent('login_form_view',{funnel:'login',method:'email',dedupeKey:'schema-test'});
    await trackAuthFunnelEvent('oauth_start',{funnel:'login',method:'google',metadata:{source:'required_login'}});
    assert.equal(insertions.length,2,'One insert per real event, with no missing-column fallback or duplicate view');
    for(const row of insertions){assert.equal(row.table,'user_sessions');assert.ok(Object.keys(row.payload).every(key=>columns.includes(key)));}
    assert.equal(insertions[1].payload.attribution_snapshot.auth_funnel.method,'google');
    assert.equal(insertions[1].payload.attribution_snapshot.auth_funnel.source,'required_login');
    assert.equal(insertions[1].payload.session_type,'funnel_oauth_start');
  } finally {
    for(const[key,value]of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
    delete globalThis.__geobookerAuthTestInsert;
  }
});
