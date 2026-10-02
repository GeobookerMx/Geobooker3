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

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 22 ]; then
  echo "Node 22 or newer is required by Capacitor 8. Current: $(node --version)"
  exit 1
fi
echo "Node: $(node --version)"

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "Xcode command-line tools are required. Run this script on a Mac with Xcode installed."
  exit 1
fi
xcodebuild -version

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
for required_var in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_GOOGLE_MAPS_API_KEY; do
  if [ -n "${!required_var:-}" ] || { [ -f ".env.production" ] && grep -Eq "^${required_var}=.+" .env.production; }; then
    echo "${required_var} configured"
  else
    echo "${required_var} missing or empty"
    exit 1
  fi
done

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
echo "Resolving Swift packages..."
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App

echo ""
echo "Build assets are ready for Xcode."
echo "Next steps on the remote iMac:"
echo "  1. Open ios/App/App.xcodeproj (Capacitor 8 uses Swift Package Manager)"
echo "  2. Verify signing team and bundle id"
echo "  3. Product > Clean Build Folder"
echo "  4. Product > Archive"
echo "  5. Upload to TestFlight first, then App Store when smoke tests pass"
