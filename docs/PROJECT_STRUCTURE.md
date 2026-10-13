# Puku AI Mobile — Project Structure & File Guide

This document provides an exhaustive reference of the directory hierarchy and source files comprising the **Puku AI** mobile repository.

---

## 1. High-Level Directory Overview

```text
puku-app-rn/
├── .github/workflows/          # Continuous Integration & Delivery automation
├── android/                    # Android native project (Gradle, Kotlin/Java, assets)
├── ios/                        # iOS native project (Xcode workspace, Podfile, native delegates)
├── assets/                     # App launcher icons, splash screen assets, fonts
├── docs/                       # Project documentation, architecture guides, and API specs
├── src/                        # Main React Native TypeScript codebase
│   ├── assets/                 # Vector artwork, retro illustrations
│   ├── components/             # Reusable UI components & icon library
│   ├── config/                 # Environment variables and API URLs
│   ├── features/               # Screen features & domain-driven modules
│   ├── i18n/                   # Internationalization translations (English, Bengali, etc.)
│   ├── services/               # REST clients, native bridges, auth, storage, outbox
│   ├── store/                  # React Contexts (AppContext, RemoteSessionContext)
│   ├── types/                  # TypeScript interface definitions
│   └── utils/                  # Helper utilities (date, network, markdown, keyboard)
├── __tests__/                  # Jest unit and integration test suites
├── App.tsx                     # Top-level application bootstrap and provider tree
├── app.json                    # Expo / React Native project metadata & app configuration
├── eas.json                    # Expo Application Services build & OTA release configuration
├── index.js                    # Metro runtime entrypoint
├── package.json                # Project dependencies, scripts, and package metadata
└── tsconfig.json               # TypeScript compiler configuration
```

---

## 2. Exhaustive Directory Breakdown

### 2.1 Root Configuration Files

| File | Purpose |
| :--- | :--- |
| `App.tsx` | Root component that mounts `SafeAreaProvider`, `ErrorBoundary`, `AppProvider`, `RemoteSessionProvider`, and the active screen router. |
| `index.js` | Metro entrypoint registering `App` via `AppRegistry.registerComponent`. |
| `package.json` | Project dependencies (React Native, SVG, InAppBrowser, Expo modules), build scripts, and test definitions. |
| `tsconfig.json` | Strict TypeScript configuration with JSX set to `react-native` and path aliases. |
| `app.json` | Core app configuration: bundle identifiers (`com.pukuai`), versioning, permissions, and plugin hooks. |
| `eas.json` | EAS Build & Update profiles (`development`, `preview`, `production`) specifying release channels and update policies. |
| `metro.config.js` | Metro bundler configuration with SVG transformer integration. |
| `babel.config.js` | Babel preset configuration for React Native and Reanimated. |
| `jest.config.js` | Jest test runner setup, preset configuration, and module mocks. |

---

### 2.2 Continuous Integration & Workflows (`.github/workflows/`)

| File | Purpose |
| :--- | :--- |
| `android-release.yml` | Builds release APKs and Android App Bundles (AAB) using Gradle, signs artifacts, and uploads build outputs. |
| `eas-ota.yml` | Deploys Over-The-Air JavaScript updates to active channels via EAS Update. |
| `ios-build.yml` | Builds and signs iOS `.ipa` releases using Fastlane and Xcode. |
| `test.yml` | Executes linting, type-checking (`tsc --noEmit`), and all 180 Jest tests. |
| `e2e-maestro.yml` | Executes automated end-to-end user journey tests using Maestro. |

---

### 2.3 Feature Modules (`src/features/`)

Puku AI is organized into feature-driven directories:

