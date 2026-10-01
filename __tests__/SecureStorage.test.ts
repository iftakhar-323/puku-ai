import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { secureStorage } from '../src/services/secureStorage';
import { TokenManager, TOKEN_KEYS } from '../src/services/tokenManager';

describe('secureStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (SecureStore as any).__reset();
  });

  test('writes go to encrypted storage, never plaintext', async () => {
    await secureStorage.setItem('@puku_auth_token', 'secret');
    expect(await AsyncStorage.getItem('@puku_auth_token')).toBeNull();
    expect(await SecureStore.getItemAsync('_puku_auth_token')).toBe('secret');
    expect(await secureStorage.getItem('@puku_auth_token')).toBe('secret');
  });

  test('a token saved in plaintext by an older version is migrated on read', async () => {
    await AsyncStorage.setItem('@puku_auth_token', 'legacy');
    expect(await secureStorage.getItem('@puku_auth_token')).toBe('legacy');
    expect(await AsyncStorage.getItem('@puku_auth_token')).toBeNull();
    expect(await SecureStore.getItemAsync('_puku_auth_token')).toBe('legacy');
  });

  test('removeItem clears both stores', async () => {
    await AsyncStorage.setItem('@k', 'a');
    await SecureStore.setItemAsync('_k', 'b');
    await secureStorage.removeItem('@k');
    expect(await AsyncStorage.getItem('@k')).toBeNull();
    expect(await SecureStore.getItemAsync('_k')).toBeNull();
  });

  test('TokenManager keeps access and refresh tokens out of AsyncStorage', async () => {
    const manager = new TokenManager();
    await manager.saveTokens({
      accessToken: 'acc',
      refreshToken: 'ref',
      expiresIn: 3600,
    });
    expect(await AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(await AsyncStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(await new TokenManager().loadTokens()).toMatchObject({
      accessToken: 'acc',
      refreshToken: 'ref',
    });
  });
});
