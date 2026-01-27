/**
 * Invoice Creator Database Schema
 * Copyright (c) 2025 Blue Line Scannables
 * All Rights Reserved - Proprietary Software
 * Build ID: BLS-IC-7X9K2M4P | Auth: 0x424C53
 */
const { openDb } = require('./database');
const _dbSig = 'BLS-IC-' + (0x7E9).toString();

async function initDb() {
  const db = await openDb();

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

    -- Unified items table: raw materials, products, bundles - everything is an item
    -- Any item can be sold directly AND/OR used as a component of another item
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL DEFAULT 0,
      cost REAL DEFAULT 0,
      inventory INTEGER DEFAULT 0,
      reorderLevel INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    -- Item components: items can contain other items (recursive/hierarchical)
    -- Example: "Gift Basket" contains "Mirror" + "Candle x2" + "Basket"
    -- And "Mirror" itself contains "Glass" + "Frame" + "Lights" etc.
    CREATE TABLE IF NOT EXISTS item_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parentItemId INTEGER NOT NULL,
      componentItemId INTEGER NOT NULL,
      quantityNeeded INTEGER NOT NULL DEFAULT 1,
      includeInCost INTEGER DEFAULT 1,
      FOREIGN KEY (parentItemId) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (componentItemId) REFERENCES items(id) ON DELETE RESTRICT
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
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      total REAL,
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
      businessName TEXT DEFAULT 'Your Business Name',
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
  `);

  // Add columns if they don't exist (for schema updates)
  const columnsToAdd = [
    { table: 'items', column: 'active', type: 'INTEGER DEFAULT 1' },
    { table: 'items', column: 'cost', type: 'REAL DEFAULT 0' },
    { table: 'items', column: 'inventory', type: 'INTEGER DEFAULT 0' },
    { table: 'items', column: 'reorderLevel', type: 'INTEGER DEFAULT 0' },
    { table: 'item_components', column: 'includeInCost', type: 'INTEGER DEFAULT 1' },
    { table: 'invoices', column: 'shipping', type: 'REAL DEFAULT 0' },
  ];

  for (const { table, column, type } of columnsToAdd) {
    try {
      await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (e) { /* column already exists */ }
  }

  // Migration: Rename old item_components columns if they exist
  // Old schema had: itemId, inventoryProductId
  // New schema has: parentItemId, componentItemId
  try {
    const tableInfo = await db.all(`PRAGMA table_info(item_components)`);
    console.log('Migration check - columns found:', tableInfo.map(c => c.name).join(', '));
    const hasOldColumns = tableInfo.some(col => col.name === 'itemId' || col.name === 'inventoryProductId');
    console.log('Has old columns?', hasOldColumns);

    if (hasOldColumns) {
      console.log('>>> MIGRATING item_components table to new schema...');

      // Create new table with correct schema
      await db.exec(`
        CREATE TABLE IF NOT EXISTS item_components_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parentItemId INTEGER NOT NULL,
          componentItemId INTEGER NOT NULL,
          quantityNeeded INTEGER NOT NULL DEFAULT 1,
          includeInCost INTEGER DEFAULT 1,
          FOREIGN KEY (parentItemId) REFERENCES items(id) ON DELETE CASCADE,
          FOREIGN KEY (componentItemId) REFERENCES items(id) ON DELETE RESTRICT
        )
      `);

      // Copy data from old table (mapping old column names to new)
      await db.exec(`
        INSERT INTO item_components_new (id, parentItemId, componentItemId, quantityNeeded, includeInCost)
        SELECT id, itemId, inventoryProductId, quantityNeeded, 1 FROM item_components
      `);

      // Drop old table and rename new one
      await db.exec(`DROP TABLE item_components`);
      await db.exec(`ALTER TABLE item_components_new RENAME TO item_components`);

      console.log('Migration complete: item_components table updated.');
    }
  } catch (e) {
    console.error('Migration check/run error:', e.message);
  }

  // Performance indexes
  const indexesToCreate = [
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoiceNumber ON invoices(invoiceNumber)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_clientId ON invoices(clientId)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_paymentStatus ON invoices(paymentStatus)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_invoiceDate ON invoices(invoiceDate)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoiceId ON invoice_items(invoiceId)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_items_itemId ON invoice_items(itemId)',
    'CREATE INDEX IF NOT EXISTS idx_item_components_parentItemId ON item_components(parentItemId)',
    'CREATE INDEX IF NOT EXISTS idx_item_components_componentItemId ON item_components(componentItemId)',
  ];

  for (const sql of indexesToCreate) {
    try {
      await db.exec(sql);
    } catch (e) { /* index already exists */ }
  }

  console.log('Database initialized.');
}

initDb();
