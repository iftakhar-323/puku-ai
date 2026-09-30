# Puku AI Mobile Client

<p align="center">
  <strong>The authentic, high-performance mobile client for Puku AI.</strong><br/>
  Bringing 1:1 desktop web aesthetic, multi-model reasoning, Puku Bot, project knowledge, and remote terminal pairing to Android and iOS.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.87.1-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Expo-57.0-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/EAS_OTA-Updates_Active-success?style=flat-square&logo=expo&logoColor=white" alt="EAS OTA Updates" />
  <img src="https://img.shields.io/badge/Platforms-Android_%7C_iOS-4E80EE?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="CI/CD" />
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture &amp; Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Over-The-Air (OTA) Updates](#-over-the-air-ota-updates)
- [Android Release APK Build](#-android-release-apk-build)
- [Documentation Index](#-documentation-index)

---

## 🌟 Overview

**Puku AI Mobile** (`com.pukuai`) is a cross-platform React Native client meticulously engineered to bring the authentic, distraction-free **Puku Web** experience to mobile devices. It combines a retro computer aesthetic with advanced LLM orchestration, private ephemeral chats, project workspace knowledge, and desktop agent pairing.

---

## ⚡ Key Features

| Feature                                     | Description                                                                                                                                               |
| :------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-Model AI Chat**               | Real-time chat powered by`puku-ai-2.8` (Fast), `puku-ai-2.7` (Fast), and `opus-4.8` (Deep Reasoning) with streaming tokens and thinking indicators. |
| **Puku Bot (v1 API)**                | Unrestricted AI assistant with live SSE turn streaming, server-side tool execution, computer screen monitor & control, human-in-the-loop assistance/secret handoff, and PKCE OAuth. Modes: **🔥 Fun Mode**, **⚡ Fast Mode**, and **🧠 Deep Reason**. |
| **Incognito Chat**                    | Zero-persistence ephemeral chat mode for sensitive or temporary queries.                                                                                  |
| **Projects & Custom Instructions**    | Organize work into projects with persistent custom system prompts and attached knowledge items.                                                           |
| **Desktop Remote Session**            | Pair with your workstation running`puku-cli` via secure relay WebSocket and approve terminal commands on mobile.                                        |
| **Universal Soft-Keyboard Clearance** | Hardware-accelerated`useKeyboardHeight` hook ensuring input fields and modals never get buried beneath the Android/iOS virtual keyboard.                |
| **Retro Theme System**                | Cream (`#FAF7EE`) & Dark (`#151614`) colorways styled with monospaced Courier typography and custom SVG icons.                                        |
| **Dual Authentication**               | Google OAuth 2.0 with PKCE (RFC 7636) via in-app browser tabs, alongside direct Email/Password & Bearer Token authentication.                             |
| **Zero-Downtime EAS OTA Updates**     | Automatic Over-The-Air deployment directly to devices on every push to`main`.                                                                           |

---

## 🛠 Architecture & Tech Stack

- **Core**: React Native `0.87.1`, React `19.2.3`, TypeScript `6.0.3`
- **Native Frameworks**: Expo `57.0.25`, Expo Updates (`expo-updates`), New Architecture enabled
- **Authentication**: `react-native-inappbrowser-reborn` (Chrome Custom Tabs & Safari View Controller with PKCE S256)
- **State Management**: Centralized React Context (`AppContext.tsx`) with zero unnecessary third-party boilerplate
- **Persistence**: `@react-native-async-storage/async-storage` for tokens, active conversation state, and preferences
- **Vector Graphics**: `react-native-svg` with scalable icon component registry
- **Layout & Animations**: `react-native-safe-area-context` + Native `LayoutAnimation` hardware driver

---

## 📂 Project Structure

```text
puku-app-rn/
├── android/                   # Native Android Gradle configuration & Kotlin code
├── ios/                       # Native iOS Xcode workspace & CocoaPods
├── assets/                    # App icons, splash screens, launch art
├── docs/                      # In-depth architectural & deployment guides
│   ├── ARCHITECTURE.md        # State management, navigation & component design
│   ├── OTA_UPDATES.md         # EAS Over-The-Air updates configuration
│   └── API_AND_AUTH.md        # OAuth PKCE flow, endpoints & WebSocket relay
├── src/
│   ├── assets/                # In-app SVGs and retro computer illustrations
│   ├── components/
│   │   ├── common/            # Header, Sidebar Drawer, Universal Icon library
│   │   ├── puku-ui/           # Headless and theme-styled Puku design system
│   │   └── ui/                # UI primitives (Buttons, Inputs, Cards, Modals)
│   ├── config/                # Environment variables (env.ts)
│   ├── features/              # Feature screen modules
│   │   ├── chat/              # Main chat, message bubbles, composer dropdown
│   │   ├── puku_bot/          # Unrestricted bot assistant
│   │   ├── projects/          # Projects & knowledge management
│   │   ├── login/             # Retro cream welcome & OAuth modals
│   │   ├── remote_session/    # Desktop pairing & tool approvals
│   │   └── settings/          # Profile, usage metrics & custom tokens
│   ├── services/              # API client, token storage & OTA updates
│   ├── store/                 # Global AppContext store
│   ├── theme/                 # Cream / Dark theme color tokens
│   └── utils/                 # Auth utils, date formatters, useKeyboardHeight
├── app.json                   # Expo & EAS configuration
├── eas.json                   # EAS build & update profiles
└── package.json               # Dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `>= 22.11.0`
- **Package Manager**: `npm`
- **Android**: JDK 17+, Android SDK 34, NDK 26+
- **iOS**: macOS, Xcode 15+, CocoaPods 1.15+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/puku-app/puku-app-rn.git
cd puku-app-rn

# 2. Install dependencies
npm install
```

### Running on Android

```bash
# Start Metro bundler:
npm start

# In a separate terminal, launch Android app:
npm run android
```

### Running on iOS

```bash
# Install CocoaPods (first time only):
cd ios && bundle exec pod install && cd ..

# Launch iOS Simulator:
npm run ios
```

---

## 📜 Available Scripts

| Command                    | Description                                                                   |
| :------------------------- | :---------------------------------------------------------------------------- |
| `npm start`              | Starts the Metro development bundler with cache reset options                 |
| `npm run android`        | Builds and deploys the debug build to a connected Android device              |
| `npm run ios`            | Builds and deploys the debug build to the iOS Simulator                       |
| `npm test`               | Runs the Jest unit test suite (41 unit tests)                                 |
| `npm run type-check`     | Runs`tsc --noEmit` to verify 100% TypeScript type safety                    |
| `npm run bundle:android` | Generates offline production JS bundle for Android (`index.android.bundle`) |
| `npm run bundle:ios`     | Generates offline production JS bundle for iOS (`main.jsbundle`)            |
| `npm run build:android`  | Bundles assets and executes`./gradlew assembleRelease`                      |

---

## 🔄 Over-The-Air (OTA) Updates

Puku AI is configured with **EAS Updates** on channel `main`.

Whenever code is merged or pushed to the `main` branch, the GitHub Actions workflow `.github/workflows/eas-update.yml` automatically bundles and publishes the update to the Expo cloud. User devices receive the new version instantly on cold boot or background refresh without reinstalling the APK.

For full setup and troubleshooting, refer to [**docs/OTA_UPDATES.md**](<file:///home/iftakhar/Poridhi/puku%20ai/docs/OTA_UPDATES.md>).

---

## 📦 Android Release APK Build

To compile a production standalone APK:

```bash
# 1. Build offline Android bundle
npm run bundle:android

# 2. Compile release APK (ARM64 optimal for modern phones)
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
cd ..

# Output is located at:
# android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

For more details on Android architecture, signing, and permissions, see [**android/README.md**](<file:///home/iftakhar/Poridhi/puku%20ai/android/README.md>).

---

## 📚 Documentation Index

- [**System Architecture & Components**](<file:///home/iftakhar/Poridhi/puku%20ai/docs/ARCHITECTURE.md>) — State management, keyboard avoidance engine, routing, and UI design tokens.
- [**Over-The-Air (OTA) Updates Guide**](<file:///home/iftakhar/Poridhi/puku%20ai/docs/OTA_UPDATES.md>) — EAS configuration, GitHub Actions workflow, and device update lifecycles.
- [**API, Authentication & Desktop Relay**](<file:///home/iftakhar/Poridhi/puku%20ai/docs/API_AND_AUTH.md>) — OAuth PKCE protocol, session tokens, and desktop command-line pairing.
- [**Android Native Guide**](<file:///home/iftakhar/Poridhi/puku%20ai/android/README.md>) — Gradle build commands, APK generation, and soft-keyboard IME handling.
- [**iOS Native Guide**](<file:///home/iftakhar/Poridhi/puku%20ai/ios/README.md>) — CocoaPods setup, URL schemes, and Simulator execution.
