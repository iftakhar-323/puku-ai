module.exports = {
  root: true,
  extends: '@react-native',
  env: {
    jest: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'no-bitwise': 'off',
    'react-native/no-inline-styles': 'warn',
  },
};
