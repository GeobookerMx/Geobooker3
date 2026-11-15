"""Record resolved packages and archive metadata. Never infer an App Store binary's SDK."""
import argparse
import json
import os
import plistlib
import shutil
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--archive', type=Path)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
lock = Path('ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved')
if not lock.exists():
    raise SystemExit('No Package.resolved: run Xcode package resolution on macOS first.')
resolved = json.loads(lock.read_text())
pins = resolved.get('pins', resolved.get('object', {}).get('pins', []))
versions = {pin.get('identity', pin.get('package')): pin['state'] for pin in pins}
assert versions.get('facebook-ios-sdk', {}).get('version') == '19.0.1', versions
shutil.copyfile(lock, args.output / 'Package.resolved')
evidence = {
    'commit': os.environ.get('GITHUB_SHA'),
    'xcode': subprocess.check_output(['xcodebuild', '-version'], text=True).strip(),
    'packages': versions,
    'realDeviceTest': 'pending',
    'metaEventsManagerReceipt': 'pending',
    'appStorePrivacyUpdate': 'pending',
}
if args.archive:
    app = args.archive / 'Products/Applications/App.app'
    with (app / 'Info.plist').open('rb') as stream:
        info = plistlib.load(stream)
    evidence['archive'] = {key: info.get(key) for key in [
        'CFBundleIdentifier', 'CFBundleShortVersionString', 'CFBundleVersion', 'MinimumOSVersion', 'FacebookAppID',
        'FacebookAutoLogAppEventsEnabled', 'FacebookAdvertiserIDCollectionEnabled',
        'FBSDKAutoLogMetaDataEnabled', 'FBSDKAutoLogProductImprovementEnabled',
    ]}
    assert info['CFBundleIdentifier'] == 'com.geobooker.ios'
    assert info['FacebookAppID'] == '3176918089184321'
    evidence['privacyManifests'] = [str(path.relative_to(app)) for path in app.rglob('PrivacyInfo.xcprivacy')]
    assert any('FBSDKCoreKit' in path or 'FacebookCore' in path for path in evidence['privacyManifests']), 'Meta privacy manifest missing from archive'
    evidence['frameworks'] = sorted(path.name for path in (app / 'Frameworks').glob('*.framework'))
(args.output / 'release-evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
print('Wrote native dependency/archive evidence; device and Meta receipt tests remain pending.')
