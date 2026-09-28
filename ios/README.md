# Puku AI — iOS Native Documentation

This directory contains the native iOS implementation of **Puku AI** (`com.pukuai`), configured with React Native 0.87+, CocoaPods, and Expo Modules.

---

## 1. Prerequisites

- **Host OS**: macOS Sequoia / Sonoma
- **Xcode**: 15.0 or higher
- **Ruby**: 3.2+ (managed via `rbenv` or system)
- **CocoaPods**: 1.15+

---

## 2. Setup & Installation

Before running the iOS project for the first time:

```bash
# 1. Install Ruby dependencies (Bundler)
bundle install

# 2. Install CocoaPods dependencies
cd ios
bundle exec pod install
cd ..
```

---

## 3. Key Commands

### Development (Debug Simulator / Device)
```bash
# Start Metro:
npm start

# Run iOS build:
npm run ios
```

### Production Offline Bundle Generation
```bash
npm run bundle:ios
```

---

## 4. Deep Linking & URL Scheme

The app registers the custom URL scheme `pukuapp` in `ios/PukuAI/Info.plist` (or through the Xcode target URL Types):

- **Scheme**: `pukuapp://`
- **OAuth Callback**: `pukuapp://callback/`

This allows the in-app browser or Safari OAuth flow to redirect back to the Puku app upon successful authentication.

---

## 5. Over-The-Air (OTA) Updates on iOS

The iOS target is fully configured for EAS Updates with channel `main`. When an OTA update is published via GitHub Actions, iOS builds automatically download and apply the new bundle on launch without needing a TestFlight or App Store review submission.
