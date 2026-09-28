# Puku AI — Android Native Documentation

This directory contains the native Android implementation of **Puku AI** (`com.pukuai`), built using React Native 0.87+, New Architecture (TurboModules), and Expo Modules.

---

## 1. Prerequisites

- **JDK**: OpenJDK 17 or higher
- **Android SDK**: API Level 34 (Android 14)
- **NDK**: 26.1.10909125
- **Build Tools**: 34.0.0

---

## 2. Key Commands

### Development (Debug Build)
Start the Metro bundler and deploy debug build to a connected device or emulator:
```bash
# In the project root:
npm start

# In another terminal:
npm run android
```

### Production Offline Bundle Generation
Generates the offline JavaScript bundle and copies all drawable assets into `android/app/src/main/`:
```bash
npm run bundle:android
```

### Release APK Build
Compile release APKs using Gradle:
```bash
cd android

# Build all architectures:
./gradlew assembleRelease --no-daemon

# OR build specifically for arm64-v8a (much faster, optimal for modern Android devices):
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
```

### APK Output Locations
Generated APKs are located at:
- Universal: `android/app/build/outputs/apk/release/app-universal-release.apk`
- 64-bit ARM: `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`

---

## 3. Permissions & Manifest

Declared in `android/app/src/main/AndroidManifest.xml`:

- `android.permission.INTERNET`: For API requests, WebSocket streaming & OTA updates.
- `android.permission.RECORD_AUDIO`: For real-time voice prompts and audio transcription.
- `android.permission.MODIFY_AUDIO_SETTINGS`: For audio mode handling during voice chats.

### Expo Updates Configuration
```xml
<meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS"/>
<meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="5000"/>
<meta-data android:name="expo.modules.updates.EXPO_UPDATE_URL" android:value="https://u.expo.dev/4b79ef0a-57a2-4e38-8e45-a7faa9589749"/>
<meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHANNEL" android:value="main"/>
```

---

## 4. Edge-to-Edge & Soft-Keyboard Architecture

On modern Android devices (Android 11–15, Samsung One UI), standard decor view bounds do not resize when `windowSoftInputMode="adjustResize"` is used in edge-to-edge mode. 

Puku AI addresses this natively and uniformly through `src/utils/useKeyboardHeight.ts`:
- Listens to Android IME events (`keyboardDidShow`, `keyboardDidHide`).
- Triggers hardware-accelerated `LayoutAnimation` with `LayoutAnimation.Presets.easeInEaseOut`.
- Dynamically increases container `paddingBottom` by exact keyboard height so composers, modals, and sheets never get covered.
