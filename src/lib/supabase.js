// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  // No lanzar excepción — dejamos que React monte y el AuthProvider maneje el error
  console.error('[Geobooker] ⚠️ Variables de entorno de Supabase no encontradas. Verifica tu .env');
}

// En Capacitor (Android/iOS), detectSessionInUrl causa loops de OAuth
// porque window.location no es una URL HTTP válida (es capacitor://)
const isNative = Capacitor.isNativePlatform();

// Configuración básica del cliente Supabase
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: !isNative, // ← false en Android/iOS nativo — previene loops de OAuth
      flowType: 'pkce',
      storageKey: 'geobooker-auth'
    }
  }
);
