# `react-native-config` on iOS

**Correction**: an earlier version of this doc said iOS needed a manual Xcode
Build Phase to pick up `.env` values. That was wrong — `react-native-config`
version 1.7.2 (the version pinned in this repo's `package.json`) declares its
env-codegen step directly in its own podspec:

```ruby
# node_modules/react-native-config/react-native-config.podspec
s.script_phase = {
  name: 'Config codegen',
  script: %(
    "${PODS_TARGET_SRCROOT}/ios/ReactNativeConfig/BuildDotenvConfig.rb" "$SRCROOT/../.." "${PODS_TARGET_SRCROOT}/ios/ReactNativeConfig"
  ),
  execution_position: :before_compile,
  ...
}
```

CocoaPods injects this into the generated `react-native-config` Pod target
automatically on `pod install` — no manual Build Phase, no `project.pbxproj`
edit. It runs `BuildDotenvConfig.rb` before that pod's sources compile, which
regenerates `GeneratedDotEnv.m` (read by `RNCConfig.m` via a plain `#import`)
from a `.env` file.

## What file it reads

By default it reads **`.env`** at the repo root (`read_dot_env` in
`ReadDotEnv.rb`, `defaultEnvFile = '.env'`) — not `.env.dev` / `.env.qa` /
`.env.prod`. Those three are Android-only today, consumed via
`android/app/build.gradle`'s `envConfigFiles` per build flavor.

This repo already has a `.env` at the root with real values, so **no action
is needed** to get iOS reading real config — it happens the first time
someone runs `cd ios && pod install` on this project and builds.

## Flavor-specific values on iOS

**Done.** The project now has three schemes mirroring Android's three
flavors:

| Scheme | Configurations | Bundle ID | Info.plist | `ENVFILE` |
|---|---|---|---|---|
| `PukuAI` (default) | `Debug` / `Release` | `com.pukuai` | `Info.plist` | unset → reads root `.env` |
| `PukuAI-dev` | `Debug-dev` / `Release-dev` | `com.pukuai.dev` | `Info-Dev.plist` (`CFBundleDisplayName` = "Puku AI Dev") | `$(PROJECT_DIR)/../.env.dev` |
| `PukuAI-qa` | `Debug-qa` / `Release-qa` | `com.pukuai.qa` | `Info-Qa.plist` (`CFBundleDisplayName` = "Puku AI QA") | `$(PROJECT_DIR)/../.env.qa` |

This was built by duplicating `XCBuildConfiguration` objects with the
`xcodeproj` Ruby gem (safer than hand-editing `project.pbxproj`'s object
graph directly) and adding two new `.xcscheme` files under
`xcshareddata/xcschemes/`, modeled on the existing `PukuAI.xcscheme`. The
`ENVFILE` build setting relies on `ReadDotEnv.rb`'s documented support for
`ENV['ENVFILE']`, with Xcode expanding `$(PROJECT_DIR)` before the script
phase runs.

**Not build-verified** — no macOS/Xcode in the environment this was written
in. Before relying on this, open the project in Xcode once and confirm:
- All three schemes appear in the scheme picker and build successfully.
- `PukuAI-dev`/`PukuAI-qa` install side-by-side with the default build
  (distinct bundle IDs, so all three can be on a device/simulator at once).
- Each build's `Config.API_BASE_URL` etc. actually reflects its own
  `.env.dev`/`.env.qa` file (add a temporary log in `src/config/env.ts`,
  same as the verification method below, then remove it).

**Not done**: distinct per-flavor app icons (Flutter has "3 schemes-worth of
icon sets"). That needs real designed icon artwork per flavor, which isn't
something to generate blind — `Images.xcassets` still has a single shared
`AppIcon` for all three schemes today.

## Verifying it worked

This can only be verified by building on macOS (no Xcode/CocoaPods available
in this environment). After `pod install` and a rebuild, add a temporary log
in `src/config/env.ts` (or check via the debugger) and confirm
`Config.API_BASE_URL` is no longer `undefined` on iOS. Remove the temporary
log before committing.
