// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('[Geobooker] ⚠️ Variables de entorno de Supabase no encontradas. Verifica tu .env');
}

const isNative = Capacitor.isNativePlatform();

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      // ✅ FIX Bug #2/#3: false en nativo — previene loops OAuth con capacitor://
      detectSessionInUrl: !isNative,
      flowType: 'pkce',
      storageKey: 'geobooker-auth'
    }
  }
);

