module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'App.tsx',
    '!**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov'],
  // Floor set just under today's actual coverage (~24% lines) so CI catches
  // a real regression without blocking on Flutter's much higher bar (59%,
  // from years of dedicated test-writing) — raise this as coverage grows.
  coverageThreshold: {
    global: {
      lines: 20,
      statements: 20,
      functions: 12,
      branches: 10,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-native-async-storage|react-native-config|react-native-inappbrowser-reborn|react-native-safe-area-context|react-native-svg|@sentry)/)',
  ],
};
