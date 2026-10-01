#!/bin/bash
set -e

# Detect connected Android device
DEVICE_ID=$(adb devices | grep -w "device" | head -n 1 | awk '{print $1}')

if [ -z "$DEVICE_ID" ]; then
  echo "❌ Error: No Android device found. Please connect your Samsung phone via USB with USB debugging enabled."
  exit 1
fi

echo "✅ Found device: $DEVICE_ID"
echo "🚀 1. Launching Puku AI on phone..."
npx --yes @swmansion/argent@latest run launch-app --udid "$DEVICE_ID" --bundleId com.pukuai

echo "⏳ Waiting for app to settle..."
sleep 2

echo "✍️ 2. Tapping chat input box..."
npx --yes @swmansion/argent@latest run gesture-tap --udid "$DEVICE_ID" --x 0.40 --y 0.88

echo "⌨️ 3. Typing automated message..."
MESSAGE="Hello Puku! This is an automated test from Argent."
npx --yes @swmansion/argent@latest run keyboard --udid "$DEVICE_ID" --text "$MESSAGE"

echo "📤 4. Tapping send button..."
npx --yes @swmansion/argent@latest run gesture-tap --udid "$DEVICE_ID" --x 0.87 --y 0.555

echo "⏳ Waiting for AI response..."
sleep 4

echo "🔙 5. Dismissing keyboard..."
npx --yes @swmansion/argent@latest run button --udid "$DEVICE_ID" --button back

echo "📸 6. Capturing screenshot from phone..."
OUTPUT_PATH="/home/iftakhar/Poridhi/puku_argent_demo.png"
npx --yes @swmansion/argent@latest run screenshot --udid "$DEVICE_ID" --out "$OUTPUT_PATH"

echo "🎉 Automation completed successfully!"
echo "📷 Screenshot saved at: $OUTPUT_PATH"
