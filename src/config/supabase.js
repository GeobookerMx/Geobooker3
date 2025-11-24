
// Reemplaza estos con tu URL y anon key de tu proyecto Supabase
const supabaseUrl = 'https://dllckokqkgcraxyxsfqc.supabase.co'; // Ejemplo: tu_proyecto.supabase.co
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGNrb2txa2djcmF4eXhzZnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODg3MjEsImV4cCI6MjA3MzU2NDcyMX0.9mJFl3tN-mTE6uu6gGIPxVozUf6OILJkIZ4cERze0zI'; // Ejemplo: tu_anon_key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tu API Key de Google Maps (Reemplaza con la tuya)
export const GOOGLE_MAPS_API_KEY = 'AIzaSyAgcOKMDdfAyGgT7l4Up5qY34Jg1ZdP0jY'; // NO INCLUIR EN GITHUB

// Opcional: Define tus categorías o constantes aquí
export const CATEGORIES = [
  { id: 'restaurantes', name: 'Restaurantes', icon: '🍔' },
  { id: 'bares', name: 'Bares', icon: '🍺' },
  { id: 'cafeterias', name: 'Cafeterías', icon: '☕' },
  { id: 'tiendas', name: 'Tiendas', icon: '🛍️' },
  { id: 'servicios', name: 'Servicios', icon: '🛠️' },
  { id: 'salud', name: 'Salud', icon: '🏥' },
];