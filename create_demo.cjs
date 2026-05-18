const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Cargar variables de entorno
const env = dotenv.parse(fs.readFileSync('C:/Users/juanpablo/APP PAREJAS/.env'));
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.replace(/['"`]+/g, '');

const supabase = createClient(url, key);

async function createDemoUser() {
  console.log('Intentando crear usuario demo@lovia.com.mx...');
  const { data, error } = await supabase.auth.signUp({
    email: 'demo@lovia.com.mx',
    password: 'Demo1234',
    options: {
      data: {
        alias: 'Demo Apple',
        full_name: 'Apple Reviewer'
      }
    }
  });

  if (error) {
    if (error.message.includes('already registered')) {
        console.log('✅ La cuenta ya existe. Intentando iniciar sesión...');
        const login = await supabase.auth.signInWithPassword({
            email: 'demo@lovia.com.mx',
            password: 'Demo1234'
        });
        if (login.error) {
            console.log('❌ Error al iniciar sesión. La contraseña actual NO es Demo1234:', login.error.message);
        } else {
            console.log('✅ Inicio de sesión exitoso. La cuenta existe y la contraseña es correcta.');
        }
    } else {
        console.error('❌ Error al crear usuario:', error.message);
    }
  } else {
    console.log('✅ Usuario demo CREADO con éxito:', data.user?.id);
    
    // Forzar actualización del perfil para que parezca que completó el onboarding
    console.log('Actualizando perfil con onboarding_completed: true...');
    if (data.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
                onboarding_completed: true,
                alias: 'Demo Apple',
                age: 30,
                city: 'Cupertino'
            })
            .eq('id', data.user.id);
            
        if (profileError) {
            console.log('⚠️ No se pudo actualizar el perfil automáticamente:', profileError.message);
        } else {
            console.log('✅ Perfil actualizado.');
        }
    }
  }
}

createDemoUser();
