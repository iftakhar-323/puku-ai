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

---

## 6. Observability & Telemetry (Sentry & Langfuse)

### 6.1 Crash Reporting & Error Tracking (Sentry)
- **SDK:** `@sentry/react-native` initialized in `App.tsx` via `src/config/sentryConfig.ts`.
- **DSN Configuration:** Centralized in `src/config/env.ts` with multi-environment support (`.env.dev`, `.env.prod`, `.env.qa`).
- **Telemetry Boundaries:**
  - `src/utils/devLog.ts`: `devWarn` attaches Sentry breadcrumbs; `captureError` and `ignore` record exceptions with tagged features (`puku_bot`, `chat`, `auth`, `remote_session`).
  - `src/features/login/LoginScreen.tsx`: Captures OAuth token exchange failures, PKCE browser launch failures, and email authentication errors.
  - `src/store/RemoteSessionContext.tsx`: Captures WebSocket connection anomalies and abnormal relay disconnections.
  - `src/features/puku_bot/PukuBotScreen.tsx`: Captures server stream timeout fallbacks, tool invocation failures, and client errors.

### 6.2 LLM Observability & Evaluation (Langfuse)
- **Engine Client:** `src/services/langfuse.ts` provides a zero-dependency, non-blocking React Native client interacting directly with the Langfuse Ingestion API (`POST /api/public/ingestion`).
- **Credentials:** `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` (`https://cloud.langfuse.com`).
- **Traced Generations:**
  - **Main AI Chat (`src/store/AppContext.tsx`):** Traces `chat-generation-incognito` and `chat-generation-persistent` with input prompts, completions, latency timestamps, user identifiers, and model parameters.
  - **Puku Bot (`src/features/puku_bot/PukuBotScreen.tsx`):** Traces server turns (`puku-bot-turn`), intelligent fallback generations (`puku-bot-fallback-generation`), and failures with full tool invocation metadata.

