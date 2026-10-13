# Puku AI Mobile — Documentation Index

Welcome to the comprehensive technical documentation for **Puku AI Mobile** (`puku-app-rn`). This folder contains detailed design specifications, architectural breakdowns, directory structures, and setup guides for developers and contributors.

---

## 📚 Documentation Catalog

| Document | Description |
| :--- | :--- |
| **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** | **Exhaustive repository directory tree**, detailing the purpose of every folder and source file across `src/`, `android/`, `ios/`, and `.github/`. |
| **[PUKU_BOT_ARCHITECTURE.md](./PUKU_BOT_ARCHITECTURE.md)** | **Detailed Puku Bot architecture**, explaining the modular split components (`PukuBotScreen`, `PukuBotHeader`, `PukuBotHomeView`, `PukuBotMessageItem`, `PukuBotComposer`, `PukuBotSettingsModal`, `PukuBotSelectModal`), authentication isolation, tool calling, reasoning accordion, and offline queue. |
| **[FEATURES_AND_MODULES.md](./FEATURES_AND_MODULES.md)** | **Feature-by-feature breakdown** covering Multi-Model AI Chat, Remote Session terminal relay, Transcribe/STT, Artifacts explorer, Projects & Knowledge, and Authentication. |
| **[SERVICES_AND_STATE.md](./SERVICES_AND_STATE.md)** | **Global State & Service Layer**, covering `AppContext`, `RemoteSessionContext`, `pukuApi`, `pukuBotApi`, `tokenManager`, and cross-platform `nativeModules`. |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | High-level system design, state flow diagrams, and Flutter parity mapping. |
| **[API_AND_AUTH.md](./API_AND_AUTH.md)** | HTTP endpoints, Google/Email OAuth PKCE authentication, and WebSocket relay protocol specification. |
| **[FLUTTER_PARITY_GAPS.md](./FLUTTER_PARITY_GAPS.md)** | Design parity audit between Flutter reference app and React Native implementation. |
| **[OTA_UPDATES.md](./OTA_UPDATES.md)** | EAS Over-The-Air (OTA) update configuration, channels, and runtime policies. |
| **[IOS_ENV_SETUP.md](./IOS_ENV_SETUP.md)** | iOS developer environment setup, CocoaPods dependencies, and Xcode build instructions. |

---

## 🚀 Quick Navigation by Topic

### 🤖 Puku Bot & Autonomous Agents
- Component structure & split: [PUKU_BOT_ARCHITECTURE.md#component-split-architecture](./PUKU_BOT_ARCHITECTURE.md#component-split-architecture)
- Auth & zero-notice fallback: [PUKU_BOT_ARCHITECTURE.md#authentication--session-isolation](./PUKU_BOT_ARCHITECTURE.md#authentication--session-isolation)
- Tool calling & Execution parsing: [PUKU_BOT_ARCHITECTURE.md#tool-calling--execution-indicators](./PUKU_BOT_ARCHITECTURE.md#tool-calling--execution-indicators)
- Offline outbox sync: [PUKU_BOT_ARCHITECTURE.md#offline-outbox-synchronization](./PUKU_BOT_ARCHITECTURE.md#offline-outbox-synchronization)

### 💻 Code & Desktop Terminal Relay
- Protocol definition: [API_AND_AUTH.md#websocket-remote-session-protocol](./API_AND_AUTH.md#websocket-remote-session-protocol)
- Reducer & UI: [FEATURES_AND_MODULES.md#3-remote-session--desktop-code-relay](./FEATURES_AND_MODULES.md#3-remote-session--desktop-code-relay)

### 📁 Project Architecture & File Hierarchy
- Complete file tree: [PROJECT_STRUCTURE.md#full-directory-tree](./PROJECT_STRUCTURE.md#full-directory-tree)
- State management flow: [SERVICES_AND_STATE.md#1-react-context-architecture](./SERVICES_AND_STATE.md#1-react-context-architecture)

