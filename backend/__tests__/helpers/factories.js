// Simple test data generator (no external dependencies needed)
const faker = {
  company: {
    name: () => `Company ${Math.random().toString(36).substring(7)}`
  },
  location: {
    streetAddress: () => `${Math.floor(Math.random() * 9999)} Main St`,
    secondaryAddress: () => `Apt ${Math.floor(Math.random() * 999)}`,
    city: () => `City ${Math.floor(Math.random() * 100)}`,
    state: ({ abbreviated }) => abbreviated ? ['CA', 'NY', 'TX', 'FL'][Math.floor(Math.random() * 4)] : 'California',
    zipCode: () => String(Math.floor(10000 + Math.random() * 90000))
  },
  phone: {
    number: () => `555-${Math.floor(1000 + Math.random() * 9000)}`
  },
  internet: {
    email: () => `user${Math.random().toString(36).substring(7)}@example.com`
  },
  commerce: {
    productAdjective: () => ['Premium', 'Deluxe', 'Standard', 'Basic'][Math.floor(Math.random() * 4)],
    product: () => ['Widget', 'Gadget', 'Tool', 'Item'][Math.floor(Math.random() * 4)],
    productMaterial: () => ['Metal', 'Plastic', 'Wood', 'Glass'][Math.floor(Math.random() * 4)]
  },
  number: {
    float: ({ min, max, fractionDigits }) => {
      const num = min + Math.random() * (max - min);
      return parseFloat(num.toFixed(fractionDigits || 2));
    },
    int: ({ min, max }) => Math.floor(min + Math.random() * (max - min + 1))
  },
  date: {
    recent: ({ days }) => new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000)
  },
  lorem: {
    sentence: () => 'This is a test note for the invoice.'
  }
};

// Generate realistic client data
function createClient(overrides = {}) {
  const f = faker;
  return {
    name: f.company.name(),
    street: f.location.streetAddress(),
    street2: Math.random() > 0.7 ? f.location.secondaryAddress() : '',
    city: f.location.city(),
    state: f.location.state({ abbreviated: true }),
    zip: f.location.zipCode(),
    phone: f.phone.number(),
    email: f.internet.email(),
    ...overrides
  };
}

// Generate item data
function createItem(overrides = {}) {
  const f = getFaker();
  const price = f.number.float({ min: 5, max: 500, fractionDigits: 2 });
  const cost = price * f.number.float({ min: 0.3, max: 0.7, fractionDigits: 2 });

  return {
    name: `${f.commerce.productAdjective()} ${f.commerce.product()}`,
    price,
    cost,
    inventory: f.number.int({ min: 0, max: 100 }),
    reorderLevel: f.number.int({ min: 5, max: 20 }),
    ...overrides
  };
}

// Generate inventory product
function createInventoryProduct(overrides = {}) {
  const f = getFaker();
  return {
    name: `Inventory: ${f.commerce.productMaterial()}`,
    quantity: f.number.int({ min: 0, max: 500 }),
    reorderLevel: f.number.int({ min: 10, max: 50 }),
    ...overrides
  };
}

// Generate invoice data
function createInvoice(clientId, items, overrides = {}) {
  const f = getFaker();
  const invoiceDate = f.date.recent({ days: 90 }).toISOString().split('T')[0];
  const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return {
    clientId,
    items,
    total,
    invoiceDate,
    notes: Math.random() > 0.7 ? f.lorem.sentence() : null,
    ...overrides
  };
}

// Generate invoice item
function createInvoiceItem(itemId, overrides = {}) {
  const f = getFaker();
  return {
    itemId,
    quantity: f.number.int({ min: 1, max: 10 }),
    price: f.number.float({ min: 10, max: 200, fractionDigits: 2 }),
    taxExempt: Math.random() > 0.8,
    ...overrides
  };
}

// Bulk generators for load testing
async function seedClients(db, count = 100) {
  const clients = [];
  for (let i = 0; i < count; i++) {
    const client = createClient();
    const result = await db.run(
      'INSERT INTO clients (name, street, street2, city, state, zip, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [client.name, client.street, client.street2, client.city, client.state, client.zip, client.phone, client.email]
    );
    clients.push({ id: result.lastID, ...client });
  }
  return clients;
}

async function seedItems(db, count = 100) {
  const f = faker;
  const items = [];
  for (let i = 0; i < count; i++) {
    const item = createItem({ name: `Item ${i} - ${f.commerce.product()}` });
    const result = await db.run(
      'INSERT INTO items (name, price, cost, inventory, reorderLevel) VALUES (?, ?, ?, ?, ?)',
      [item.name, item.price, item.cost, item.inventory, item.reorderLevel]
    );
    items.push({ id: result.lastID, ...item });
  }
  return items;
}

async function seedInventoryProducts(db, count = 20) {
  const f = faker;
  const products = [];
  for (let i = 0; i < count; i++) {
    const product = createInventoryProduct({ name: `Shared Inventory ${i} - ${f.commerce.productMaterial()}` });
    const result = await db.run(
      'INSERT INTO inventory_products (name, quantity, reorderLevel) VALUES (?, ?, ?)',
      [product.name, product.quantity, product.reorderLevel]
    );
    products.push({ id: result.lastID, ...product });
  }
  return products;
}

module.exports = {
  createClient,
  createItem,
  createInventoryProduct,
  createInvoice,
  createInvoiceItem,
  seedClients,
  seedItems,
  seedInventoryProducts
};
