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
- ✅ Image compression before attachment upload — `android/app/src/main/java/com/pukuai/PickerModule.kt`'s `compressImageIfNeeded` (max 2048px, 85% JPEG), compile-verified with `./gradlew :app:compileDevDebugKotlin`
- ✅ iOS `Picker` native module — `ios/PukuAI/PickerModule.swift` + `PickerModule.m` (RCT_EXTERN_MODULE bridge), implementing `pickMedia`/`takePhoto`/`uploadAttachment` with the same compression, wired into `project.pbxproj`'s Sources build phase. **Not build-verified**: no macOS/Xcode in this environment, so `pod install` + an actual Xcode build is still needed before shipping (see note below)
- ✅ Automated E2E smoke tests in CI via Maestro — `.maestro/*.yaml` flows + `.github/workflows/e2e.yml` (builds the dev-flavor debug APK, runs on a GH-hosted Android emulator). Only two flows so far (launch + email-login-modal); narrower than Flutter's `integration_test` coverage, but a real gate where there was none
- ✅ iOS `Speech`/`Tts`/`Clipboard` native modules — `ios/PukuAI/{Speech,Tts,Clipboard}Module.{swift,m}`, mirroring the Android implementations (`SFSpeechRecognizer`+`AVAudioEngine` for live/partial transcription, `AVSpeechSynthesizer` for TTS, `UIPasteboard` for clipboard), wired into `project.pbxproj`. **Not build-verified** (see below)
- ✅ iOS per-flavor env config — three schemes now (`PukuAI`/`PukuAI-dev`/`PukuAI-qa`), each with its own bundle ID, `Info-*.plist` (`CFBundleDisplayName`), and `ENVFILE` build setting pointing at `.env.dev`/`.env.qa`. Built via the `xcodeproj` Ruby gem rather than hand-edited text, to keep the build-configuration object graph consistent. Full detail in `docs/IOS_ENV_SETUP.md`. **Not build-verified** (see below); per-flavor app icons still not done — needs real icon artwork, not generated here
- Four hardcoded English accessibility labels/placeholder (`ChatHeader.tsx`, `ChatComposer.tsx`) moved into `en.json` under a new `chat` namespace
- Android ANR detection: confirmed enabled by default (no config gap after all — see §6)
- ⏭️ Not replicated (confirmed non-functional on the Flutter side too): fake thinking/tool-use blocks in main chat, the Live Voice Chat mock, the "New Code Session" composer mock, the "research" toggle, and the Projects Power/Shared/Archived scope tabs (no backend scope field exists in either app)

