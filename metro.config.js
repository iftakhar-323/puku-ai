const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.serializer = {
  ...config.serializer,
  getPolyfills: () => {
    try {
      return require('@react-native/js-polyfills')();
    } catch {
      return [];
    }
  },
};

module.exports = config;
