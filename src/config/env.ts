/**
 * Puku AI Environment Configuration
 * 1:1 match with Flutter's .env.dev.json and .env.prod.json
 * 
 * Edit this file or paste your credentials here to test immediately!
 */

export const ENV = {
  // Current Environment: 'dev' | 'prod'
  ENVIRONMENT: 'dev',

  // Backend Chat API URL
  // Dev: 'https://chat.api.dev.puku.sh'
  // Prod: 'https://api.puku.sh'
  API_BASE_URL: 'https://chat.api.dev.puku.sh',

  // Web Auth & OAuth URL
  // Dev: 'https://web.dev.puku.sh'
  // Prod: 'https://web.puku.sh'
  AUTH_BASE_URL: 'https://web.dev.puku.sh',

  // OAuth Client ID (registered on Puku backend)
  AUTH_CLIENT_ID: 'puku-app',

  // Deep Link Callback URI (registered in AndroidManifest)
  AUTH_REDIRECT_URI: 'puku://callback/',

  // Relay Host for Remote Sessions
  REMOTE_SESSION_RELAY_HOST: 'puku-cli.relay.dev.puku.sh',

  // 🔑 Direct Developer Credentials (From Boss / Backend)
  // When your boss gives credentials, put them right here:
  TEST_CREDENTIALS: {
    email: 'developer@puku.sh',
    password: 'puku123',
    // Paste live Bearer token here if your senior gives one:
    bearerToken: '',
  },
};
