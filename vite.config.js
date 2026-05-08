import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // Optimizar re-renders: solo refresh el módulo que cambió
      fastRefresh: true,
    })
  ],
  // Alias para imports más cortos en todo el proyecto
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
    }
  },
  build: {
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
          // Icons — tree-shaking activo: solo importa los íconos usados
          'vendor-icons': ['lucide-react'],
        },
        // Nombres de chunks más legibles en producción
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      // Tree-shaking agresivo: elimina código no usado
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    // Chunk pequeños = carga más rápida en Android WebView
    chunkSizeWarningLimit: 300,
    // Source maps OFF en producción (menos MB para descargar)
    sourcemap: false,
    // esbuild es el minificador más rápido
    minify: 'esbuild',
    esbuildOptions: {
      // Eliminar console.log y debugger en producción
      drop: ['debugger'],
      // Reemplazar process.env para tree-shaking de dev code
      define: {
        'process.env.NODE_ENV': '"production"',
      }
    },
    // Target Android WebView moderno (Chrome 80+)
    target: 'es2020',
    // CSS separado por página (lazy loading de estilos)
    cssCodeSplit: true,
    // Reportar tamaño de assets para monitoreo
    reportCompressedSize: true,
  },
  // Optimizar dependencias pre-bundled
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
    ],
    // Excluir librerías que se cargan bajo demanda
    exclude: ['xlsx', 'recharts'],
  },
})