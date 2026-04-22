import { createClient } from '@supabase/supabase-js'

// ====== CAMBIA ESTOS 3 VALORES ======
const SUPABASE_URL = 'https://dllckokqkgcraxyxsfqc.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGNrb2txa2djcmF4eXhzZnFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk4ODcyMSwiZXhwIjoyMDczNTY0NzIxfQ.C-8SZaLHXuUJtCnwPHJJFF7i49amwXpTEBuvNKpb8yA'
const DEMO_USER_ID = '379796dd-0c42-40fa-9d48-3d3e7ccc64db'
// ====================================

const NEW_DEMO_PASSWORD = 'GeoDemo2026!'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      DEMO_USER_ID,
      {
        password: NEW_DEMO_PASSWORD,
        email_confirm: true,
      }
    )

    if (error) throw error

    console.log('✅ Contraseña actualizada correctamente')
    console.log('User ID:', data.user?.id)
    console.log('Nuevo password:', NEW_DEMO_PASSWORD)
  } catch (err) {
    console.error('❌ Error actualizando la contraseña demo:')
    console.error(err)
    process.exit(1)
  }
}

main()