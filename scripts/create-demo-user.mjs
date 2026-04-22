import { createClient } from '@supabase/supabase-js'

// ====== CAMBIA ESTOS 4 VALORES ======
const SUPABASE_URL = 'https://dllckokqkgcraxyxsfqc.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGNrb2txa2djcmF4eXhzZnFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk4ODcyMSwiZXhwIjoyMDczNTY0NzIxfQ.C-8SZaLHXuUJtCnwPHJJFF7i49amwXpTEBuvNKpb8yA'
const DEMO_EMAIL = 'demo@geobooker.com'
const DEMO_PASSWORD = 'GeoDemo2026!'
// ====================================

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo App Review',
      },
    })

    if (error) throw error

    const user = data.user
    if (!user?.id) {
      throw new Error('No se pudo crear el usuario demo')
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          email: DEMO_EMAIL,
          full_name: 'Demo App Review',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    if (profileError) {
      console.warn('Usuario creado, pero no se pudo guardar user_profiles:', profileError.message)
    }

    console.log('✅ Usuario demo creado correctamente')
    console.log('Email:', DEMO_EMAIL)
    console.log('Password:', DEMO_PASSWORD)
    console.log('User ID:', user.id)
  } catch (err) {
    console.error('❌ Error creando usuario demo:')
    console.error(err)
    process.exit(1)
  }
}

main()