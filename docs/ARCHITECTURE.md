# Puku AI Mobile — Architecture & System Design

This document details the architectural design, component hierarchy, state flow, and native integrations powering the **Puku AI** cross-platform mobile application.

---

## 1. High-Level Architecture Overview

```mermaid
graph TD
    App[App.tsx / ErrorBoundary] --> AppProvider[AppContext Provider]
    AppProvider --> NavigationRouter[Root Navigation Router]
    
    subgraph Navigation & Screens
        NavigationRouter --> LoginScreen[LoginScreen - Auth / Welcome]
        NavigationRouter --> ChatScreen[ChatScreen - Multi-Model AI Chat]
        NavigationRouter --> PukuBotScreen[PukuBotScreen - Unrestricted Bot]
        NavigationRouter --> ChatsScreen[ChatsScreen - Conversation History]
        NavigationRouter --> ProjectsScreen[ProjectsScreen - Knowledge / Custom Prompts]
        NavigationRouter --> ProjectDetailsScreen[ProjectDetailsScreen]
        NavigationRouter --> RemoteSessionScreen[RemoteSessionScreen - Desktop Relay]
        NavigationRouter --> SettingsScreen[SettingsScreen / UsageScreen]
    end

    subgraph Core Services
        AppProvider --> pukuApi[Puku API Client]
        AppProvider --> tokenManager[Token Manager - Secure Cache]
        AppProvider --> updateService[EAS Updates Service]
    end

    subgraph Native Integrations
        ChatScreen --> KeyboardHook[useKeyboardHeight - IME Engine]
        LoginScreen --> InAppBrowser[react-native-inappbrowser-reborn]
        AppProvider --> AsyncStorage[@react-native-async-storage]
    end
```

---

## 2. Directory Structure

```text
puku-app-rn/
├── android/                   # Native Android project (Gradle, Kotlin/Java, C++ TurboModules)
├── ios/                       # Native iOS project (Xcode workspace, Podfile)
├── assets/                    # Static assets, launch screen, app icons
├── docs/                      # Technical documentation
│   ├── ARCHITECTURE.md        # Architecture & component system (this file)
│   ├── OTA_UPDATES.md         # EAS OTA updates deployment guide
│   └── API_AND_AUTH.md        # API endpoints, OAuth PKCE & WebSocket relay
├── src/
│   ├── assets/                # In-app SVGs and high-resolution retro computer graphics
│   ├── components/
│   │   ├── common/            # AppHeader, AppDrawer (Sidebar), Universal Icons
│   │   ├── puku-ui/           # Headless & styled Puku UI component system
│   │   └── ui/                # Base primitives (Button, Input, Card, Modal, Switch)
│   ├── config/                # Environment variables & endpoints (env.ts)
│   ├── features/              # Feature-driven screen modules
│   │   ├── artifacts/         # Artifact explorer & code visualizer
│   │   ├── chat/              # Main chat screen, composer, bubble renderers
│   │   ├── chats/             # Chat list & thought search
│   │   ├── code/              # Interactive code / terminal execution
│   │   ├── live_voice/        # Real-time voice interaction
│   │   ├── login/             # Retro cream welcome screen & OAuth modals
│   │   ├── projects/          # Projects, custom instructions, knowledge attachment
│   │   ├── puku_bot/          # Puku bot (Fun, Fast, Deep reasoning modes)
│   │   ├── remote_session/    # Desktop pairing & tool confirmation
│   │   ├── settings/          # Settings, profile, usage metrics
│   │   └── transcribe/        # Voice-to-text transcription
│   ├── services/              # API client, token management, native modules
│   ├── store/                 # Global AppContext state provider
│   ├── theme/                 # Dark / Light theme tokens, color palettes
│   ├── types/                 # Shared TypeScript interfaces & types
│   └── utils/                 # Auth helpers, date formatters, keyboard hook
├── app.json                   # Expo & EAS configuration
├── eas.json                   # EAS build & update profiles
├── metro.config.js            # Metro bundler config
└── package.json               # Dependencies & scripts
```

---

## 3. Global State Management (`AppContext.tsx`)

The app avoids external boilerplate state stores (Redux, Zustand) in favor of a centralized, highly optimized React Context:

- **Authentication State**: Active session, bearer token, user email, profile name, subscription plan.
- **Conversation State**: List of active/archived chats, selected conversation ID, streaming status (`isGenerating`), abort controller.
- **Incognito State**: Ephemeral session storage (`incognitoMessages`), zero-trace chat mode.
- **Model Selection**: Currently active model (`puku-ai-2.8`, `puku-ai-2.7`, `opus-4.8`).
- **Project State**: Active projects, associated custom instructions, attached knowledge files.
- **Remote Pairing State**: Pairing connection status, session ID, tool call prompts.
- **Theme & UI Preferences**: Dynamic light/dark theme switching, drawer open/close state.

---

## 4. Universal Soft-Keyboard Handling (`useKeyboardHeight.ts`)

### Problem Solved
On modern Android (Android 11–15, Samsung One UI 6+ with gesture navigation and edge-to-edge decor views), standard `windowSoftInputMode="adjustResize"` and React Native `KeyboardAvoidingView` with `behavior={undefined}` fail to resize the screen container. Bottom-pinned composers and modal dialogs get buried underneath the virtual keyboard.

### Solution Architecture
1. **Event Listening**:
   - Listens concurrently to `keyboardDidShow`, `keyboardDidHide`, `keyboardWillShow`, and `keyboardWillHide`.
2. **Dynamic Height Calculation**:
   - Reads exact `endCoordinates.height` in real-time.
3. **Hardware Animation Execution**:
   - Invokes `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` on Android before state updates for smooth, 60 FPS transitions matching native IME movements.
4. **Clean Offsets**:
   - Bottom padding dynamically expands by `keyboardHeight`, lifting composers, form inputs, and bottom sheets directly above the keyboard.

---

## 5. Styling & Design Tokens

- **Font Philosophy**: Authentic desktop terminal aesthetics using monospaced fonts (`Platform.OS === 'ios' ? 'Courier' : 'monospace'`) for headings, code snippets, buttons, and badges.
- **Color Palette**:
  - **Cream Theme**: `#FAF7EE` (Primary background), `#FFFFFF` (Card background), `#E5E2D8` (Border).
  - **Dark Theme**: `#151614` (Deep background), `#1E201D` (Secondary container), `#2A2D28` (Border).
  - **Accent Colors**: `#5B53DE` (Indigo primary), `#35D6B4` (Bot accent green), `#FFB340` (Amber warning).
