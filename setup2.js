import { createClient } from 'C:/Users/juanpablo/APP PAREJAS/node_modules/@supabase/supabase-js/dist/main/index.js';

const url = 'https://nbpidjpkanwynlhdxowx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icGlkanBrYW53eW5saGR4b3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNDg3ODIsImV4cCI6MjA4NzgyNDc4Mn0.v2plBPSTabpYQReeQ-Mq9cG4-LXzKRbwuRTBks6WW18';
const supabase = createClient(url, key);

async function setup() {
  console.log('Creando reviewer@lovia.com...');
  await supabase.auth.signUp({ email: 'reviewer@lovia.com', password: 'LovIA2024!', options: { data: { alias: 'Apple Review' } } });
  
  const { data: auth, error: err } = await supabase.auth.signInWithPassword({ email: 'reviewer@lovia.com', password: 'LovIA2024!' });
  if(err) { console.log('Error Auth:', err.message); return; }
  
  const { error } = await supabase.from('profiles').upsert({
    id: auth.user.id, alias: 'Apple Review', onboarding_completed: true, tier: 'free', visibility_mode: 'classic'
  });
  if(error) console.log('Error DB:', error.message);
  else console.log('✅ reviewer@lovia.com LISTO Y CON MATCHES DESBLOQUEADOS!');
}
setup();
