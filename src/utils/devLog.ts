import * as Sentry from '@sentry/react-native';

/**
 * Debug logging and Sentry breadcrumbs for failures.
 */
export function devWarn(scope: string, err?: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`[${scope}]`, err ?? '');
  }
  if (err) {
    Sentry.addBreadcrumb({
      category: scope,
      message: err instanceof Error ? err.message : String(err),
      level: 'warning',
    });
  }
}

/**
 * Explicitly captures an exception to Sentry with feature scope tag and contextual metadata.
 */
export function captureError(scope: string, err: unknown, extra?: Record<string, any>): void {
  devWarn(scope, err);
  if (err instanceof Error) {
    Sentry.captureException(err, {
      tags: { feature: scope },
      extra,
    });
  } else if (err) {
    Sentry.captureMessage(`[${scope}] ${String(err)}`, {
      level: 'error',
      tags: { feature: scope },
      extra,
    });
  }
}

/** `promise.catch(ignore('scope'))`: records breadcrumb & logs unexpected errors to Sentry. */
export function ignore(scope: string) {
  return (err: unknown) => {
    devWarn(scope, err);
    if (
      err instanceof Error &&
      !err.message.includes('abort') &&
      !err.message.includes('canceled') &&
      !err.message.includes('cancelled')
    ) {
      Sentry.captureException(err, {
        tags: { feature: scope, handled: 'true' },
      });
    }
  };
}
