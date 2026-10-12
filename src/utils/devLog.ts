/**
 * Debug-only logging for failures that are deliberately not surfaced to the
 * user (best-effort storage writes, background syncs). Silent in release.
 */
export function devWarn(scope: string, err?: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`[${scope}]`, err ?? '');
  }
}

/** `promise.catch(ignore('scope'))`: swallow in release, log in debug. */
export function ignore(scope: string) {
  return (err: unknown) => devWarn(scope, err);
}
