module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000, // 30s for load tests
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'index.js',
    'database.js',
    'init-db.js'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  verbose: true,
  maxWorkers: 4, // Control concurrency for race condition tests
  bail: false, // Continue all tests even if some fail
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
