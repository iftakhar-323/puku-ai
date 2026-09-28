const { getDefaultConfig } = require('@expo/metro-config');

/**
 * Metro configuration
 * https://docs.expo.dev/guides/customizing-metro/
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
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


