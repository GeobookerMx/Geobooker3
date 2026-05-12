#!/bin/bash
# =============================================================
# GEOBOOKER — Script de Build para iOS
# Uso: cd ~/Geobooker3 && bash build-ios.sh
# =============================================================
set -e

echo ""
echo "🚀 GEOBOOKER iOS BUILD SCRIPT"
echo "=============================="

# 1. Directorio actual
echo "📁 Directorio: $(pwd)"

# 2. Branch actual
echo "🔀 Branch: $(git branch --show-current)"

# 3. Forzar actualización al último commit de main en GitHub
echo ""
echo "⬇️  Descargando últimos cambios de GitHub (origin/main)..."
git fetch origin
git reset --hard origin/main

# 4. Confirmar qué commit se va a compilar
echo ""
echo "✅ Commits incluidos en este build:"
git log --oneline -5

# 5. Variables de entorno
echo ""
echo "🔑 Verificando .env.production..."
if [ -f ".env.production" ]; then
  echo "   ✅ .env.production encontrado"
  grep "VITE_SUPABASE_URL" .env.production | head -1
  grep "VITE_GOOGLE_MAPS_API_KEY" .env.production | head -1
else
  echo "   ⚠️  .env.production NO encontrado — se usarán los fallbacks hardcodeados en el código"
fi

# 6. Instalar dependencias
echo ""
echo "📦 Instalando dependencias (npm install)..."
npm install

# 7. Compilar Vite
echo ""
echo "🏗️  Compilando con Vite (npm run build)..."
npm run build

# 8. Sincronizar con iOS
echo ""
echo "📱 Sincronizando con proyecto iOS (npx cap sync ios)..."
npx cap sync ios

echo ""
echo "============================================="
echo "✅ BUILD COMPLETO — EL CÓDIGO WEB ESTÁ LISTO"
echo "============================================="
echo ""
echo "PRÓXIMOS PASOS EN XCODE:"
echo "  1. Abrir ios/App/App.xcworkspace"
echo "  2. Product → Clean Build Folder (Shift + Cmd + K)"
echo "  3. Cambiar Build Number (ej. 25)"
echo "  4. Product → Archive"
echo "  5. Distribute App → App Store Connect → Upload"
echo ""
