import { Alert, Platform } from 'react-native';

/**
 * Helper to safely obtain expo-updates module without risking a module load error
 */
function getUpdatesModule() {
  try {
    const mod = require('expo-updates');
    if (mod && (mod.checkForUpdateAsync || mod.reloadAsync)) {
      return mod;
    }
  } catch {
    // expo-updates native module not active or unavailable
  }
  return null;
}

export class UpdateService {
  /**
   * Check for Over-The-Air (OTA) updates on app launch
   */
  static async checkForUpdates(autoReload = false): Promise<boolean> {
    try {
      if (__DEV__ || Platform.OS === 'web') {
        return false;
      }

      const Updates = getUpdatesModule();
      if (!Updates || !Updates.isEnabled) {
        return false;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update && update.isAvailable) {
        await Updates.fetchUpdateAsync();

        if (autoReload) {
          await Updates.reloadAsync();
        } else {
          Alert.alert(
            'New Update Available',
            'A new version of Puku AI has been downloaded. Restart now to apply changes?',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Restart',
                onPress: async () => {
                  try {
                    await Updates.reloadAsync();
                  } catch (e) {
                    console.error('[UpdateService] Failed to reload app after update', e);
                  }
                },
              },
            ]
          );
        }
        return true;
      }
    } catch (error) {
      console.log('[UpdateService] Update check bypassed:', error);
    }
    return false;
  }

  /**
   * Manually check for updates (can be called from Settings or UI)
   */
  static async manualCheckForUpdate(): Promise<boolean> {
    try {
      const Updates = getUpdatesModule();
      if (!Updates || !Updates.isEnabled) {
        Alert.alert('Notice', 'Over-The-Air updates are only enabled in release builds.');
        return false;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update && update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Update Ready',
          'A new update was downloaded. Would you like to restart now?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Restart Now',
              onPress: async () => {
                try {
                  await Updates.reloadAsync();
                } catch (e) {
                  console.error('[UpdateService] Reload failed', e);
                }
              },
            },
          ]
        );
        return true;
      } else {
        Alert.alert('Up to Date', 'You are using the latest version of Puku AI.');
      }
    } catch (e) {
      console.log('[UpdateService] Manual check error:', e);
      Alert.alert('Check Error', 'Unable to check for updates right now. Please try again later.');
    }
    return false;
  }

  /**
   * Get current update info
   */
  static getUpdateInfo() {
    const Updates = getUpdatesModule();
    if (!Updates || !Updates.isEnabled) {
      return {
        channel: 'production',
        updateId: null,
        runtimeVersion: '1.0.0',
        isEmbeddedLaunch: true,
      };
    }
    return {
      channel: Updates.channel ?? 'production',
      updateId: Updates.updateId ?? null,
      runtimeVersion: Updates.runtimeVersion ?? '1.0.0',
      isEmbeddedLaunch: Updates.isEmbeddedLaunch ?? true,
    };
  }
}
