const { openDb } = require('./database');

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

  // Create inventory_products table if it doesn't exist (for existing databases)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      quantity INTEGER DEFAULT 0,
      reorderLevel INTEGER DEFAULT 0
    );
  `);

  // Add columns if they don't exist (for existing databases)
  const columnsToAdd = [
    // Existing migrations
    { table: 'clients', column: 'email', type: 'TEXT' },
    { table: 'clients', column: 'street', type: 'TEXT' },
    { table: 'clients', column: 'street2', type: 'TEXT' },
    { table: 'clients', column: 'city', type: 'TEXT' },
    { table: 'clients', column: 'state', type: 'TEXT' },
    { table: 'clients', column: 'zip', type: 'TEXT' },
    { table: 'invoices', column: 'invoiceDate', type: 'TEXT' },
    { table: 'settings', column: 'businessStreet', type: 'TEXT' },
    { table: 'settings', column: 'businessStreet2', type: 'TEXT' },
    { table: 'settings', column: 'businessCity', type: 'TEXT' },
    { table: 'settings', column: 'businessState', type: 'TEXT' },
    { table: 'settings', column: 'businessZip', type: 'TEXT' },
    { table: 'settings', column: 'bannerImage', type: 'TEXT' },
    // Invoice enhancements
    { table: 'invoices', column: 'invoiceNumber', type: 'TEXT' },
    { table: 'invoices', column: 'dueDate', type: 'TEXT' },
    { table: 'invoices', column: 'paymentStatus', type: "TEXT DEFAULT 'unpaid'" },
    { table: 'invoices', column: 'amountPaid', type: 'REAL DEFAULT 0' },
    // Item cost & inventory
    { table: 'items', column: 'cost', type: 'REAL DEFAULT 0' },
    { table: 'items', column: 'inventory', type: 'INTEGER DEFAULT 0' },
    { table: 'items', column: 'reorderLevel', type: 'INTEGER DEFAULT 0' },
    // Settings enhancements
    { table: 'settings', column: 'invoiceNumberPrefix', type: "TEXT DEFAULT 'INV'" },
    { table: 'settings', column: 'invoiceNumberNextSequence', type: 'INTEGER DEFAULT 1' },
    { table: 'settings', column: 'defaultPaymentTerms', type: 'INTEGER DEFAULT 30' },
    { table: 'settings', column: 'sellingFeePercent', type: 'REAL DEFAULT 0' },
    { table: 'settings', column: 'sellingFeeFixed', type: 'REAL DEFAULT 0' },
    // Shared inventory
    { table: 'items', column: 'baseInventoryId', type: 'INTEGER' },
    // Invoice notes/memo
    { table: 'invoices', column: 'notes', type: 'TEXT' },
    // Payment date tracking
    { table: 'invoices', column: 'paymentDate', type: 'TEXT' },
    // Item archive feature
    { table: 'items', column: 'active', type: 'INTEGER DEFAULT 1' },
  ];

  for (const { table, column, type } of columnsToAdd) {
    try {
      await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (e) { /* column already exists */ }
  }

  // Add unique index on invoiceNumber to prevent duplicates
  try {
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoiceNumber ON invoices(invoiceNumber)`);
  } catch (e) { /* index already exists or invoiceNumber column doesn't exist yet */ }

  // Performance indexes for queries at scale (1000+ invoices)
  const indexesToCreate = [
    'CREATE INDEX IF NOT EXISTS idx_invoices_clientId ON invoices(clientId)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_paymentStatus ON invoices(paymentStatus)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_invoiceDate ON invoices(invoiceDate)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_paymentDate ON invoices(paymentDate)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoiceId ON invoice_items(invoiceId)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_items_itemId ON invoice_items(itemId)',
    'CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name)',
    'CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)',
  ];

  for (const sql of indexesToCreate) {
    try {
      await db.exec(sql);
    } catch (e) { /* index already exists */ }
  }

  console.log('Database initialized.');
}

initDb();
