// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

// ✅ FIX CRÍTICO: Fallbacks hardcodeados para builds iOS (Mac no tiene .env.local)
// Las VITE_* vars son solo para desarrollo local. En iOS, siempre usa el fallback.
// Seguridad real: Row Level Security en Supabase + anon key es pública por diseño.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  || 'https://dllckokqkgcraxyxsfqc.supabase.co';

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGNrb2txa2djcmF4eXhzZnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODg3MjEsImV4cCI6MjA3MzU2NDcyMX0.9mJFl3tN-mTE6uu6gGIPxVozUf6OILJkIZ4cERze0zI';


const isNative = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      // false en nativo — previene loops OAuth con capacitor://
      detectSessionInUrl: !isNative,
      // ⚠️ Android: Chrome Custom Tab corre en proceso separado al WebView.
      // PKCE guarda code_verifier en localStorage del WebView, pero cuando
      // el deep link regresa, el code_verifier ya no está disponible → error 401.
      // Solución: usar 'implicit' en Android (tokens directos en el hash #access_token)
      // iOS puede usar PKCE porque SFSafariViewController comparte el mismo proceso.
      flowType: isAndroid ? 'implicit' : 'pkce',
      storageKey: 'geobooker-auth'
    }
  }
);


