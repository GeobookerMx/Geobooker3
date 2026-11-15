#!/bin/bash
set -euo pipefail
# Secrets are read only from the CI environment. Never enable shell tracing.
for name in APPLE_DISTRIBUTION_P12_BASE64 APPLE_DISTRIBUTION_P12_PASSWORD APPLE_PROVISIONING_PROFILE_BASE64 APP_STORE_CONNECT_PRIVATE_KEY_BASE64 APP_STORE_CONNECT_KEY_ID APP_STORE_CONNECT_ISSUER_ID MARKETING_VERSION BUILD_NUMBER; do
  if [[ -z "${!name:-}" ]]; then echo "Missing required CI setting: $name" >&2; exit 1; fi
done
[[ "$MARKETING_VERSION" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]] || { echo 'Invalid numeric marketing version'; exit 1; }
[[ "$BUILD_NUMBER" =~ ^[1-9][0-9]*$ ]] || { echo 'Invalid build number'; exit 1; }
umask 077
mkdir -p "$RUNNER_TEMP/ios-signing"
python3 - <<'PY'
import base64, os
from pathlib import Path
root = Path(os.environ['RUNNER_TEMP']) / 'ios-signing'
for env, filename in [('APPLE_DISTRIBUTION_P12_BASE64','distribution.p12'), ('APPLE_PROVISIONING_PROFILE_BASE64','profile.mobileprovision'), ('APP_STORE_CONNECT_PRIVATE_KEY_BASE64','AuthKey.p8')]:
    (root / filename).write_bytes(base64.b64decode(os.environ[env], validate=True))
PY
security cms -D -i "$RUNNER_TEMP/ios-signing/profile.mobileprovision" > "$RUNNER_TEMP/ios-signing/profile.plist"
python3 - <<'PY'
import os, plistlib
from pathlib import Path
root = Path(os.environ['RUNNER_TEMP'])
with (root / 'ios-signing/profile.plist').open('rb') as f: profile = plistlib.load(f)
assert profile['Entitlements']['application-identifier'] == 'QCN4SYVAQ4.com.geobooker.ios', 'Wrong provisioning profile app'
assert not profile.get('ProvisionedDevices') and not profile.get('ProvisionsAllDevices'), 'An App Store distribution profile is required'
with open(os.environ['GITHUB_ENV'], 'a') as f: f.write('IOS_PROFILE_UUID=' + profile['UUID'] + '\n')
options = {'method':'app-store-connect', 'destination':'upload', 'teamID':'QCN4SYVAQ4', 'signingStyle':'manual', 'signingCertificate':'Apple Distribution', 'provisioningProfiles':{'com.geobooker.ios':profile['UUID']}, 'manageAppVersionAndBuildNumber':False, 'uploadSymbols':True}
with (root / 'ios-export-options.plist').open('wb') as f: plistlib.dump(options, f)
PY
keychain="$RUNNER_TEMP/ios-signing/signing.keychain-db"
password=$(openssl rand -hex 32)
security create-keychain -p "$password" "$keychain"
security set-keychain-settings -lut 21600 "$keychain"
security unlock-keychain -p "$password" "$keychain"
security import "$RUNNER_TEMP/ios-signing/distribution.p12" -P "$APPLE_DISTRIBUTION_P12_PASSWORD" -A -t cert -f pkcs12 -k "$keychain"
security set-key-partition-list -S apple-tool:,apple: -k "$password" "$keychain" >/dev/null
security list-keychains -d user -s "$keychain" login.keychain-db
mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
cp "$RUNNER_TEMP/ios-signing/profile.mobileprovision" "$HOME/Library/MobileDevice/Provisioning Profiles/geobooker-meta-review.mobileprovision"
