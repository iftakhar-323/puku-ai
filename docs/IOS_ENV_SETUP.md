# Wiring `react-native-config` on iOS

`react-native-config` is already a JS/native dependency of this app (see
`src/config/env.ts`) and works out of the box on Android via Gradle's
`envConfigFiles` in `android/app/build.gradle`. On iOS there is no equivalent
build-time step yet, so `Config.XXXX` always comes back empty there and every
value silently falls back to the hardcoded production defaults in `env.ts` —
regardless of which `.env.*` file you intended to ship.

This isn't something that can be fixed with a source-only patch: it requires
one manual Xcode project change (a new Build Phase) that can only be verified
by opening the project in Xcode and building on macOS. This repo is edited
from Linux, so this doc is the safer alternative to a blind edit of
`ios/PukuAI.xcodeproj/project.pbxproj` — a malformed pbxproj edit can break
the whole iOS build with no way to catch it here.

## What to do (one-time, in Xcode on macOS)

1. Open `ios/PukuAI.xcworkspace` in Xcode (not the `.xcodeproj`).
2. Select the **PukuAI** target → **Build Phases** tab.
3. Click **+** → **New Run Script Phase**.
4. Name it `Config dotenv` and drag it to run **before** "Compile Sources".
5. Paste this script body (matches the Android side: one `.env.<flavor>` file
   per build config — see `.env.dev` / `.env.qa` / `.env.prod` at the repo
   root):

   ```sh
   # Pick the same .env file the EAS/Android flavor convention uses. Default
   # to .env.prod unless a scheme-specific build setting overrides it.
   "${PODS_ROOT}/../node_modules/react-native-config/ios/ReactNativeConfig/BuildDotenvConfig.rb" "${PROJECT_DIR}/.." "${DERIVED_FILE_DIR}"
   ```

6. Under **Input Files**, add:
   ```
   $(PROJECT_DIR)/../.env.prod
   ```
   (or `.env.dev` / `.env.qa` for a scheme built against those — see step 7).
7. Under **Output Files**, add:
   ```
   $(DERIVED_FILE_DIR)/GeneratedDotEnv.m
   ```
8. Add `$(DERIVED_FILE_DIR)/GeneratedDotEnv.m` to the **PukuAI** target's
   compiled sources (Xcode will prompt to add it automatically the first time
   it's generated — accept that).
9. Clean build folder (Cmd+Shift+K) and rebuild.

## Multiple flavors (optional, matches Android's dev/qa/prod split)

Android gets three flavors from one `build.gradle`; iOS instead needs three
separate **schemes** (Product → Scheme → Manage Schemes → duplicate "PukuAI"
as "PukuAI Dev" / "PukuAI QA"), each with its own Run Script Phase pointing at
the matching `.env.dev` / `.env.qa` file. This is a larger, separate change —
today a single scheme reading `.env.prod` is enough to make `Config.XXXX`
stop silently returning defaults on iOS, which is the actual bug.

## Verifying it worked

After rebuilding, add a temporary log in `src/config/env.ts` (or check via the
debugger) and confirm `Config.API_BASE_URL` (from `react-native-config`) is no
longer `undefined` on iOS. Remove the temporary log before committing.
