# Flutter → React Native Parity Gaps

This document lists concrete capabilities that exist in the original Flutter app
(`puku-app-flutter`, package `puku_app`) but are missing, partial, or stubbed in
this React Native rewrite (`puku ai`, `com.pukuai`). It was produced by reading
both codebases feature-by-feature, not from specs or memory, so it also calls out
places where a Flutter "feature" turned out to be a non-functional UI mock itself
— those aren't counted as real gaps below.

Legend: ✅ fully present in RN · 🟡 partial/weaker in RN · ❌ missing in RN

## Implementation status

Most of the gaps below have since been implemented on the
`feature/flutter-parity-improvements` branch:

- ✅ Syntax-highlighted + diff-colored code blocks in chat (`syntaxHighlight.ts`, `MarkdownRenderer.tsx`)
- ✅ Auto-persisting assistant code blocks as Artifacts (`utils/codeBlocks.ts`, `AppContext.sendMessage`)
- ✅ Real file/photo picker for Project "Add Content" + a cosmetic capacity bar
- ✅ `SettingsScreen` routing fix (was being shadowed by `ProfileScreen`)
- ✅ Sentry hardening: session replay, structured logs, failed-request capture, trace propagation, navigation breadcrumbs
- ✅ Remote session: Exit Plan Mode plans rendered as markdown + reject-with-feedback, colorized diff tool output
- ✅ i18n coverage expanded across Chats/Projects/Artifacts/Transcribe/Usage/Code/RemoteSession/PukuBot
- ✅ Android `puku://remote` deep link, iOS `pukubot://` scheme
- ✅ CI coverage-threshold gate, tag-triggered release workflow
- ✅ Removed the dead `puku-ui`/`cmdk`/`@base-ui/react` component library
- ✅ iOS `react-native-config` wiring — turned out to need no Xcode change at all: the installed version's podspec already declares the env-codegen script phase, auto-injected by `pod install`. Corrected the misleading comment in `env.ts` and rewrote `docs/IOS_ENV_SETUP.md`; still only verifiable by an actual `pod install` + build on macOS, which isn't available here
- ✅ `AskUserQuestion` now a paginated wizard (one question per page, Back/Next/Submit) instead of all questions in one scroll
- ✅ Ported Flutter's `SmartOutputView` (JSON/XML/key-value auto-detection with humanized labels and status coloring) for remote-session tool output
- ⏭️ Not replicated (confirmed non-functional on the Flutter side too): fake thinking/tool-use blocks in main chat, the Live Voice Chat mock, the "New Code Session" composer mock, the "research" toggle, and the Projects Power/Shared/Archived scope tabs (no backend scope field exists in either app)

---

## 1. Chat message rendering

| Capability | Flutter | RN (puku ai) |
|---|---|---|
| Code block syntax highlighting | ✅ Real tokenized/colorized highlighting via the `highlight` package (`chat_markdown_syntax_highlighter.dart`) | 🟡 Plain monospace text with just an uppercase language badge — no token coloring (`MarkdownRenderer.tsx`) |
| Diff/patch rendering | ✅ Dedicated colored diff view for ` ```diff ` / ` ```patch ` fences (+green/−red/@@ hunk headers) | ❌ Not implemented — diff fences render as a generic code block |
| "Smart output" fallback rendering (auto-detect JSON/XML/key-value, humanize field names, semantic color for status/exit-code) | ✅ Shared `SmartOutputView`, used in both chat and remote session | 🟡 Remote session has an expandable raw-JSON `ToolDetailSheet`, but no humanized/semantic auto-formatting; main chat has none |

> Correction: an earlier pass of this doc listed "thinking blocks" and
> "tool-use blocks in normal chat" as Flutter-only capabilities. On closer
> inspection this isn't real: `message_bubble.dart` has rendering code for
> `ChatMessageBlockEntity.thinking`/`toolUse`, but `chat_bloc.dart` never
> populates those block types for assistant messages — the
> `/v1/chat/conversations/:id/messages` endpoint (identical on both apps) only
> ever streams plain OpenAI-style `choices[0].delta.content` text, never
> structured blocks. It's dead/unreachable UI in Flutter too, not a real gap.

## 2. Artifacts

| Capability | Flutter | RN |
|---|---|---|
| Auto-creation of artifacts from chat | ✅ Every assistant reply is scanned for fenced code blocks and auto-persisted as a titled, language-tagged artifact (`_persistArtifactsFromMessage`) | ❌ `createArtifact()` exists in `AppContext` but is **never called anywhere** — the Artifacts screen is permanently empty for a real user |

Note: neither app actually renders HTML/SVG/live-preview artifacts — both only persist/display code-type text snippets, so that's parity, not a gap.

## 3. Projects

