declare module 'react-native-config' {
  export interface NativeConfig {
    [key: string]: string | undefined;
    API_BASE_URL?: string;
    AUTH_BASE_URL?: string;
    AUTH_CLIENT_ID?: string;
    AUTH_REDIRECT_URI?: string;
    REMOTE_SESSION_RELAY_HOST?: string;
    PUKU_BOT_API_BASE_URL?: string;
    PUKU_BOT_REDIRECT_URI?: string;
    SENTRY_DSN?: string;
    SENTRY_ENVIRONMENT?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
