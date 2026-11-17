import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { authorizeAdminRequest } = require('../../netlify/functions/_admin-request-auth.js');
const { createIdentifier, enforceRateLimit } = require('../../netlify/functions/_rate-limit.js');

// Deliberately fake configuration. Injected clients never perform HTTP calls.
process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-fake-server-key';
process.env.RATE_LIMIT_HASH_SECRET = 'test-only-fake-hmac-key';
const event = {headers:{authorization:'Bearer test-only-token'}};
function adminDependencies({authenticated=true, member=false, lookupError=null}={}) {
  return {createClient:()=>({
    auth:{getUser:async()=>({data:{user:authenticated ? {id:'test-owner'} : null},error:null})},
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:member ? {id:'test-owner'} : null,error:lookupError})})})})
  })};
}

test('admin requests require a verified session and server-side admin membership', async () => {
  assert.equal((await authorizeAdminRequest({headers:{}})).statusCode,401);
  assert.equal((await authorizeAdminRequest(event,adminDependencies({authenticated:false}))).statusCode,401);
  assert.equal((await authorizeAdminRequest(event,adminDependencies())).statusCode,403);
  assert.equal((await authorizeAdminRequest(event,adminDependencies({member:true}))).authorized,true);
});

test('admin directory failures deny access even if a membership row was returned', async () => {
  const result=await authorizeAdminRequest(event,adminDependencies({member:true,lookupError:{message:'test outage'}}));
  assert.equal(result.authorized,false);
  assert.equal(result.statusCode,403);
});

test('rate limiting returns 429 for a used budget and 503 for unavailable enforcement', async () => {
  const invoke=(rpc)=>enforceRateLimit({headers:{'x-nf-client-connection-ip':'192.0.2.1'}},{action:'security-test',supabaseClient:{rpc}});
  assert.equal(await invoke(async()=>({data:true,error:null})),null);
  const exceeded=await invoke(async()=>({data:false,error:null}));
  assert.equal(exceeded.statusCode,429);
  assert.equal(exceeded.headers['Retry-After'],'60');
  assert.equal((await invoke(async()=>({data:null,error:{message:'test unavailable'}}))).statusCode,503);
  assert.equal((await invoke(async()=>{throw new Error('test unavailable');})).statusCode,503);
});

test('rate limit identifiers hide client addresses and prefer Netlify connection IP over forwarded input', () => {
  const first=createIdentifier({headers:{'x-nf-client-connection-ip':'192.0.2.1','x-forwarded-for':'203.0.113.1'}},'test-secret');
  const second=createIdentifier({headers:{'x-nf-client-connection-ip':'192.0.2.1','x-forwarded-for':'203.0.113.2'}},'test-secret');
  assert.match(first,/^[a-f0-9]{64}$/);
  assert.equal(first,second);
  assert.notEqual(first,createIdentifier({headers:{'x-nf-client-connection-ip':'192.0.2.1'}},'different-test-secret'));
});