```text
src/features/
├── artifacts/                  # Visualizer for code snippets and rich artifacts
│   └── ArtifactsScreen.tsx
├── chat/                       # Multi-Model AI Chat interface
│   ├── ChatScreen.tsx          # Main conversational AI screen
│   └── components/
│       ├── ChatBubble.tsx      # User/assistant bubble wrapper
│       ├── ChatComposer.tsx    # Message input, voice trigger, attachment picker
│       ├── ChatEmptyState.tsx  # Dynamic greeting and suggestion pills
│       ├── ChatModelPickerModal.tsx # Model switcher (Gemini, Claude, GPT, DeepSeek)
│       ├── MarkdownRenderer.tsx # High-performance markdown and syntax highlighter
│       ├── MessageBubble.tsx   # Message card with actions (copy, share, edit)
│       └── TypingIndicator.tsx # Animated pulsing dots
├── chats/                      # Conversation History and search
│   └── ChatsScreen.tsx         # Searchable list of past conversations with pin/delete
├── code/                       # Interactive Code Screen
│   └── CodeScreen.tsx          # Code sandbox & terminal environment
├── live_voice/                 # Voice Mode
│   └── LiveVoiceScreen.tsx     # Fullscreen voice interaction with audio visualizer
├── login/                      # Authentication
│   └── LoginScreen.tsx         # OAuth login, Google sign-in, and guest onboarding
├── projects/                   # Custom Knowledge & Project Workspaces
│   ├── ProjectDetailsScreen.tsx# Manage instructions and files for a project
│   └── ProjectsScreen.tsx      # Project cards overview
├── puku_bot/                   # Autonomous Puku Bot & Agents (Modular Split)
│   ├── PukuBotComposer.tsx     # Input box, /skills menu, attachments, stop stream
│   ├── PukuBotHeader.tsx       # Top navigation bar, bot switcher badge, remote session live dot
│   ├── PukuBotHomeView.tsx     # Empty state retro computer view & recent conversations
│   ├── PukuBotMessageItem.tsx  # Bubble renderer, tool indicator, reasoning traces accordion
│   ├── PukuBotScreen.tsx       # Screen state coordinator, streaming pipeline, auth fallback
│   ├── PukuBotSelectModal.tsx  # Quick modal to switch between active bots
│   ├── PukuBotSettingsModal.tsx# Tabbed configuration: Profile, Instructions, Memory, Routines, Skills, Accounts
│   ├── PukuBotWorkspaceSheet.tsx# Drawer sheet for Agents & Community Marketplace
│   └── pukuBotStyles.ts        # Comprehensive design stylesheet shared across bot components
├── remote_session/             # Desktop Terminal & Screen Relay
│   ├── RemoteSessionScreen.tsx # Live terminal, screen mirror, tool approval card
│   └── relay/                  # Relay socket reducer and event contracts
│       ├── protocol.ts         # Binary/JSON relay protocol message types
│       └── remoteSessionReducer.ts # State machine for connection, stream, and approval
├── settings/                   # User Preferences & Account
│   ├── AccountScreen.tsx       # User account details and profile picture
│   ├── SettingsScreen.tsx      # Theme toggle (Light/Dark), font selection, language
│   └── UsageScreen.tsx         # Token consumption and model quota meters
└── transcribe/                 # Speech-to-Text Transcriber
    └── TranscribeScreen.tsx    # Audio recording, real-time speech transcription
```

---

### 2.4 Reusable Components (`src/components/`)

```text
src/components/
├── common/
│   ├── AppDrawer.tsx           # Primary hamburger drawer with navigation links
│   ├── AppHeader.tsx           # Standardized top header bar
│   ├── ChatSourcesBar.tsx      # Web source citations pill bar (URL, favicon, title)
│   ├── Icons.tsx               # Curated SVG icons (Bot, Sparkle, Sidebar, Terminal, etc.)
│   ├── MediaPickerModal.tsx    # Native camera / file attachment bottom sheet
│   ├── RetroComputerIllustration.tsx # Pixel-perfect retro desktop artwork
│   └── ShareModal.tsx          # Share conversation dialog
├── puku-ui/                    # Themed design components
└── ui/                         # Raw primitives (Button, Input, Card, Modal, Switch)
```

---

### 2.5 Services & Native Bridges (`src/services/`)

| File | Purpose |
| :--- | :--- |
| `api.ts` | Main Puku AI backend client (chat streaming, models list, user profile, account management). |
| `pukuBotApi.ts` | Puku Bot autonomous agent API client (sessions, conversations, turns, memories, skills, routines, secret injection). |
| `pukuBotOutbox.ts` | Offline persistent outbox queue with automatic retry when network connectivity restores. |
| `tokenManager.ts` | Secure token storage, sync getters, refresh lifecycle, and session invalidation. |
| `secureStorage.ts` | Encrypted storage abstraction utilizing `expo-secure-store` with memory caching fallback. |
| `nativeModules.ts` | Cross-platform bridge for native capabilities (Clipboard, File Picker, Camera, Speech). |
| `updates.ts` | EAS Update manager checking for remote JS bundles and applying runtime updates. |

---

### 2.6 Global State Store (`src/store/`)

| File | Purpose |
| :--- | :--- |
| `AppContext.tsx` | Central state container managing user session, theme mode (Light/Dark/System), active conversations, drawer state, and global preferences. |
| `RemoteSessionContext.tsx` | WebSocket relay manager for pairing with desktop sessions, streaming remote terminal commands, and dispatching approvals. |

---

### 2.7 Utilities (`src/utils/`)

| File | Purpose |
| :--- | :--- |
| `connectivity.ts` | NetInfo wrapper providing online status checking and network connectivity change listeners. |
| `date.ts` | Formats ISO timestamps into relative timestamps (`Just now`, `5m ago`, `Yesterday`). |
| `devLog.ts` | Safe conditional logging utility avoiding console spam in production builds. |
| `sourceExtractor.ts` | Parses assistant text and tool call results to extract clean source citations and URLs. |
| `useKeyboardHeight.ts` | Custom hook calculating accurate keyboard height across both iOS and Android. |
