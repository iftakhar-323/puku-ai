/**
 * Encrypted key/value storage for credentials (Keychain on iOS, Keystore-backed
 * EncryptedSharedPreferences on Android) with the same API as AsyncStorage.
 *
 * - Values previously saved in plaintext AsyncStorage are migrated on first read.
 * - If the native module is unavailable (e.g. an iOS build made before
 *   `pod install`), it falls back to AsyncStorage so the app keeps working.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { devWarn, ignore } from '../utils/devLog';

// SecureStore keys may only contain [A-Za-z0-9._-].
function toSecureKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

let secureAvailable: boolean | null = null;

async function isSecureAvailable(): Promise<boolean> {
  if (secureAvailable === null) {
    try {
      secureAvailable = await SecureStore.isAvailableAsync();
    } catch {
      secureAvailable = false;
    }
    if (!secureAvailable) {
      devWarn(
        'secureStorage',
        'expo-secure-store unavailable, using AsyncStorage',
      );
    }
  }
  return secureAvailable;
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!(await isSecureAvailable())) return AsyncStorage.getItem(key);

    try {
      const value = await SecureStore.getItemAsync(toSecureKey(key));
      if (value !== null) {
        // A write that was interrupted between the SecureStore write and the
        // AsyncStorage cleanup (e.g. app killed mid-refresh) can leave a
        // plaintext copy behind; sweep it on every read, not just migration.
        AsyncStorage.removeItem(key).catch(ignore('secureStorage.sweep'));
        return value;
      }
    } catch (err) {
      devWarn('secureStorage.getItem', err);
    }

    // Migrate a value saved before encrypted storage was introduced.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      try {
        await SecureStore.setItemAsync(toSecureKey(key), legacy);
        await AsyncStorage.removeItem(key);
      } catch (err) {
        devWarn('secureStorage.migrate', err);
      }
    }
    return legacy;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!(await isSecureAvailable())) return AsyncStorage.setItem(key, value);
    await SecureStore.setItemAsync(toSecureKey(key), value);
    // Never leave a plaintext copy behind.
    await AsyncStorage.removeItem(key);
  },

  async removeItem(key: string): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(key),
      (async () => {
        if (await isSecureAvailable())
          await SecureStore.deleteItemAsync(toSecureKey(key));
      })(),
    ]);
  },
};
