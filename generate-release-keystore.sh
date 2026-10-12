#!/bin/bash
# Generates an Android release keystore and writes android/keystore.properties
# so `./gradlew assembleRelease` / `bundleRelease` sign with it instead of
# falling back to the public debug keystore.
#
# Run this once, keep the output .jks and keystore.properties OUT of git
# (already gitignored), and back the .jks file up somewhere safe — if you
# lose it after your first Play Store upload, you can never update the app
# under the same listing again.

set -euo pipefail

echo "=== Android Release Keystore Generator ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/android"

read -p "Enter keystore directory (default: $ANDROID_DIR/keys): " KEY_DIR
KEY_DIR=${KEY_DIR:-"$ANDROID_DIR/keys"}
mkdir -p "$KEY_DIR"

read -p "Enter keystore name (default: release-key.jks): " KEYSTORE_NAME
KEYSTORE_NAME=${KEYSTORE_NAME:-release-key.jks}

read -p "Enter key alias (default: puku-release): " KEY_ALIAS
KEY_ALIAS=${KEY_ALIAS:-puku-release}

read -s -p "Enter keystore password (min 6 chars): " KEY_PASS
echo
read -s -p "Confirm keystore password: " KEY_PASS_CONFIRM
echo

if [ "$KEY_PASS" != "$KEY_PASS_CONFIRM" ]; then
  echo "Passwords do not match."
  exit 1
fi

KEY_PATH="$KEY_DIR/$KEYSTORE_NAME"

if [ -f "$KEY_PATH" ]; then
  echo "A keystore already exists at $KEY_PATH — refusing to overwrite it."
  exit 1
fi

echo
echo "Generating keystore at $KEY_PATH ..."

keytool -genkeypair \
  -v \
  -keystore "$KEY_PATH" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$KEY_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=Puku AI, OU=Mobile, O=Puku, L=Dhaka, ST=Dhaka, C=BD"

PROPS_PATH="$ANDROID_DIR/keystore.properties"
cat > "$PROPS_PATH" <<EOF
storeFile=$KEY_PATH
storePassword=$KEY_PASS
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASS
EOF

echo
echo "Keystore generated and android/keystore.properties written."
echo "Release builds (./gradlew assembleRelease / bundleRelease) will now"
echo "sign with this key instead of the debug keystore."
echo
echo "For CI signing, base64-encode the keystore and add it as a GitHub secret:"
echo "  base64 -w0 \"$KEY_PATH\" | xclip -selection clipboard   # or pbcopy on macOS"
echo "Then set these repo secrets: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD,"
echo "ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD."
