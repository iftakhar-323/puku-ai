# Puku AI Mobile — Features & Screen Modules

This document details each primary user-facing feature and screen module implemented in the **Puku AI** mobile application.

---

## 1. Multi-Model AI Chat (`src/features/chat/`)

### Overview
The primary conversational AI interface offering seamless interaction with state-of-the-art LLMs (Gemini 2.5, Claude 3.5 Sonnet, GPT-4o, DeepSeek R1).

### Key Features
- **Model Switching:** Instant switching via `ChatModelPickerModal` with token quota and reasoning badge indicators.
- **Rich Markdown:** High-performance rendering of code blocks, tables, math equations, and clickable hyperlinks via `MarkdownRenderer`.
- **Web Citations & Sources:** Automatic extraction of web sources and search queries displayed in an interactive pill bar (`ChatSourcesBar`).
- **File & Image Attachments:** Upload photos or documents directly from camera, photo library, or file system via `MediaPickerModal`.
- **Message Actions:** One-tap copy, message editing, regeneration, and sharing.

---

## 2. Puku Bot & Autonomous Agents (`src/features/puku_bot/`)

### Overview
An autonomous, unrestricted agent environment that executes complex, multi-step actions across web browsing, coding, and screen control.

### Key Features
- **Autonomous Bots:** Switch between *General Assistant*, *Coder Bot*, and *Computer Operator*.
- **Skill Execution:** Type `/` in the composer to access skills (e.g. `/web-search`, `/code-interpreter`, `/github-sync`).
- **Real-Time Tool Feedback:** Live progress pills indicating tool status (`pending`, `executing`, `completed`) with expandable result cards.
- **Reasoning Accordion:** Internal model thought traces are isolated in an interactive, collapsible accordion.
- **Human-in-the-Loop Prompts:** Secure password / OTP prompt (`needs_person: secret`) or web handover (`needs_person: help`) when human verification is required.
- **Offline Outbox:** Messages composed without internet connectivity are queued and dispatched automatically upon reconnection.

---

## 3. Remote Session & Desktop Code Relay (`src/features/remote_session/`)

### Overview
Connects the mobile device to a running desktop agent session via an encrypted WebSocket relay.

### Key Features
- **Pairing Protocol:** One-step QR code scan or pairing code entry.
- **Interactive Terminal:** Streams live bash/zsh stdout and stderr with ANSI color support.
- **Screen Mirroring:** View low-latency screen screenshots captured by the desktop agent.
- **Action Approval Cards:** Interactive authorization cards allowing the user to approve or deny sensitive shell commands or file edits.

---

## 4. Transcribe & Voice Input (`src/features/transcribe/` & `src/features/live_voice/`)

### Overview
Converts spoken audio into clean, formatted text transcripts and enables full-duplex live voice conversations.

### Key Features
- **Real-Time Speech-to-Text:** Live waveform visualizer and streaming transcription.
- **Clipboard & Export:** Copy transcripts directly to clipboard or send them straight into an active AI chat.
- **Live Voice Interaction:** Hands-free conversational mode with low-latency audio streaming.

---

## 5. Artifacts Explorer (`src/features/artifacts/`)

### Overview
A dedicated visualizer and management center for documents, code files, HTML widgets, and diagrams generated during conversations.

### Key Features
- **Code Highlighting:** Syntax-highlighted viewer for TypeScript, Python, HTML/CSS, JSON, and Markdown.
- **Quick Export:** Copy code, save files locally, or share with external applications.

---

## 6. Projects & Custom Knowledge (`src/features/projects/`)

### Overview
Organize conversations into persistent project workspaces with specialized instructions and attached knowledge files.

### Key Features
- **Custom System Instructions:** Define project-specific personas and rules.
- **Knowledge Attachment:** Attach context documents (PDF, TXT, MD) that are referenced across all project chats.

---

## 7. User Preferences & Settings (`src/features/settings/`)

### Overview
Comprehensive settings center to customize the app appearance, developer options, and account details.

### Key Features
- **Theme Engine:** Instant switching between Dark Mode, Light Mode, and System Theme with retro-styled color palettes.
- **Font Selection:** Toggle between standard system typography and monospace programming fonts.
- **Language Localization:** Multi-language support (English, Bengali) via `react-i18next`.
- **Usage & Quotas:** Token usage meters and subscription tier management.
