# Puku AI Mobile — Services & State Architecture

This document details the state management patterns, backend API communication layers, persistent storage, and native module bridges in **Puku AI Mobile**.

---

## 1. Global State Management

Global state is managed via React Context providers located in `src/store/`:

### 1.1 `AppContext` (`src/store/AppContext.tsx`)
The central state container providing app-wide data and UI state:
- **Authentication:** Current user session, guest state, and sign-out handlers.
- **Theme & Appearance:** Active theme (`light` | `dark`), dynamic palette variables, and monospace font selection.
- **Navigation State:** Active screen tracking (`chat`, `puku_bot`, `chats`, `code`, `settings`), drawer open/close toggle, and modal states.
- **Bot State:** `selectedBotId`, `availableBots`, active conversation tracking, and unread conversation indicators.
- **Conversation Cache:** Cached conversations synced to `AsyncStorage`.

### 1.2 `RemoteSessionContext` (`src/store/RemoteSessionContext.tsx`)
Manages the WebSocket relay connection with desktop instances:
- **Connection Lifecycle:** `disconnected`, `connecting`, `connected`, `error`.
- **Relay Reducer:** Dispatches incoming socket packets into terminal lines, screen screenshots, or pending tool approval requests.
- **Approval Actions:** Provides `approveToolCall` and `rejectToolCall` dispatch functions.

---

## 2. API Clients & Networking

### 2.1 Main API Client (`src/services/api.ts`)
Handles standard conversational AI interactions with `https://app.puku.sh`:
- **Chat Streaming:** Server-Sent Events (SSE) streaming with partial delta chunks.
- **Model Metadata:** Fetches available models, token limits, and reasoning capabilities.
- **User Management:** Profile updates, usage metrics, and subscription data.

### 2.2 Puku Bot API Client (`src/services/pukuBotApi.ts`)
Interacts with the autonomous agent backend at `https://app.bot.puku.sh`:
- **Turn Execution:** `startTurn`, `stopTurn`, `getTurnStream`.
- **Conversations:** CRUD operations on bot conversations with pin and unread states.
- **Memory & Routines:** Memory item storage and scheduled agent routines.
- **Secret Submissions:** Submits sensitive values for human-in-the-loop prompts (`sendComputerSecret`).
- **Resilience:** Integrates automatic exponential backoff retry and zero-notice fallback to the core Puku AI engine on network or auth discrepancies.

---

## 3. Token Management & Storage

### 3.1 Token Manager (`src/services/tokenManager.ts`)
- **Synchronous Access:** `getAccessTokenSync()` enables immediate header injection without waiting for asynchronous storage lookups.
- **Token Refresh:** Intercepts 401 responses, performs transparent token refreshes, and updates storage.
- **Session Purge:** Cleanly clears all tokens upon user sign-out.

### 3.2 Secure Storage (`src/services/secureStorage.ts`)
- Wraps `expo-secure-store` for hardware-backed encryption of sensitive keys (access tokens, refresh tokens, encryption secrets).
- In-memory cache layer prevents repeated slow disk I/O operations.

---

## 4. Native Platform Bridges (`src/services/nativeModules.ts`)

Provides unified TypeScript interfaces across Android and iOS for platform capabilities:
- **`NativeClipboard`:** Read and write system clipboard strings with fallback support.
- **`NativePicker`:** Invokes native photo library or document picker dialogs.
- **`NativeSpeech`:** Native text-to-speech (TTS) and speech recognition engines.
- **`NativeBrowser`:** Launches secure in-app browser tabs (`react-native-inappbrowser-reborn`) for OAuth flows.

---

## 5. Offline Outbox (`src/services/pukuBotOutbox.ts`)

Provides resilient offline messaging capabilities:
- Persists unsent messages to local storage under `puku_bot_outbox_queue`.
- Subscribes to network connectivity events via `addConnectivityListener`.
- When network connectivity is re-established, the queue is processed sequentially, updating UI message states from pending to delivered.
