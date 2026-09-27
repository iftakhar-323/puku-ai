/**
 * OAuth2 Token Storage & Refresh Coordinator for Puku AI
 *
 * Implements standard OAuth2 PKCE Refresh Token flow:
 * - Secure persistence of accessToken, refreshToken, and expiresAt
 * - Auto-refresh 60 minutes before expiration (REFRESH_THRESHOLD_MS = 3,600,000)
 * - Single-flight refresh coordination (prevents concurrent duplicate refresh requests)
 * - Refresh token rotation support
 * - Session expiration notification
 * - Atomic AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';
import { extractJwtData } from '../utils/auth';

export const TOKEN_KEYS = {
  ACCESS_TOKEN: '@puku_auth_token',
  REFRESH_TOKEN: '@puku_refresh_token',
  EXPIRES_AT: '@puku_token_expires_at',
  IS_LOGGED_IN: '@puku_is_logged_in',
  IS_LOGGED_OUT: '@puku_is_logged_out',
};

// 60 minutes in milliseconds
export const REFRESH_THRESHOLD_MS = 60 * 60 * 1000;

export interface TokenBundle {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null; // in seconds
  expiresAt?: number | null; // in milliseconds since epoch
}

export class TokenManager {
  private accessToken: string | null = null;
  private refreshTokenVal: string | null = null;
  private expiresAt: number | null = null;
  private isLoaded = false;

  private ongoingRefresh: Promise<string | null> | null = null;
  private sessionExpiredListeners: Array<() => void> = [];

  /**
   * Subscribe to session expiration events (e.g. invalid_grant or token revoked).
   */
  onSessionExpired(callback: () => void): () => void {
    this.sessionExpiredListeners.push(callback);
    return () => {
      this.sessionExpiredListeners = this.sessionExpiredListeners.filter(cb => cb !== callback);
    };
  }

  notifySessionExpired() {
    this.sessionExpiredListeners.forEach(cb => {
      try {
        cb();
      } catch {}
    });
  }

  /**
   * Compute absolute expiration in epoch ms.
   * If expiresIn is given, expiresAt = currentTime + (expiresIn * 1000).
   * Otherwise check JWT exp claim if present.
   */
  computeExpiresAt(
    accessToken: string,
    expiresIn?: number | null,
    expiresAt?: number | null
  ): number | null {
    if (typeof expiresAt === 'number' && !isNaN(expiresAt) && expiresAt > 0) {
      return expiresAt;
    }
    if (typeof expiresIn === 'number' && !isNaN(expiresIn) && expiresIn > 0) {
      return Date.now() + expiresIn * 1000;
    }
    // Attempt to extract exp claim from JWT if available
    const jwt = extractJwtData(accessToken) as Record<string, any> | null;
    if (jwt && typeof jwt.exp === 'number' && jwt.exp > 0) {
      return jwt.exp * 1000;
    }
    return null;
  }

  /**
   * Load tokens from AsyncStorage into memory cache.
   */
  async loadTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  }> {
    try {
      const [token, refresh, exp] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(TOKEN_KEYS.EXPIRES_AT),
      ]);

      this.accessToken = token || null;
      this.refreshTokenVal = refresh || null;
      this.expiresAt = exp ? parseInt(exp, 10) : null;
      this.isLoaded = true;

      // If we have an accessToken but no expiresAt, try extracting exp from JWT
      if (this.accessToken && !this.expiresAt) {
        this.expiresAt = this.computeExpiresAt(this.accessToken);
        if (this.expiresAt) {
          AsyncStorage.setItem(TOKEN_KEYS.EXPIRES_AT, this.expiresAt.toString()).catch(() => {});
        }
      }

      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshTokenVal,
        expiresAt: this.expiresAt,
      };
    } catch {
      this.isLoaded = true;
      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshTokenVal,
        expiresAt: this.expiresAt,
      };
    }
  }

  /**
   * Save newly acquired tokens atomically.
   */
  async saveTokens(bundle: TokenBundle): Promise<void> {
    const computedExp = this.computeExpiresAt(
      bundle.accessToken,
      bundle.expiresIn,
      bundle.expiresAt
    );

    this.accessToken = bundle.accessToken;
    if (bundle.refreshToken !== undefined && bundle.refreshToken !== null) {
      this.refreshTokenVal = bundle.refreshToken;
    }
    this.expiresAt = computedExp;
    this.isLoaded = true;

    const ops: Promise<void>[] = [
      AsyncStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, bundle.accessToken),
      AsyncStorage.setItem(TOKEN_KEYS.IS_LOGGED_IN, 'true'),
    ];

    if (this.refreshTokenVal) {
      ops.push(AsyncStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, this.refreshTokenVal));
    }
    if (this.expiresAt) {
      ops.push(AsyncStorage.setItem(TOKEN_KEYS.EXPIRES_AT, this.expiresAt.toString()));
    }

    ops.push(AsyncStorage.removeItem(TOKEN_KEYS.IS_LOGGED_OUT));

    await Promise.all(ops);
  }

  /**
   * Clear all stored tokens and mark logged out.
   */
  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshTokenVal = null;
    this.expiresAt = null;
    this.isLoaded = true;

    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(TOKEN_KEYS.EXPIRES_AT),
      AsyncStorage.removeItem(TOKEN_KEYS.IS_LOGGED_IN),
      AsyncStorage.setItem(TOKEN_KEYS.IS_LOGGED_OUT, 'true'),
    ]);
  }

  /**
   * Checks if refresh is required (60 minutes before expiration).
   */
  isRefreshRequired(expiresAt: number | null): boolean {
    if (!expiresAt) return false;
    return Date.now() >= expiresAt - REFRESH_THRESHOLD_MS;
  }

  getAccessTokenSync(): string | null {
    return this.accessToken;
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.isLoaded) {
      await this.loadTokens();
    }
    return this.accessToken;
  }

  async getRefreshToken(): Promise<string | null> {
    if (!this.isLoaded) {
      await this.loadTokens();
    }
    return this.refreshTokenVal;
  }

  async getExpiresAt(): Promise<number | null> {
    if (!this.isLoaded) {
      await this.loadTokens();
    }
    return this.expiresAt;
  }

  /**
   * Single-flight token refresh. Guarantees that only ONE refresh request
   * runs at any given time, and concurrent callers wait for the same promise.
   */
  async refreshToken(): Promise<string | null> {
    if (this.ongoingRefresh) {
      return this.ongoingRefresh;
    }

    this.ongoingRefresh = (async () => {
      const storedRefreshToken = await this.getRefreshToken();
      if (!storedRefreshToken) {
        // No refresh token available: continue using existing accessToken safely
        // Do NOT log out the user!
        return this.accessToken;
      }

      try {
        const response = await fetch(`${ENV.AUTH_BASE_URL}/api/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) PukuApp/1.0',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: storedRefreshToken,
            client_id: ENV.AUTH_CLIENT_ID,
          }).toString(),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          const isAuthFailure =
            response.status === 400 ||
            response.status === 401 ||
            errData?.error === 'invalid_grant' ||
            errData?.error === 'invalid_token';

          if (isAuthFailure) {
            await this.handleAuthFailure();
            return null;
          }

          // If 5xx or server transient error, preserve tokens and throw
          throw new Error(
            errData?.error_description ||
              errData?.error ||
              `Refresh token failed: HTTP ${response.status}`
          );
        }

        const data = await response.json();
        const newAccessToken = data.access_token || data.accessToken;
        const newRefreshToken = data.refresh_token || data.refreshToken || storedRefreshToken;
        const rawExpiresIn = data.expires_in || data.expiresIn;
        const expiresIn =
          typeof rawExpiresIn === 'number'
            ? rawExpiresIn
            : rawExpiresIn
            ? parseInt(rawExpiresIn, 10)
            : undefined;

        if (!newAccessToken) {
          await this.handleAuthFailure();
          return null;
        }

        // Save tokens with rotation
        await this.saveTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn,
        });

        return newAccessToken;
      } catch (err: any) {
        // Authentication failure already handled above.
        // For network errors (e.g. fetch threw TypeError), throw so caller can decide
        throw err;
      }
    })();

    try {
      return await this.ongoingRefresh;
    } finally {
      this.ongoingRefresh = null;
    }
  }

  /**
   * Pre-request check: Ensures a valid token is returned.
   * If expired or within 60 minutes of expiration, refreshes proactively.
   */
  async ensureValidToken(): Promise<string | null> {
    if (!this.isLoaded) {
      await this.loadTokens();
    }

    if (!this.accessToken) {
      return null;
    }

    if (this.isRefreshRequired(this.expiresAt)) {
      try {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return refreshed;
        }
      } catch {
        // If refresh failed due to temporary network error, fallback to current token
        return this.accessToken;
      }
    }

    return this.accessToken;
  }

  private async handleAuthFailure() {
    await this.clearTokens();
    this.notifySessionExpired();
  }
}

export const tokenManager = new TokenManager();
