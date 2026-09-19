#!/bin/bash
set -e

echo "=== 1. Generating Xcode Project via XcodeGen ==="
xcodegen generate

echo "=== 2. Creating private key directory for Apple auth ==="
mkdir -p ~/.appstoreconnect/private_keys
cp AuthKey_T7BGJ39HPK.p8 ~/.appstoreconnect/private_keys/

echo "=== 3. Archiving iOS Application with Xcode 15 ==="
xcodebuild clean archive \
  -project MarifEt.xcodeproj \
  -scheme MarifEt \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/MarifEt.xcarchive \
  -allowProvisioningUpdates \
  -authenticationKeyPath ./AuthKey_T7BGJ39HPK.p8 \
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
  -authenticationKeyPath ./AuthKey_T7BGJ39HPK.p8 \
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
