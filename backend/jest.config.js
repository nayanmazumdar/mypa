module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/env.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 15000,
};
