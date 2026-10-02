export const ENV = {
  API_BASE_URL: 'https://chat.api.puku.sh',
  AUTH_BASE_URL: 'https://puku.sh',
  AUTH_CLIENT_ID: 'puku-app',
  AUTH_REDIRECT_URI: 'puku://callback/',
  REMOTE_SESSION_RELAY_HOST: 'https://puku-cli.relay.puku.sh',
  PUKU_BOT_API_BASE_URL: 'https://app.bot.puku.sh/api/v1',
  PUKU_BOT_LOCAL_BASE_URL: 'http://192.168.0.108:3001/api/v1',
  PUKU_BOT_EMULATOR_BASE_URL: 'http://10.0.2.2:3001/api/v1',
  PUKU_BOT_REDIRECT_URI: 'pukubot://auth/callback',
  // A Sentry DSN is a public write-only ingest key, safe to ship in the
  // client. Leave empty to keep crash reporting disabled (e.g. local dev).
  SENTRY_DSN: '',
  SENTRY_ENVIRONMENT: __DEV__ ? 'development' : 'production',
};
