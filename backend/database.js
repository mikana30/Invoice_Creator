const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbInstance = null;

// Get database path - uses userData in Electron, local in development
function getDbPath() {
  if (process.env.ELECTRON_USER_DATA) {
    // Running in Electron - store in user data folder
    return path.join(process.env.ELECTRON_USER_DATA, 'database.db');
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
