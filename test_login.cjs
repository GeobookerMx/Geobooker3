const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('C:/Users/juanpablo/APP PAREJAS/.env'));
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.replace(/['"`]+/g, '');

const supabase = createClient(url, key);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo@lovia.com.mx',
    password: 'Demo1234'
  });
  
  if (error) {
    console.log('❌ ERROR AL INICIAR SESIÓN:', error.message);
  } else {
    console.log('✅ SESIÓN INICIADA CORRECTAMENTE');
    console.log('User ID:', data.user.id);
  }
}

testLogin();
