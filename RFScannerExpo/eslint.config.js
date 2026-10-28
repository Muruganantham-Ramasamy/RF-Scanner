// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      'src/hooks/use-color-scheme.web.ts',
      'scripts/*',
    ],
  },
  {
    // React Compiler–oriented rules flag intentional callback-ref sync and
    // reset-key state resets used by barcode / picking workflows.
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
