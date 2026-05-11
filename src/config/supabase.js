// ✅ FIX: Este archivo re-exporta el cliente Supabase correcto desde src/lib/supabase.js
// El cliente en lib/supabase.js tiene la configuración nativa de Capacitor (PKCE, detectSessionInUrl, etc.)
// NO crear un segundo cliente aquí — causaría conflictos de sesión en iOS.
export { supabase } from '../lib/supabase';

// Google Maps API Key — usa env var cuando esté disponible (web build con Netlify env),
// y cae al valor hardcoded para builds nativos en MacInCloud que no tengan .env.local.
// La protección real de esta key vive en las restricciones del API key en Google Cloud Console
// (HTTP referrers debe incluir capacitor://localhost/* para que el iOS WebView funcione).
export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyB0sOzA3Hzj8zX7Rn9M0eGJM4pEeBdTff4';

// Categorías de negocios
export const CATEGORIES = [
  { id: 'restaurantes', name: 'Restaurantes', icon: '🍔' },
  { id: 'bares', name: 'Bares', icon: '🍺' },
  { id: 'cafeterias', name: 'Cafeterías', icon: '☕' },
  { id: 'tiendas', name: 'Tiendas', icon: '🛍️' },
  { id: 'servicios', name: 'Servicios', icon: '🛠️' },
  { id: 'salud', name: 'Salud', icon: '🏥' },
];