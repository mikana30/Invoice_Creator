const path = require('path');

// Global test database path
const TEST_DB_PATH = path.join(__dirname, 'test.db');

// Set up test environment
beforeAll(() => {
  // Set test database path for all tests
  process.env.TEST_DB_PATH = TEST_DB_PATH;
  process.env.NODE_ENV = 'test';

  // Note: We don't delete database files here because on Windows
  // they may be locked. Instead, resetTestDb() handles cleanup.
});

// Clean up after all tests
afterAll(() => {
  // Optional: keep test.db for debugging, or clean it
  // Uncomment to delete after tests:
  // [TEST_DB_PATH, `${TEST_DB_PATH}-shm`, `${TEST_DB_PATH}-wal`].forEach(file => {
  //   if (fs.existsSync(file)) {
  //     fs.unlinkSync(file);
  //   }
  // });
});

// Global test helpers
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
