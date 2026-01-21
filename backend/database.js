const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

let dbInstance = null;

// Get database path
function getDbPath() {
  // Use test database in test environment
  if (process.env.TEST_DB_PATH) {
    return process.env.TEST_DB_PATH;
  }

  // Check if running from Program Files (installed) - need to use AppData
  const isInstalled = __dirname.toLowerCase().includes('program files');

  if (isInstalled && process.env.APPDATA) {
    const appDataPath = path.join(process.env.APPDATA, 'Invoice Creator');
    if (!fs.existsSync(appDataPath)) {
      fs.mkdirSync(appDataPath, { recursive: true });
    }
    return path.join(appDataPath, 'database.db');
  }

  // Development mode - use local folder
  return path.join(__dirname, 'database.db');
}

async function openDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDbPath();
  console.log('Database path:', dbPath);

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable WAL mode for better concurrent access and performance
  await dbInstance.run('PRAGMA journal_mode = WAL');

  return dbInstance;
}

module.exports = { openDb, getDbPath };
