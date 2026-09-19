#!/bin/bash
set -e

echo "=== 1. Setting up Environment and Keychain ==="
KEY_PATH="$(pwd)/AuthKey_T7BGJ39HPK.p8"
echo "Absolute Key Path: $KEY_PATH"

mkdir -p ~/.appstoreconnect/private_keys ~/.private_keys
cp "$KEY_PATH" ~/.appstoreconnect/private_keys/
cp "$KEY_PATH" ~/.private_keys/

# Unlock default login keychain on macOS runner
security unlock-keychain -p "" ~/Library/Keychains/login.keychain-db || true
security set-keychain-settings -lut 21600 ~/Library/Keychains/login.keychain-db || true

echo "=== 2. Generating Xcode Project via XcodeGen ==="
xcodegen generate

echo "=== 3. Archiving iOS Application with Xcode ==="
xcodebuild clean archive \
  -project MarifEt.xcodeproj \
  -scheme MarifEt \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/MarifEt.xcarchive \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$KEY_PATH" \
  -authenticationKeyID T7BGJ39HPK \
  -authenticationKeyIssuerID 6025c8a1-87c2-474e-aa8d-8b6b07a6d268 \
  CODE_SIGN_STYLE="Automatic" \
  DEVELOPMENT_TEAM="WGARWL7QZ4"

echo "=== 4. Exporting IPA ==="
xcodebuild -exportArchive \
  -archivePath build/MarifEt.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$KEY_PATH" \
  -authenticationKeyID T7BGJ39HPK \
  -authenticationKeyIssuerID 6025c8a1-87c2-474e-aa8d-8b6b07a6d268

echo "=== 5. Uploading IPA to Apple TestFlight ==="
IPA_FILE=$(find build/export -name "*.ipa" | head -n 1)
echo "Found IPA: $IPA_FILE"

xcrun altool --upload-app \
  -f "$IPA_FILE" \
  -t ios \
  --apiKey T7BGJ39HPK \
  --apiIssuer 6025c8a1-87c2-474e-aa8d-8b6b07a6d268

echo "=== SUCCESS! Application uploaded to Apple TestFlight ==="