| Capability | Flutter | RN |
|---|---|---|
| "Add content" ingestion sheet | 🟡 Offers upload-from-device / take picture / choose image / "create document" options (wiring into a repository call wasn't confirmed, but the picker UI covers multiple real content types) | ❌ "Add Content" only lets the user type a filename string; hardcodes `type: 'DOC'` and a fake "256 KB" size — no real file/image picking at all |
| Capacity/usage indicator | ✅ `capacity_progress_bar.dart` shows project usage/at-capacity state | ❌ No equivalent in `ProjectsScreen`/`ProjectDetailsScreen` |
| Scope tabs (yours/power/shared/archived) | ❌ Confirmed non-functional: `ProjectDto.toEntity({scope = ProjectScope.yours})` is called from every site in `projects_repository_impl.dart` with no scope argument, so every project is always `.yours` — the backend has no scope field at all | ❌ Same — only "yours" ever has a data source. **Not a real gap**: both apps show the same 4 tabs but neither has backend support for anything but "yours", so there's nothing to replicate |

## 4. Code / Remote Session (CLI remote-control feature)

Both apps implement this as the same concept (pair a phone with a running Puku CLI
session over a QR code, then relay an agentic coding session over WebSocket), and
both are deep, so the gaps here are about sophistication, not absence:

| Capability | Flutter | RN |
|---|---|---|
| "Exit Plan Mode" flow | ✅ Dedicated card + dialog: renders the agent's plan as markdown, lets the user Approve (choosing an exit mode) or Reject with freeform feedback | 🟡 RN already has this (`PromptCard.tsx`'s `isExitPlanMode` branch — "Ready to start coding?" / Start Coding / Autopilot / Reject), just missed in the first pass since it's inline rather than a separate component. Real gap: the plan is shown as plain truncated text instead of rendered markdown, and "Reject" fires immediately with no feedback text box — even though `answerPrompt(allow, message?)` already supports sending one |
| `AskUserQuestion` multi-question flow | ✅ Multi-page wizard dialog — one question per page with Next/Back/Submit, single & multi-select | 🟡 `PromptCard` handles `AskUserQuestion` but as a single inline prompt, not a paged wizard |
| Inline file-diff rendering in the agent feed | ✅ Dedicated add/remove/hunk-header colored diff rows (`diff_line_row.dart`) | 🟡 Tool calls are grouped into collapsible summaries with an expandable JSON detail sheet, but no dedicated colored-diff renderer |
| "New session" composer (model/environment/GitHub/Figma pickers, suggested prompts) | 🟡 UI exists but is non-functional (submit does nothing, Connect GitHub/Figma have no handler) — real sessions only ever start via QR pairing | ❌ No equivalent screen at all — RN's `CodeScreen` only lists existing sessions + a "Direct Connect" session-ID/QR path |

RN's protocol implementation (`relay/protocol.ts`) is actually the best-tested code
in the RN repo (85–100% coverage) and appears to be a faithful, thorough port —
this section is about UI-layer polish, not protocol-level gaps.

## 5. Settings & Account

| Capability | Flutter | RN |
|---|---|---|
| Settings screen reachable from the app | 🟡 Reachable, but Billing/Usage/Capabilities/Permissions/Voice/Notifications/Shared-Links rows are all placeholder snackbars | ❌ **Worse: a fully-built `SettingsScreen.tsx` (699 lines) exists in the repo but the app router never renders it** — `App.tsx` maps both `settings` and `profile` routes to the much thinner `ProfileScreen` instead. This is a near-free fix: wire the existing screen into the router. |
| Theme switcher UI | ❌ `ThemeCubit` supports light/dark/system persistence under the hood, but no Settings row exposes it, and `getThemeData()` maps all 3 modes to the same dark theme anyway — single fixed dark theme in practice | 🟡 RN's orphaned `SettingsScreen` *does* have a working dark-theme `Switch`, but since that screen is unrouted, no theme switcher is reachable either. "System" theme mode is typed in RN (`AppSettings.themeMode`) but has no `useColorScheme()` reader anywhere — not implemented on either side. |
| Usage dashboard with real data | ❌ Placeholder snackbar only | 🟡 RN has a full `UsageScreen` UI (plan, billing period, token quotas, request history) but every field is hardcoded mock data — no backend integration either side |

## 6. Crash reporting / Observability (Sentry)

Both apps use Sentry, but Flutter's configuration is notably more complete:

