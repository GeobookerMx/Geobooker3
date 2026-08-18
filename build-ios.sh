#!/bin/bash
# =============================================================
# GEOBOOKER - iOS build helper
# Usage: cd ~/Geobooker3 && bash build-ios.sh
# =============================================================
set -euo pipefail

echo ""
echo "GEOBOOKER iOS BUILD"
echo "==================="

CURRENT_BRANCH="$(git branch --show-current)"
CURRENT_COMMIT="$(git rev-parse --short HEAD)"

echo ""
echo "Directory: $(pwd)"
echo "Branch: ${CURRENT_BRANCH}"
echo "Commit: ${CURRENT_COMMIT}"

echo ""
echo "Checking local git state..."
if [ -n "$(git status --porcelain)" ]; then
  echo "Local changes detected. Commit or stash them before building iOS."
  git status --short
  exit 1
fi

echo ""
echo "Fetching origin for visibility only..."
git fetch origin

echo ""
echo "Recent commits included in this build:"
git log --oneline -5

echo ""
echo "Checking .env.production..."
if [ -f ".env.production" ]; then
  echo ".env.production found"
  if grep -q "VITE_SUPABASE_URL=" .env.production; then
    echo "VITE_SUPABASE_URL configured"
  else
    echo "VITE_SUPABASE_URL missing"
  fi
  if grep -q "VITE_GOOGLE_MAPS_API_KEY=" .env.production; then
    echo "VITE_GOOGLE_MAPS_API_KEY configured"
  else
    echo "VITE_GOOGLE_MAPS_API_KEY missing"
  fi
else
  echo ".env.production not found; build will use only Vite/environment defaults."
fi

echo ""
echo "Installing dependencies..."
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

echo ""
echo "Building web bundle..."
npm run build

echo ""
echo "Syncing Capacitor iOS..."
npx cap sync ios

echo ""
echo "Build assets are ready for Xcode."
echo "Next steps on the remote iMac:"
echo "  1. Open ios/App/App.xcworkspace"
echo "  2. Verify signing team and bundle id"
echo "  3. Product > Clean Build Folder"
echo "  4. Product > Archive"
echo "  5. Upload to TestFlight first, then App Store when smoke tests pass"
