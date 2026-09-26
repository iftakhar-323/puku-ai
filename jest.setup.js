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
