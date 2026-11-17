// Local integration check: real React/AuthProvider/router, simulated Supabase
// responses. No credentials, external login, or production data are involved.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const baseline = process.argv.includes('--baseline');
const baselineRef = process.argv.find(value => value.startsWith('--baseline-ref='))?.split('=').slice(1).join('=') || '17cb134';
const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
if (!chrome) throw new Error('This local integration runner requires Chrome or Edge on Windows.');
const temporary = mkdtempSync(path.join(tmpdir(), 'geobooker-auth-check-'));
const oldContext = baseline ? execFileSync('git', ['show', `${baselineRef}:src/contexts/AuthContext.jsx`], { encoding: 'utf8', windowsHide: true }) : null;
const mocks = {
  supabase: `export const supabase = {
    auth: { onAuthStateChange: cb => { window.__listeners.add(cb); return {data:{subscription:{unsubscribe:()=>window.__listeners.delete(cb)}}}; }, getSession: () => window.__sessionRead,
      signInWithPassword: async () => ({data:{user:window.__newSession.user,session:window.__newSession},error:null}) },
    from: () => ({ upsert: async () => ({error:null}) })
  };`,
  capacitor: `export const Capacitor={isNativePlatform:()=>window.__platform!=='web',getPlatform:()=>window.__platform};`,
  tracking: `export const clarityIdentifyUser=()=>{};`,
  conversions: `export const observeMetaConversions=async()=>{}; export const rememberMetaSignup=()=>{};`,
  analytics: `export const getAuthErrorCode=()=> 'test'; export const trackAuthFunnelEvent=()=>{}; export const trackUserLogin=()=>{};`,
  oauth: `export const beginOAuthSignIn=async()=>{};`,
  platform: `export const getPlatform=()=>window.__platform;`,
  premium: `export const activatePremiumPromotion=async()=>{};`,
  promotions: `export const isPremiumPromoActive=()=>false; export const getPremiumPromoDeadlineLabel=()=>'';`,
  intent: `export const clearPremiumIntent=()=>{}; export const hasPremiumIntent=()=>false; export const getPremiumIntentPreference=()=>null; export const rememberPremiumIntent=()=>{};`,
};
const aliases = new Map([
  ['lib/supabase', 'supabase'], ['@capacitor/core', 'capacitor'],
  ['services/trackingService', 'tracking'], ['services/metaConversions', 'conversions'],
  ['services/analyticsService', 'analytics'], ['utils/platformDetection', 'platform'],
  ['services/oauthService', 'oauth'],
  ['services/premiumService', 'premium'], ['config/promotions', 'promotions'], ['config/premiumFlow', 'intent'],
]);
const bundle = await build({
  stdin: { contents: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
    import { AuthProvider, useAuth } from './src/contexts/AuthContext.jsx';
    import ProtectedRoute from './src/components/ProtectedRoute.jsx';
    import AuthCallback from './src/pages/AuthCallback.jsx';
    import LoginPage from './src/pages/LoginPage.jsx';
    const originalTimer = window.setTimeout.bind(window);
    const originalCancel = window.clearTimeout.bind(window);
    const startupTimers = new Map();
    window.setTimeout = (callback, delay, ...args) => {
      const id = originalTimer(callback, delay === 500 ? 0 : delay, ...args);
      if (delay === 8000 || delay === 15000) startupTimers.set(id, callback);
      return id;
    };
    window.clearTimeout = id => { startupTimers.delete(id); originalCancel(id); };
    const wait = () => new Promise(resolve => originalTimer(resolve, 35));
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    function PasswordAccess() {
      const {signIn}=useAuth(); const navigate=useNavigate();
      React.useEffect(()=>{window.__passwordLogin=async()=>{
        await signIn('test@example.invalid','test-only'); navigate('/dashboard');
      };},[signIn,navigate]);
      return <div>Password login</div>;
    }
    async function check(platform, callbackRoute, provider='apple') {
      window.__platform = platform;
      window.__listeners = new Set();
      let resolveSession;
      window.__sessionRead = new Promise(resolve => { resolveSession = resolve; });
      const host = document.createElement('div'); document.body.append(host);
      const root = createRoot(host);
      root.render(<MemoryRouter initialEntries={[callbackRoute==='password' ? '/login-form' : callbackRoute ? '/auth/callback' : '/dashboard']}>
        <AuthProvider><Routes>
          <Route path='/auth/callback' element={<AuthCallback/>}/>
          <Route path='/dashboard' element={<ProtectedRoute><div data-panel='yes'>Account panel</div></ProtectedRoute>}/>
          <Route path='/welcome' element={<div data-login='yes'>Login screen</div>}/>
          <Route path='/login' element={<div data-login='yes'>Login screen</div>}/>
          <Route path='/login-form' element={<PasswordAccess/>}/>
        </Routes></AuthProvider>
      </MemoryRouter>);
      await wait(); await wait();
      assert(window.__listeners.size === 1, platform + ': expected one session owner');
      const session = {user:{id:'test-account',email:'test@example.invalid',app_metadata:{provider}}};
      window.__newSession=session;
      if(callbackRoute==='password') await window.__passwordLogin();
      else for (const cb of window.__listeners) cb('SIGNED_IN', session);
      await wait(); await wait();
      assert(host.querySelector('[data-panel]'), platform + ': authenticated panel did not open');
      // Reproduce the production failure: startup read is still pending when its
      // old timeout expires after Apple has already authenticated the account.
      if(callbackRoute!=='password') for (const cb of [...startupTimers.values()]) cb();
      await wait();
      assert(host.querySelector('[data-panel]'), platform + ': startup timer returned an authenticated user to login');
      // Password success is immediately reflected by the provider even if the
      // SDK event is delayed; the eventual event precedes any stale startup read.
      if(callbackRoute==='password') for(const cb of window.__listeners) cb('SIGNED_IN',session);
      resolveSession({data:{session:null},error:null});
      await wait();
      assert(host.querySelector('[data-panel]'), platform + ': stale startup response returned the user to login');
      for (const cb of window.__listeners) cb('SIGNED_OUT', null);
      await wait();
      assert(host.querySelector('[data-login]'), platform + ': explicit logout failed');
      root.unmount(); host.remove();
      assert(window.__listeners.size === 0, platform + ': listener leaked');
    }
    async function checkFailure(platform, screen, fragmentOnly=false) {
      window.__platform=platform;
      window.__listeners=new Set();
      window.__sessionRead=Promise.resolve({data:{session:null},error:null});
      const params='error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code%3A+PRIVATE_CODE+private%40example.invalid';
      window.location.hash=fragmentOnly ? params : '';
      const host=document.createElement('div');document.body.append(host);
      const root=createRoot(host);
      root.render(<MemoryRouter initialEntries={['/'+screen+(fragmentOnly ? '' : '?'+params)]}>
        <AuthProvider><Routes>
          <Route path='/auth/callback' element={<AuthCallback/>}/>
          <Route path='/login' element={<LoginPage/>}/>
        </Routes></AuthProvider>
      </MemoryRouter>);
      await wait();await wait();await wait();
      assert(host.textContent.includes('Tu proveedor no pudo completar el acceso'), platform+': provider failure is hidden on '+screen);
      assert(!host.textContent.includes('PRIVATE_CODE') && !host.textContent.includes('private@example.invalid'), platform+': raw provider details leaked');
      if(screen==='login') assert(host.querySelector('[role=alert]'),platform+': login has no accessible failure notice');
      root.unmount();host.remove();window.location.hash='';
    }
    (async () => {
      const passed=[];
      try {
        for (const platform of ['web','ios','android']) {
          await check(platform,false); passed.push(platform+':protected-route');
          await check(platform,true); passed.push(platform+':apple-callback');
          await check(platform,'password','email'); passed.push(platform+':password-login');
        }
        for(const provider of ['google','facebook']) {
          await check('web',true,provider); passed.push('web:'+provider+'-callback');
        }
        for(const platform of ['web','ios','android']) {
          await checkFailure(platform,'auth/callback'); passed.push(platform+':provider-error-callback');
          await checkFailure(platform,'login'); passed.push(platform+':provider-error-login');
        }
        await checkFailure('web','auth/callback',true); passed.push('web:fragment-only-provider-error');
        document.getElementById('auth-check-results').textContent=JSON.stringify({ok:true,passed});
      } catch(error) {
        document.getElementById('auth-check-results').textContent=JSON.stringify({ok:false,passed,error:error.message});
      }
    })();
  `, resolveDir: process.cwd(), loader: 'jsx' },
  bundle: true, format: 'iife', write: false, define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'auth-check-mocks', setup(builder) {
    builder.onResolve({filter:/.*/}, args => {
      const normalized = args.path.replace(/\\/g, '/').replace(/\.js$/, '');
      for (const [suffix, key] of aliases) {
        if (normalized.endsWith(suffix)) return {path:key,namespace:'auth-check'};
      }
      if (baseline && /AuthContext(?:\.jsx)?$/.test(args.path)) return {path:'context-baseline',namespace:'auth-check'};
    });
    builder.onLoad({filter:/.*/,namespace:'auth-check'}, args => args.path === 'context-baseline'
      ? { contents:oldContext,loader:'jsx',resolveDir:path.resolve('src/contexts') }
      : { contents:mocks[args.path],loader:'js' });
  }}],
});
const html = path.join(temporary,'auth.html');
writeFileSync(html, '<!doctype html><meta charset="utf-8"><pre id="auth-check-results">pending</pre><script>' + bundle.outputFiles[0].text.replace(/<\/script/gi,'<\\/script') + '</script>');
const output = execFileSync(chrome, [
  '--headless','--disable-gpu','--disable-extensions','--disable-background-networking',
  '--no-first-run','--no-default-browser-check',`--user-data-dir=${path.join(temporary,'profile')}`,
  '--dump-dom','--virtual-time-budget=10000',pathToFileURL(html).href,
], {encoding:'utf8',timeout:30000,maxBuffer:5*1024*1024,windowsHide:true,stdio:['ignore','pipe','pipe']});
const result = JSON.parse(output.match(/<pre id="auth-check-results">([^<]+)<\/pre>/)?.[1] || 'null');
console.log(JSON.stringify({baseline,...result},null,2));
if (!result?.ok) process.exitCode = 1;
