import Config from 'react-native-config';

// Android picks the matching .env.<flavor> file at build time (see
// android/app/build.gradle's envConfigFiles); Config then exposes those
// values here at runtime via a native bridge. iOS picks up the plain
// `.env` file at the repo root the same way, via a script phase that
// react-native-config's own podspec declares (no manual Xcode Build
// Phase needed — see docs/IOS_ENV_SETUP.md) as long as `pod install` has
// been run since the dependency was added. If `Config` ever comes back
// empty there (e.g. `pod install` hasn't run), everything below falls
// back to these defaults — same values the app has always shipped.
function pick(key: string, fallback: string): string {
  const value = Config[key];
  return value && value.length > 0 ? value : fallback;
}

export const ENV = {
  API_BASE_URL: pick('API_BASE_URL', 'https://chat.api.puku.sh'),
  AUTH_BASE_URL: pick('AUTH_BASE_URL', 'https://puku.sh'),
  AUTH_CLIENT_ID: pick('AUTH_CLIENT_ID', 'puku-app'),
  AUTH_REDIRECT_URI: pick('AUTH_REDIRECT_URI', 'puku://callback/'),
  REMOTE_SESSION_RELAY_HOST: pick(
    'REMOTE_SESSION_RELAY_HOST',
    'https://puku-cli.relay.puku.sh'
  ),
  PUKU_BOT_API_BASE_URL: pick(
    'PUKU_BOT_API_BASE_URL',
    'https://app.bot.puku.sh/api/v1'
  ),
  PUKU_BOT_LOCAL_BASE_URL: 'http://192.168.0.108:3001/api/v1',
  PUKU_BOT_EMULATOR_BASE_URL: 'http://10.0.2.2:3001/api/v1',
  PUKU_BOT_REDIRECT_URI: pick('PUKU_BOT_REDIRECT_URI', 'pukubot://auth/callback'),
  // A Sentry DSN is a public write-only ingest key, safe to ship in the
  // client. Leave empty to keep crash reporting disabled (e.g. local dev).
  SENTRY_DSN: pick('SENTRY_DSN', ''),
  SENTRY_ENVIRONMENT: pick('SENTRY_ENVIRONMENT', __DEV__ ? 'development' : 'production'),
};
