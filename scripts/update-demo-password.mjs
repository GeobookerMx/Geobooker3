// Explicit maintenance command. Never run as part of builds or deployment.
// Provide credentials and DEMO_NEW_PASSWORD through a private environment.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.DEMO_USER_ID;
const password = process.env.DEMO_NEW_PASSWORD;

if (url !== 'https://dllckokqkgcraxyxsfqc.supabase.co') {
  console.error('Este comando solo admite el proyecto Supabase de Geobooker.');
  process.exit(1);
}
if (!key || !userId || !password) {
  console.error('Faltan SUPABASE_SERVICE_ROLE_KEY, DEMO_USER_ID o DEMO_NEW_PASSWORD en el entorno privado.');
  process.exit(1);
}
if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(userId) || password.length < 12) {
  console.error('Se requiere un UUID de demostración válido y una contraseña de al menos 12 caracteres.');
  process.exit(1);
}

const client = createClient(url, key, {auth:{persistSession:false,autoRefreshToken:false}});
try {
  const {data:admin,error:lookupError} = await client.from('admin_users').select('id').eq('id',userId).maybeSingle();
  if (lookupError || admin) {
    console.error('No se puede modificar una cuenta administrativa mediante este comando.');
    process.exitCode = 1;
  } else {
    const {error} = await client.auth.admin.updateUserById(userId,{password});
    if (error) throw new Error('demo_password_update_failed');
    console.log('Contraseña de demostración actualizada. Su valor no se muestra.');
  }
} catch {
  console.error('No se pudo actualizar la cuenta de demostración. Revisa la configuración privada.');
  process.exitCode = 1;
}
