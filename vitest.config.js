const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['bin/**/*.js'],
      // Exclude files that are not easily testable:
      // - cli.js: Main entry point with internal functions
      // - docker.js: Internal implementation, functions not exported
      // - prompt.js: Internal implementation, uses complex deps
      exclude: [
        'tests/**',
        '**/*.test.js',
        '**/node_modules/**',
        'bin/cli.js',
        'bin/docker.js',
        'bin/prompt.js',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        autoUpdate: false,
        perFile: false,
      },
    },
    include: ['tests/**/*.test.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
