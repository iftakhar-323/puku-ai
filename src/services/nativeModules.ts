import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { PukuClipboard, PukuSpeech } = NativeModules;

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
