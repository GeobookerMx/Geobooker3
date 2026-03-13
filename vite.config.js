import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Separate heavy vendor libraries into their own chunks
    // so regular users never download admin-only code
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React (shared by everything)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Google Maps (only loaded on map pages)
          'vendor-maps': ['@react-google-maps/api'],
          // Charts library (admin dashboards only)
          'vendor-recharts': ['recharts'],
          // Excel export (admin only)
          'vendor-xlsx': ['xlsx'],
          // Stripe payments
          'vendor-stripe': ['@stripe/stripe-js'],
          // Internationalization
          'vendor-i18n': ['i18next', 'react-i18next'],
          // Icons
          'vendor-icons': ['lucide-react'],
        }
      }
    },
    // Increase warning limit since we've handled splitting
    chunkSizeWarningLimit: 300,
    // Enable source maps for debugging
    sourcemap: false,
    // Minification
    minify: 'esbuild',
    // Target modern browsers
    target: 'es2020',
  },
})