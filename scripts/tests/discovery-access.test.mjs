import test from 'node:test';
import assert from 'node:assert/strict';
import { requiresDiscoveryAccount, isDiscoveryPath, safeAuthDestination, rememberAuthDestination, consumeAuthDestination, getAuthDestination } from '../../src/utils/discoveryAccess.js';

test('required exploration login applies to Mexico web and native Android, not iOS or global web', () => {
  for (const hostname of ['geobooker.com.mx', 'www.geobooker.com.mx']) assert.equal(requiresDiscoveryAccount({hostname}), true);
  for (const hostname of ['www.geobooker.com', 'geobooker.com', 'geobooker.com.mx.evil.invalid', 'localhost']) assert.equal(requiresDiscoveryAccount({hostname}), false);
  assert.equal(requiresDiscoveryAccount({isNative:true,platform:'android',hostname:'localhost'}), true);
  assert.equal(requiresDiscoveryAccount({isNative:true,platform:'ios',hostname:'geobooker.com.mx'}), false);
});

test('map, profiles and tools are gated while auth, legal, support and marketing remain reachable', () => {
  for (const path of ['/', '/c/restaurantes','/ciudad/cdmx','/categories','/business/example','/place/123','/geoscore','/emprende','/biblioteca/guia']) assert.equal(isDiscoveryPath(path),true,path);
  for (const path of ['/login','/signup','/auth/callback','/reset-password','/privacy','/terms','/support','/about','/enterprise','/advertise']) assert.equal(isDiscoveryPath(path),false,path);
});

test('return destinations reject external redirects and loops back into authentication', () => {
  for (const path of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/%2f%2fevil.invalid','/login','/login?next=/','/auth/callback?code=secret','/auth%2fcallback','/reset-password','/signup','/bad\u0000path']) assert.equal(safeAuthDestination(path),'/dashboard');
  assert.equal(safeAuthDestination('/business/example?source=map#contact'),'/business/example?source=map#contact');
  assert.equal(safeAuthDestination('/'),'/');
});

test('OAuth remembers only a safe short-lived destination and consumes it once', () => {
  const values=new Map();
  globalThis.sessionStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  rememberAuthDestination('/business/example');
  assert.equal(getAuthDestination(),'/business/example');
  assert.equal(consumeAuthDestination(),'/business/example');
  assert.equal(getAuthDestination(),'/dashboard');
  rememberAuthDestination('//evil.invalid');
  assert.equal(consumeAuthDestination(),'/dashboard');
  rememberAuthDestination('/geoscore');
  values.set('geobooker_auth_destination',JSON.stringify({path:'/geoscore',expires:1}));
  assert.equal(getAuthDestination(),'/dashboard');
  delete globalThis.sessionStorage;
  assert.equal(getAuthDestination(),'/dashboard');
});
