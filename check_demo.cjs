const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('C:/Users/juanpablo/APP PAREJAS/.env'));
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY.replace(/['"`]+/g, '');

fetch(url + '/rest/v1/profiles?alias=ilike.*Demo*&select=*', {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
}).then(r => r.json()).then(d => {
  console.log('Demo Profiles:', JSON.stringify(d, null, 2));
}).catch(e => console.error(e));