| Capability | Flutter | RN |
|---|---|---|
| Session Replay | ✅ `replay.onErrorSampleRate: 1.0`, `replay.sessionSampleRate` 0.05–0.1 | ❌ Not configured |
| Structured logging (`enableLogs`) | ✅ | ❌ Not configured |
| Android ANR detection (`anrEnabled`) | ✅ | ❌ Not configured |
| Auto-capture failed HTTP requests | ✅ via `sentry_dio` integration | ❌ RN's API client doesn't report failed requests to Sentry automatically |
| Distributed tracing allowlist (`tracePropagationTargets`) | ✅ Explicit allowlist for backend hosts | ❌ Not configured |
| Automatic screen-transition breadcrumbs | ✅ `SentryNavigatorObserver` on the router | ❌ RN's custom string-based router has no equivalent instrumentation |
| Screenshot + view-hierarchy on crash | ✅ | ✅ (RN has `attachScreenshot`/`attachViewHierarchy` too — parity here) |

## 7. Localization

Both apps currently ship English only, but the underlying i18n groundwork differs a lot:

- Flutter: ~700 strings cataloged through a full ARB/codegen pipeline (`S.of(context).xyz`), essentially zero hardcoded UI strings.
- RN: `en.json` has ~126 keys, and per the code's own comment only `LoginScreen`/`LiveVoiceScreen` (and the orphaned `SettingsScreen`) consistently call `t()` — most other screens (Chats, Projects, Artifacts, Transcribe, Usage, Code, PukuBot, RemoteSession) use hardcoded English strings directly in JSX.

**Gap:** RN's i18n infrastructure exists but covers a much smaller fraction of the actual UI than Flutter's does, even though neither ships a second language yet.

## 8. CI/CD & release process

| Capability | Flutter | RN |
|---|---|---|
| Minimum code-coverage gate | ✅ CI fails below 59% line coverage | ❌ RN uploads coverage to Codecov but doesn't fail the build on low coverage (current RN coverage is ~25%) |
| Automated integration/E2E tests in CI | ✅ Runs `integration_test` on a real Android emulator (API 31) in CI | ❌ No E2E/Detox/Maestro tests; RN's only device-automation script (`scripts/run-argent-demo.sh`) is a manual, non-CI smoke script |
| Tag-triggered release pipeline | ✅ `release.yml` triggers on `v*.*.*` tags, builds signed APK + AppBundle, auto-creates a GitHub Release, and dispatches a webhook to an external `puku-mobile-automation` repo to run automated tests against the fresh build | ❌ RN's `android-build.yml` builds on every push to `main` (no tag trigger, no auto GitHub Release, no downstream test dispatch) |
| iOS per-flavor env config | ✅ Separate `Info-dev/qa/prod.plist` per flavor, 3 schemes-worth of icon sets | 🟡 iOS has one scheme reading a single `.env` (works automatically via the installed `react-native-config`'s podspec, no dev/qa/prod split) — see `docs/IOS_ENV_SETUP.md` for how to add that split if ever needed, same as Android's 3 flavors |

## 9. Misc

- **Image compression on attachment**: Flutter explicitly resizes picked images (max 2048px, 85% quality) before upload; this constraint wasn't found in RN's `NativePicker` flow.
- **Deep link to incoming remote session (`puku://remote`)**: handled in RN's JS `Linking` listener, but Android's manifest only registers intent-filters for `callback`-style hosts — a `puku://remote?...` link tapped from outside the app (QR rendered as a link, SMS, etc.) would not currently launch the app on Android.
- **`pukubot://` URL scheme**: registered on Android, missing from RN's iOS `Info.plist` — Puku Bot's OAuth callback likely can't complete on iOS.

---

## Where RN is actually ahead of Flutter (for context, not gaps)

To keep this honest: a few things the inventory turned up are RN advantages, not
Flutter features RN is missing —

- **Live Voice Chat**: RN's version is a real, working listen → send → speak loop (`NativeSpeech` → chat → `NativeTts`). Flutter's equivalent screen is UI-only — no audio capture, no TTS, nothing wired to the bloc.
- **Email/token login path**: RN has a working secondary email+token/magic-link sign-in modal. Flutter's "sign in with email" button is a placeholder snackbar.
- **Token storage security**: RN's `secureStorage` wraps real platform Keychain/Keystore (`expo-secure-store`) with plaintext-migration handling. Flutter's class is literally named `SecureTokenStorage` but stores tokens in plain `shared_preferences` — not actually secure.

## Near-free fixes worth doing regardless of Flutter parity

Independent of comparing to Flutter, the RN inventory surfaced dead code that's
cheap to turn into real functionality:

- Wire the already-built `SettingsScreen.tsx` into the router instead of `ProfileScreen`.
- Either wire `createArtifact()` into the chat response pipeline (mirroring Flutter's auto-persist behavior) or remove the now-pointless Artifacts screen.
- Register `puku://remote` as an Android intent-filter host.
- Add `pukubot://` to iOS `Info.plist`.
- Decide on and remove (or finish wiring) the duplicate, unused `src/components/puku-ui/*` component library and its `cmdk`/`@base-ui/react` dependencies.
