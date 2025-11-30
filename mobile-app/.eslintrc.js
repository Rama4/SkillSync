module.exports = {
  root: true,
  extends: '@react-native',
  parserOptions: {
    requireConfigFile: false,
  },
  rules: {
    // Disable deprecated rule that was causing the error
    '@typescript-eslint/func-call-spacing': 'off',
  },
};
