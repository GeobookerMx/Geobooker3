import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltan variables de entorno");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log("Creando usuario Demo: appreview@geobooker.com ...");
  const { data: user, error } = await supabase.auth.admin.createUser({
    email: 'appreview@geobooker.com',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: 'Apple Reviewer' }
  });

  if (error) {
    if (error.message.includes('already exists') || error.message.includes('already registered')) {
         console.log("El usuario ya existe, obteniendo ID...");
         // let's grab the id by RPC or assume it exists and try to find a business. 
         const { data: usersInfo } = await supabase.from('user_profiles').select('id').eq('email', 'appreview@geobooker.com');
         if(usersInfo && usersInfo.length > 0) {
             console.log("User ID:", usersInfo[0].id);
         }
    } else {
        console.error("Error al crear usuario:", error);
    }
  } else {
    console.log("Usuario creado:", user.user.id);
    
    // Create Profile if trigger didn't
    const { error: profileErr } = await supabase.from('user_profiles').upsert({
      id: user.user.id,
      email: 'appreview@geobooker.com',
      full_name: 'Apple Reviewer',
      is_premium_owner: true,
      updated_at: new Date().toISOString()
    });
    if(profileErr) console.error("Profile Upsert error:", profileErr);

    // Create a demo business
    const { data: biz, error: bizErr } = await supabase.from('businesses').insert({
      owner_id: user.user.id,
      name: 'Demo Restaurant Apple',
      description: 'Lugar exclusivo para la revisión de Apple App Store',
      category: 'restaurantes',
      address: 'Polanco, CDMX',
      latitude: 19.4326,
      longitude: -99.1332,
      is_verified: true,
      status: 'approved',
      images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800'],
      is_visible: true
    });
    
    if (bizErr) console.error("Business Insert error:", bizErr);
  }
  console.log("Listo. Credenciales: appreview@geobooker.com / Password123!");
}

run();