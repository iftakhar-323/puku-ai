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

## If you want flavor-specific values on iOS too

iOS doesn't have Android's three build flavors — there's one Xcode scheme
(`PukuAI`). Two options, in increasing order of effort:

1. **Override which file is read** by setting the `ENVFILE` build setting
   (e.g. `ENVFILE=.env.qa`) on a scheme or xcconfig — `ReadDotEnv.rb` already
   supports this (`ENV['ENVFILE']`), with build-setting expansion like
   `ENVFILE=.env.$(CONFIGURATION)`.
2. **Add real dev/qa schemes**, each duplicated from `PukuAI` (Product →
   Scheme → Manage Schemes) with its own `ENVFILE` setting — the iOS
   equivalent of Android's three flavors. Bigger change, only worth it if iOS
   needs the same dev/qa/prod separation Android has.

Today, a single scheme reading the one `.env` file is enough to fix the
actual bug (iOS silently getting empty `Config` and falling back to
hardcoded defaults) — that's what matters for parity with Android actually
providing real values.

## Verifying it worked

This can only be verified by building on macOS (no Xcode/CocoaPods available
in this environment). After `pod install` and a rebuild, add a temporary log
in `src/config/env.ts` (or check via the debugger) and confirm
`Config.API_BASE_URL` is no longer `undefined` on iOS. Remove the temporary
log before committing.
