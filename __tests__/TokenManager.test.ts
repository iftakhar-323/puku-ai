import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenManager, REFRESH_THRESHOLD_MS } from '../src/services/tokenManager';

describe('TokenManager OAuth2 Refresh Flow', () => {
  let manager: TokenManager;

  beforeEach(async () => {
    manager = new TokenManager();
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('calculates absolute expiresAt based on expiresIn', () => {
    const now = Date.now();
    const expiresIn = 3600; // 1 hour
    const expiresAt = manager.computeExpiresAt('token123', expiresIn);
    expect(expiresAt).toBeGreaterThanOrEqual(now + expiresIn * 1000 - 50);
    expect(expiresAt).toBeLessThanOrEqual(now + expiresIn * 1000 + 50);
  });

  test('identifies when refresh is required 60 minutes before expiration', () => {
    const now = Date.now();
    // Expiration is in 30 minutes (< 60 minutes threshold)
    const expiresAtSoon = now + 30 * 60 * 1000;
    expect(manager.isRefreshRequired(expiresAtSoon)).toBe(true);

    // Expiration is in 120 minutes (> 60 minutes threshold)
    const expiresAtFar = now + 120 * 60 * 1000;
    expect(manager.isRefreshRequired(expiresAtFar)).toBe(false);

    // Expiration exactly at or past threshold
    const expiresAtThreshold = now + REFRESH_THRESHOLD_MS;
    expect(manager.isRefreshRequired(expiresAtThreshold)).toBe(true);
  });

  test('saves and loads tokens accurately', async () => {
    const fakeToken = 'access_token_abc';
    const fakeRefresh = 'refresh_token_xyz';
    const expiresIn = 7200;

    await manager.saveTokens({
      accessToken: fakeToken,
      refreshToken: fakeRefresh,
      expiresIn,
    });

    const loaded = await manager.loadTokens();
    expect(loaded.accessToken).toBe(fakeToken);
    expect(loaded.refreshToken).toBe(fakeRefresh);
    expect(loaded.expiresAt).toBeGreaterThan(Date.now());
  });

  test('refreshes token successfully and rotates refresh token', async () => {
    await manager.saveTokens({
      accessToken: 'old_access_token',
      refreshToken: 'old_refresh_token',
      expiresIn: 300,
    });

    // Mock global fetch for token refresh
    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 86400,
      }),
    } as any);

    const refreshed = await manager.refreshToken();
    expect(refreshed).toBe('new_access_token');

    const tokens = await manager.loadTokens();
    expect(tokens.accessToken).toBe('new_access_token');
    expect(tokens.refreshToken).toBe('new_refresh_token');
  });

  test('handles concurrent refresh requests with a single in-flight operation', async () => {
    await manager.saveTokens({
      accessToken: 'access_1',
      refreshToken: 'refresh_1',
      expiresIn: 100,
    });

    let fetchCallCount = 0;
    globalThis.fetch = jest.fn().mockImplementation(() => {
      fetchCallCount++;
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'new_access_concurrent',
              refresh_token: 'new_refresh_concurrent',
              expires_in: 86400,
            }),
          });
        }, 50);
      });
    });

    // Trigger two refreshes concurrently
    const [res1, res2] = await Promise.all([
      manager.refreshToken(),
      manager.refreshToken(),
    ]);

    expect(res1).toBe('new_access_concurrent');
    expect(res2).toBe('new_access_concurrent');
    // Only one HTTP request should have been dispatched
    expect(fetchCallCount).toBe(1);
  });

  test('clears tokens and notifies session expired on invalid_grant', async () => {
    let sessionExpiredCalled = false;
    manager.onSessionExpired(() => {
      sessionExpiredCalled = true;
    });

    await manager.saveTokens({
      accessToken: 'expired_access',
      refreshToken: 'bad_refresh',
    });

    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Refresh token is invalid or expired',
      }),
    } as any);

    const result = await manager.refreshToken();
    expect(result).toBeNull();
    expect(sessionExpiredCalled).toBe(true);

    const tokens = await manager.loadTokens();
    expect(tokens.accessToken).toBeNull();
    expect(tokens.refreshToken).toBeNull();
  });
});
