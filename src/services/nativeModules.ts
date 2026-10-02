import { Alert, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { PukuClipboard, PukuSpeech, PukuTts, PukuPicker } = NativeModules;

export interface PickedMedia {
  uri: string;
  name: string;
  type: string;
  size: number;
  base64?: string;
}

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'Puku needs access to your camera to take and attach photos.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export const NativePicker = {
  pickMedia: async (options?: any): Promise<PickedMedia | null> => {
    try {
      if (PukuPicker && PukuPicker.pickMedia) {
        return await PukuPicker.pickMedia(options || {});
      }
    } catch (e) {
      console.warn('Failed to pick media', e);
    }
    return null;
  },
  takePhoto: async (options?: any): Promise<PickedMedia | null> => {
    try {
      if (Platform.OS === 'android') {
        const hasPerm = await requestCameraPermission();
        if (!hasPerm) return null;
      }
      if (PukuPicker && PukuPicker.takePhoto) {
        return await PukuPicker.takePhoto(options || {});
      }
    } catch (e) {
      console.warn('Failed to take photo', e);
    }
    return null;
  },
  uploadAttachment: async (
    url: string,
    filePath: string,
    fileName: string,
    mimeType: string,
    token?: string
  ): Promise<any> => {
    if (PukuPicker && PukuPicker.uploadAttachment) {
      return await PukuPicker.uploadAttachment(url, filePath, fileName, mimeType, token || null);
    }
    throw new Error('Native upload is not available');
  },
};

export function promptMediaAttachment(
  onSelected: (media: PickedMedia) => void,
  title: string = 'Add Photo or File',
) {
  Alert.alert(
    title,
    'Choose an option to attach an image or file',
    [
      {
        text: 'Take Photo',
        onPress: async () => {
          try {
            const media = await NativePicker.takePhoto();
            if (media) onSelected(media);
          } catch (e) {
            console.warn('Camera error', e);
          }
        },
      },
      {
        text: 'Choose File / Photo',
        onPress: async () => {
          try {
            const media = await NativePicker.pickMedia();
            if (media) onSelected(media);
          } catch (e) {
            console.warn('Picker error', e);
          }
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ],
    { cancelable: true }
  );
}

export async function requestAudioPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'Puku AI needs access to your microphone to convert your voice to text.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export const NativeClipboard = {
  setString: async (text: string): Promise<boolean> => {
    try {
      if (PukuClipboard && PukuClipboard.setString) {
        return await PukuClipboard.setString(text);
      }
    } catch (e) {
      console.warn('Failed to set clipboard', e);
    }
    return false;
  },
  getString: async (): Promise<string> => {
    try {
      if (PukuClipboard && PukuClipboard.getString) {
        return await PukuClipboard.getString();
      }
    } catch (e) {
      console.warn('Failed to get clipboard', e);
    }
    return '';
  },
};

const speechEventEmitter = PukuSpeech
  ? new NativeEventEmitter(PukuSpeech)
  : null;

const ttsEventEmitter = PukuTts ? new NativeEventEmitter(PukuTts) : null;

export interface SpeechResultsEvent {
  text: string;
}

export interface SpeechErrorEvent {
  code: number;
  message: string;
}

export const NativeSpeech = {
  isAvailable: async (): Promise<boolean> => {
    try {
      if (PukuSpeech && PukuSpeech.isAvailable) {
        return await PukuSpeech.isAvailable();
      }
    } catch {}
    return false;
  },
  startListening: async (language?: string): Promise<boolean> => {
    try {
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) return false;
      if (PukuSpeech && PukuSpeech.startListening) {
        return await PukuSpeech.startListening(language || null);
      }
    } catch (e) {
      console.warn('Failed to start speech listening', e);
    }
    return false;
  },
  stopListening: async (): Promise<boolean> => {
    try {
      if (PukuSpeech && PukuSpeech.stopListening) {
        return await PukuSpeech.stopListening();
      }
    } catch {}
    return false;
  },
  cancelListening: async (): Promise<boolean> => {
    try {
      if (PukuSpeech && PukuSpeech.cancelListening) {
        return await PukuSpeech.cancelListening();
      }
    } catch {}
    return false;
  },
  onSpeechResults: (callback: (text: string) => void) => {
    if (!speechEventEmitter) return () => {};
    const sub = speechEventEmitter.addListener('onSpeechResults', (event: any) => {
      callback(event?.text || '');
    });
    return () => sub.remove();
  },
  onSpeechPartialResults: (callback: (text: string) => void) => {
    if (!speechEventEmitter) return () => {};
    const sub = speechEventEmitter.addListener('onSpeechPartialResults', (event: any) => {
      callback(event?.text || '');
    });
    return () => sub.remove();
  },
  onSpeechStart: (callback: () => void) => {
    if (!speechEventEmitter) return () => {};
    const sub = speechEventEmitter.addListener('onSpeechStart', () => callback());
    return () => sub.remove();
  },
  onSpeechEnd: (callback: () => void) => {
    if (!speechEventEmitter) return () => {};
    const sub = speechEventEmitter.addListener('onSpeechEnd', () => callback());
    return () => sub.remove();
  },
  onSpeechError: (callback: (error: SpeechErrorEvent) => void) => {
    if (!speechEventEmitter) return () => {};
    const sub = speechEventEmitter.addListener('onSpeechError', (err: any) => {
      callback({ code: err?.code || -1, message: err?.message || 'Unknown error' });
    });
    return () => sub.remove();
  },
};

export const NativeTts = {
  speak: async (text: string): Promise<boolean> => {
    try {
      if (PukuTts && PukuTts.speak) {
        return await PukuTts.speak(text);
      }
    } catch (e) {
      console.warn('Failed to speak', e);
    }
    return false;
  },
  stop: async (): Promise<boolean> => {
    try {
      if (PukuTts && PukuTts.stop) {
        return await PukuTts.stop();
      }
    } catch {}
    return false;
  },
  onStart: (callback: () => void) => {
    if (!ttsEventEmitter) return () => {};
    const sub = ttsEventEmitter.addListener('onTtsStart', () => callback());
    return () => sub.remove();
  },
  onDone: (callback: () => void) => {
    if (!ttsEventEmitter) return () => {};
    const sub = ttsEventEmitter.addListener('onTtsDone', () => callback());
    return () => sub.remove();
  },
  onError: (callback: () => void) => {
    if (!ttsEventEmitter) return () => {};
    const sub = ttsEventEmitter.addListener('onTtsError', () => callback());
    return () => sub.remove();
  },
};
