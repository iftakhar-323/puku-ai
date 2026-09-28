import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';

export class UpdateService {
  /**
   * Check for Over-The-Air (OTA) updates on app launch
   */
  static async checkForUpdates(autoReload = false): Promise<boolean> {
    if (__DEV__ || Platform.OS === 'web') {
      return false;
    }

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
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
                    console.error('Failed to reload app after update', e);
                  }
                },
              },
            ]
          );
        }
        return true;
      }
    } catch (error) {
      console.log('[UpdateService] Update check bypassed (dev or unconfigured):', error);
    }
    return false;
  }

  /**
   * Manually check for updates (can be called from Settings or UI)
   */
  static async manualCheckForUpdate(): Promise<boolean> {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Update Ready',
          'A new update was downloaded. Would you like to restart now?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Restart Now', onPress: () => Updates.reloadAsync() },
          ]
        );
        return true;
      } else {
        Alert.alert('Up to Date', 'You are using the latest version of Puku AI.');
      }
    } catch (e) {
      console.log('[UpdateService] Manual check error:', e);
    }
    return false;
  }

  /**
   * Get current update info
   */
  static getUpdateInfo() {
    return {
      channel: Updates.channel,
      updateId: Updates.updateId,
      runtimeVersion: Updates.runtimeVersion,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    };
  }
}