**Genuinely still outstanding** (real gaps, not yet started):
- Broader Maestro flow coverage (the two flows added only cover login-screen rendering and the email modal, not authenticated flows — those need test credentials/a seeded backend that don't exist in CI)
- Per-flavor iOS app icons (design asset work, not code)

**Still needs a real device/Xcode verification pass** (written but unbuildable from this Linux environment — no macOS here):
- All six new iOS native module files (`Picker`/`Speech`/`Tts`/`Clipboard` × `.swift`+`.m`) — need `pod install` + an actual build on macOS to confirm they compile and behave correctly at runtime (camera/document pickers, live transcription, TTS playback, clipboard)
- The three-scheme iOS flavor split — needs opening in Xcode to confirm all three schemes build, install side-by-side, and actually pick up their respective `.env.dev`/`.env.qa` files via `ENVFILE`

---

## 1. Chat message rendering

| Capability | Flutter | RN (puku ai) |
|---|---|---|
| Code block syntax highlighting | ✅ Real tokenized/colorized highlighting via the `highlight` package (`chat_markdown_syntax_highlighter.dart`) | ✅ Hand-rolled tokenizer (`syntaxHighlight.ts`), wired into `MarkdownRenderer.tsx`'s code blocks |
| Diff/patch rendering | ✅ Dedicated colored diff view for ` ```diff ` / ` ```patch ` fences (+green/−red/@@ hunk headers) | ✅ `DiffBlockBody` in `MarkdownRenderer.tsx`, also reused for remote-session tool output |
| "Smart output" fallback rendering (auto-detect JSON/XML/key-value, humanize field names, semantic color for status/exit-code) | ✅ Shared `SmartOutputView`, used in both chat and remote session | ✅ Ported as `src/components/common/SmartOutputView.tsx`, wired into `ToolDetailSheet.tsx` (main chat has no tool-call rendering to attach it to either, since that data path is dead on both apps — see correction above) |

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
| Auto-creation of artifacts from chat | ✅ Every assistant reply is scanned for fenced code blocks and auto-persisted as a titled, language-tagged artifact (`_persistArtifactsFromMessage`) | ✅ `utils/codeBlocks.ts` + a call from `AppContext.sendMessage`'s persistent-conversation success path |

Note: neither app actually renders HTML/SVG/live-preview artifacts — both only persist/display code-type text snippets, so that's parity, not a gap.

## 3. Projects

| Capability | Flutter | RN |
|---|---|---|
| "Add content" ingestion sheet | 🟡 Offers upload-from-device / take picture / choose image / "create document" options (wiring into a repository call wasn't confirmed, but the picker UI covers multiple real content types) | ✅ Real "Take photo" / "Choose a file or photo" rows using the same `NativePicker` as chat attachments, with a real file name/size instead of the hardcoded filename-only modal |
| Capacity/usage indicator | ✅ `capacity_progress_bar.dart` shows project usage/at-capacity state | ✅ Cosmetic capacity bar in `ProjectDetailsScreen.tsx` (not backend-driven on either side) |
| Scope tabs (yours/power/shared/archived) | ❌ Confirmed non-functional: `ProjectDto.toEntity({scope = ProjectScope.yours})` is called from every site in `projects_repository_impl.dart` with no scope argument, so every project is always `.yours` — the backend has no scope field at all | ❌ Same — only "yours" ever has a data source. **Not a real gap**: both apps show the same 4 tabs but neither has backend support for anything but "yours", so there's nothing to replicate |

## 4. Code / Remote Session (CLI remote-control feature)

Both apps implement this as the same concept (pair a phone with a running Puku CLI
session over a QR code, then relay an agentic coding session over WebSocket), and
both are deep, so the gaps here are about sophistication, not absence:

| Capability | Flutter | RN |
|---|---|---|
| "Exit Plan Mode" flow | ✅ Dedicated card + dialog: renders the agent's plan as markdown, lets the user Approve (choosing an exit mode) or Reject with freeform feedback | ✅ `PromptCard.tsx`'s `isExitPlanMode` branch now renders the plan via `MarkdownRenderer` and has a reject-with-feedback text box (`answerPrompt(allow, message?)`) |
| `AskUserQuestion` multi-question flow | ✅ Multi-page wizard dialog — one question per page with Next/Back/Submit, single & multi-select | ✅ `QuestionPicker` in `PromptCard.tsx` now paginates one question per page with Back/Next/Submit |
| Inline file-diff rendering in the agent feed | ✅ Dedicated add/remove/hunk-header colored diff rows (`diff_line_row.dart`) | ✅ `DiffBlockBody` wired into `ToolDetailSheet.tsx` for tool output that looks like a unified diff |
| "New session" composer (model/environment/GitHub/Figma pickers, suggested prompts) | 🟡 UI exists but is non-functional (submit does nothing, Connect GitHub/Figma have no handler) — real sessions only ever start via QR pairing | ❌ No equivalent screen at all — RN's `CodeScreen` only lists existing sessions + a "Direct Connect" session-ID/QR path. **Not implemented**: Flutter's own version is a non-functional mock (confirmed by reading `code_bloc.dart._onSubmitSession` — submit just resets local state), so there's no working feature to replicate |

RN's protocol implementation (`relay/protocol.ts`) is actually the best-tested code
in the RN repo (85–100% coverage) and appears to be a faithful, thorough port —
this section is about UI-layer polish, not protocol-level gaps.

## 5. Settings & Account

| Capability | Flutter | RN |
|---|---|---|
| Settings screen reachable from the app | 🟡 Reachable, but Billing/Usage/Capabilities/Permissions/Voice/Notifications/Shared-Links rows are all placeholder snackbars | ✅ Fixed: `App.tsx` now routes `'settings'` to `SettingsScreen` instead of `ProfileScreen` |
| Theme switcher UI | ❌ `ThemeCubit` supports light/dark/system persistence under the hood, but no Settings row exposes it, and `getThemeData()` maps all 3 modes to the same dark theme anyway — single fixed dark theme in practice | ✅ Now reachable via the routing fix above — `SettingsScreen`'s dark-theme `Switch` works. "System" theme mode is still typed but unimplemented on both sides (no `useColorScheme()` reader) — parity, not a gap |
| Usage dashboard with real data | ❌ Placeholder snackbar only | 🟡 RN has a full `UsageScreen` UI (plan, billing period, token quotas, request history) but every field is hardcoded mock data — no backend integration either side |

## 6. Crash reporting / Observability (Sentry)

Both apps use Sentry, but Flutter's configuration is notably more complete:

| Capability | Flutter | RN |
|---|---|---|
| Session Replay | ✅ `replay.onErrorSampleRate: 1.0`, `replay.sessionSampleRate` 0.05–0.1 | ✅ `Sentry.mobileReplayIntegration()` with matching sample rates in `sentryConfig.ts` |
| Structured logging (`enableLogs`) | ✅ | ✅ `enableLogs: true` |
| Android ANR detection (`anrEnabled`) | ✅ | ✅ Confirmed enabled by default — `@sentry/react-native`'s own `options.d.ts` documents `anrProfilingSampleRate` as "Requires ANR detection, which is enabled by default", so no explicit flag is needed. Still not runtime-verified (no way to trigger/inspect an actual ANR report from this environment), but no config gap |
| Auto-capture failed HTTP requests | ✅ via `sentry_dio` integration | ✅ `Sentry.httpClientIntegration()` |
| Distributed tracing allowlist (`tracePropagationTargets`) | ✅ Explicit allowlist for backend hosts | ✅ Configured in `sentryConfig.ts` |
| Automatic screen-transition breadcrumbs | ✅ `SentryNavigatorObserver` on the router | ✅ Manual `Sentry.addBreadcrumb` in `AppContext.navigate()`, since the app uses a custom router instead of react-navigation |
| Screenshot + view-hierarchy on crash | ✅ | ✅ (RN has `attachScreenshot`/`attachViewHierarchy` too — parity here) |

## 7. Localization

Both apps currently ship English only, but the underlying i18n groundwork differs a lot:

- Flutter: ~700 strings cataloged through a full ARB/codegen pipeline (`S.of(context).xyz`), essentially zero hardcoded UI strings.
- RN: `en.json` has ~126 keys, and per the code's own comment only `LoginScreen`/`LiveVoiceScreen` (and the orphaned `SettingsScreen`) consistently call `t()` — most other screens (Chats, Projects, Artifacts, Transcribe, Usage, Code, PukuBot, RemoteSession) use hardcoded English strings directly in JSX.

**Gap:** RN's i18n infrastructure exists but covers a much smaller fraction of the actual UI than Flutter's does, even though neither ships a second language yet.

## 8. CI/CD & release process

| Capability | Flutter | RN |
|---|---|---|
| Minimum code-coverage gate | ✅ CI fails below 59% line coverage | ✅ `jest.config.js` now has a `coverageThreshold` floor (~20%, just under today's actual ~24%) — lower than Flutter's 59%, which took years of dedicated test-writing to reach, but it's a real regression gate now instead of none at all |
| Automated integration/E2E tests in CI | ✅ Runs `integration_test` on a real Android emulator (API 31) in CI | 🟡 `.github/workflows/e2e.yml` now builds the dev-flavor debug APK and runs 2 Maestro smoke flows (`.maestro/`) on a GH-hosted Android emulator (API 31). Narrower than Flutter's suite — only covers login-screen rendering and the email modal, nothing authenticated — but a real CI gate where there was previously only a manual script (`scripts/run-argent-demo.sh`) |
| Tag-triggered release pipeline | ✅ `release.yml` triggers on `v*.*.*` tags, builds signed APK + AppBundle, auto-creates a GitHub Release, and dispatches a webhook to an external `puku-mobile-automation` repo to run automated tests against the fresh build | ✅ New `.github/workflows/release.yml`: tag-triggered, builds signed APK+AAB, creates a GitHub Release. No webhook dispatch to an external automation repo (RN has no equivalent repo to dispatch to) |
| iOS per-flavor env config | ✅ Separate `Info-dev/qa/prod.plist` per flavor, 3 schemes-worth of icon sets | 🟡 Three schemes now exist (`PukuAI`/`-dev`/`-qa`), each with its own bundle ID, `Info-*.plist`, and `ENVFILE` — see `docs/IOS_ENV_SETUP.md`. Not build-verified, and per-flavor icon sets still not done (needs real icon artwork) |

## 9. Misc

- **Image compression on attachment**: ✅ Fixed on both platforms. Android: `compressImageIfNeeded` in `PickerModule.kt` (max 2048px, 85% JPEG), compile-verified. iOS: same logic ported into the new `PickerModule.swift` (see §4a below) — written but not build-verified (no macOS/Xcode here).
- **iOS has no `Picker` native module**: ✅ Fixed — `ios/PukuAI/PickerModule.swift` + `PickerModule.m` now implement `pickMedia` (via `UIDocumentPickerViewController`), `takePhoto` (via `UIImagePickerController`, camera), and `uploadAttachment` (via `URLSession` multipart upload), registered in `project.pbxproj`. Camera permission string already existed in `Info.plist`; no photo-library permission needed since the document picker doesn't touch the Photos library directly. **Still needs an actual `pod install` + Xcode build on macOS** to confirm it compiles and behaves correctly at runtime — not possible from this Linux environment.
- **iOS `Speech`/`Tts`/`Clipboard` native modules**: ✅ Fixed — `ios/PukuAI/SpeechModule.swift` (`SFSpeechRecognizer` + `AVAudioEngine`, live partial/final transcription + RMS level events), `TtsModule.swift` (`AVSpeechSynthesizer`), `ClipboardModule.swift` (`UIPasteboard`), each with a matching `.m` `RCT_EXTERN_MODULE` bridge file, same event names as the Android versions (`onSpeechStart/End/Rms/Results/PartialResults/Error`, `onTtsStart/Done/Error`). Not build-verified.
- **Deep link to incoming remote session (`puku://remote`)**: ✅ Fixed — added as an intent-filter host in `AndroidManifest.xml`.
- **`pukubot://` URL scheme**: ✅ Fixed — added to RN's iOS `Info.plist`.

---

## Where RN is actually ahead of Flutter (for context, not gaps)

To keep this honest: a few things the inventory turned up are RN advantages, not
Flutter features RN is missing —

- **Live Voice Chat**: RN's version is a real, working listen → send → speak loop (`NativeSpeech` → chat → `NativeTts`). Confirmed working on Android (`SpeechModule.kt`/`TtsModule.kt`). iOS now has matching `SpeechModule.swift`/`TtsModule.swift` (see §9) but they're unverified — no macOS here to actually run them — so treat iOS as "should work" rather than confirmed. Flutter's equivalent screen is UI-only on both platforms (no audio capture, no TTS, nothing wired to the bloc) either way.
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
