import * as Sentry from '@sentry/react-native';
import { ENV } from './env';

/** Whether Sentry was configured with a DSN. */
export const isSentryEnabled = ENV.SENTRY_DSN.length > 0;

/** Mirrors the Flutter app's Sentry setup (lib/config/sentry_config.dart). */
export function initSentry(): void {
  if (!isSentryEnabled) return;

  Sentry.init({
    dsn: ENV.SENTRY_DSN,
    environment: ENV.SENTRY_ENVIRONMENT,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    attachScreenshot: true,
    attachViewHierarchy: true,
  });
}

/** Sends a test exception to Sentry to verify the SDK setup. */
export function captureSentryTestEvent(): void {
  if (!isSentryEnabled) return;
  Sentry.captureException(new Error('Sentry Test Exception'));
}
