jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      setItem: jest.fn((key, value) => {
        store[key] = value;
        return Promise.resolve(null);
      }),
      getItem: jest.fn(key => Promise.resolve(store[key] || null)),
      removeItem: jest.fn(key => {
        delete store[key];
        return Promise.resolve(null);
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve(null);
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    },
  };
});

jest.mock('react-native-inappbrowser-reborn', () => ({
  InAppBrowser: {
    isAvailable: jest.fn().mockResolvedValue(true),
    open: jest.fn().mockResolvedValue({ type: 'cancel' }),
    close: jest.fn(),
  },
}));



jest.mock('expo-secure-store', () => {
  let store = {};
  return {
    isAvailableAsync: jest.fn(() => Promise.resolve(true)),
    getItemAsync: jest.fn(key => Promise.resolve(key in store ? store[key] : null)),
    setItemAsync: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn(key => {
      delete store[key];
      return Promise.resolve();
    }),
    __reset: () => {
      store = {};
    },
  };
});

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', languageTag: 'en-US' }]),
}));

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [
    { granted: true, canAskAgain: true },
    jest.fn().mockResolvedValue({ granted: true }),
  ]),
}));

jest.mock('react-native-config', () => ({
  default: {},
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(byteCount => {
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) bytes[i] = Math.floor(Math.random() * 256);
    return bytes;
  }),
  getRandomBytesAsync: jest.fn(byteCount => {
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Promise.resolve(bytes);
  }),
}));
