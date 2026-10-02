// src/env.d.ts
interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_INTERNATIONAL_EMAIL_CENTER_ENABLED?: string
  // ... más variables de entorno
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
