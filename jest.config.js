module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-native-async-storage|react-native-inappbrowser-reborn|react-native-safe-area-context|react-native-svg)/)',
  ],
};
