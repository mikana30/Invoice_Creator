const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

let dbInstance = null;

// Get test database path
function getTestDbPath() {
  return process.env.TEST_DB_PATH || path.join(__dirname, '../test.db');
}

// Open test database with WAL mode
async function openTestDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getTestDbPath();

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable WAL mode for concurrent access testing
  await dbInstance.run('PRAGMA journal_mode = WAL');

  return dbInstance;
}

// Reset database - drop all data but keep schema
async function resetTestDb() {
  const db = await openTestDb();

  await db.exec(`
    DELETE FROM invoice_items;
    DELETE FROM invoices;
    DELETE FROM items;
    DELETE FROM inventory_products;
    DELETE FROM clients;
    UPDATE settings SET
      invoiceNumberNextSequence = 1,
      businessName = 'Test Business',
      businessStreet = '',
      businessStreet2 = '',
      businessCity = '',
      businessState = '',
      businessZip = '',
      businessPhone = '',
      businessEmail = '',
      taxRate = 0.08,
      defaultPaymentTerms = 30,
      sellingFeePercent = 0,
      sellingFeeFixed = 0,
      invoiceNumberPrefix = 'INV',
      bannerImage = ''
    WHERE id = 1;
  `);
}

// Initialize test database schema (mirrors init-db.js)
async function initializeTestDb() {
  const db = await openTestDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      street TEXT,
      street2 TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      phone TEXT,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      quantity INTEGER DEFAULT 0,
      reorderLevel INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      cost REAL DEFAULT 0,
      inventory INTEGER DEFAULT 0,
      reorderLevel INTEGER DEFAULT 0,
      baseInventoryId INTEGER,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (baseInventoryId) REFERENCES inventory_products(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER,
      invoiceNumber TEXT,
      invoiceDate TEXT DEFAULT CURRENT_TIMESTAMP,
      dueDate TEXT,
      paymentStatus TEXT DEFAULT 'unpaid',
      amountPaid REAL DEFAULT 0,
      paymentDate TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      total REAL,
      notes TEXT,
      FOREIGN KEY (clientId) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId INTEGER,
      itemId INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      taxExempt INTEGER DEFAULT 0,
      FOREIGN KEY (invoiceId) REFERENCES invoices(id),
      FOREIGN KEY (itemId) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      businessName TEXT DEFAULT 'Test Business',
      businessStreet TEXT DEFAULT '',
      businessStreet2 TEXT DEFAULT '',
      businessCity TEXT DEFAULT '',
      businessState TEXT DEFAULT '',
      businessZip TEXT DEFAULT '',
      businessPhone TEXT DEFAULT '',
      businessEmail TEXT DEFAULT '',
      taxRate REAL DEFAULT 0.08,
      bannerImage TEXT DEFAULT '',
      invoiceNumberPrefix TEXT DEFAULT 'INV',
      invoiceNumberNextSequence INTEGER DEFAULT 1,
      defaultPaymentTerms INTEGER DEFAULT 30,
      sellingFeePercent REAL DEFAULT 0,
      sellingFeeFixed REAL DEFAULT 0
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoiceNumber ON invoices(invoiceNumber);
    CREATE INDEX IF NOT EXISTS idx_invoices_clientId ON invoices(clientId);
    CREATE INDEX IF NOT EXISTS idx_invoices_paymentStatus ON invoices(paymentStatus);
    CREATE INDEX IF NOT EXISTS idx_invoices_invoiceDate ON invoices(invoiceDate);
    CREATE INDEX IF NOT EXISTS idx_invoices_paymentDate ON invoices(paymentDate);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoiceId ON invoice_items(invoiceId);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_itemId ON invoice_items(itemId);
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
    CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
  `);
}

// Close database connection
async function closeTestDb() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  openTestDb,
  resetTestDb,
  initializeTestDb,
  closeTestDb,
  getTestDbPath
};
