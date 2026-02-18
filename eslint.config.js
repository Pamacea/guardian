const js = require('@eslint/js');
const security = require('eslint-plugin-security');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', '.guardian/**'],
  },
  js.configs.recommended,
  {
    files: ['bin/**/*.js', 'tests/**/*.js'],
    plugins: {
      security,
    },
    rules: {
      ...security.configs.recommended.rules,
      'no-process-exit': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['bin/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
  },
];
