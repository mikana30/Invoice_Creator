const request = require('supertest');
const { initializeTestDb, resetTestDb, openTestDb, closeTestDb } = require('./helpers/testDatabase');

let app;
let db;

beforeAll(async () => {
  await initializeTestDb();
  db = await openTestDb();
  const indexModule = require('../index');
  app = indexModule.app;
}, 30000);

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

describe('Validation & Constraints', () => {
  describe('Input Validation', () => {
    test('rejects negative quantity', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: -1, price: 50 }],
          total: -50
        })
        .expect(400);

      expect(res.body.message).toMatch(/non-negative|positive/i);
    });

    test('rejects negative price', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: -50 }],
          total: -50
        })
        .expect(400);

      expect(res.body.message).toMatch(/non-negative|positive/i);
    });

    test('rejects zero quantity', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 0, price: 50 }],
          total: 0
        })
        .expect(400);

      expect(res.body.message).toMatch(/quantity|greater than zero/i);
    });
  });

  describe('Database Constraints', () => {
    test('prevents duplicate item names', async () => {
      // Create first item
      await request(app)
        .post('/items')
        .send({
          name: 'Unique Item',
          price: 100,
          cost: 50,
          inventory: 10
        })
        .expect(200);

      // Try to create second item with same name
      const res = await request(app)
        .post('/items')
        .send({
          name: 'Unique Item',
          price: 150,
          cost: 75,
          inventory: 20
        })
        .expect(200); // May return existing item instead of error

      // Verify only one item exists with this name
      const items = await db.all('SELECT * FROM items WHERE name = ?', ['Unique Item']);
      expect(items.length).toBeLessThanOrEqual(1);
    });

    test('prevents deleting client with invoices', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Client With Invoices']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      // Create invoice for client
      await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
          total: 50
        });

      // Try to delete client
      const res = await request(app)
        .delete(`/clients/${client.lastID}`)
        .expect(400);

      expect(res.body.message).toMatch(/cannot delete|has invoices/i);

      // Verify client still exists
      const clientCheck = await db.get('SELECT * FROM clients WHERE id = ?', [client.lastID]);
      expect(clientCheck).toBeDefined();
    });

    test('prevents deleting item used in invoices', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Used Item', 50, 10]);

      // Create invoice using item
      await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
          total: 50
        });

      // Try to delete item
      const res = await request(app)
        .delete(`/items/${item.lastID}`)
        .expect(400);

      expect(res.body.message).toMatch(/cannot delete|used in/i);
    });

    test('prevents deleting inventory product with linked items', async () => {
      const invProduct = await db.run(
        'INSERT INTO inventory_products (name, quantity) VALUES (?, ?)',
        ['Shared Inventory', 100]
      );

      // Link item to inventory
      await request(app)
        .post('/items')
        .send({
          name: 'Linked Item',
          price: 50,
          cost: 25,
          baseInventoryId: invProduct.lastID
        });

      // Try to delete inventory product
      const res = await request(app)
        .delete(`/inventory-products/${invProduct.lastID}`)
        .expect(400);

      expect(res.body.message).toMatch(/cannot delete|linked|items/i);
    });
  });

  describe('Missing Required Fields', () => {
    test('rejects invoice without client', async () => {
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      const res = await request(app)
        .post('/invoices')
        .send({
          items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
          total: 50
        })
        .expect(400);

      expect(res.body.message).toMatch(/client|required/i);
    });

    test('rejects invoice without items', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [],
          total: 0
        })
        .expect(400);

      expect(res.body.message).toMatch(/items|at least one/i);
    });

    test('rejects item without name', async () => {
      const res = await request(app)
        .post('/items')
        .send({
          price: 100,
          cost: 50,
          inventory: 10
        })
        .expect(400);

      expect(res.body.message).toMatch(/name|required/i);
    });

    test('rejects item without price', async () => {
      const res = await request(app)
        .post('/items')
        .send({
          name: 'Item Without Price',
          cost: 50,
          inventory: 10
        })
        .expect(400);

      expect(res.body.message).toMatch(/price|required/i);
    });
  });

  describe('Invalid References', () => {
    test('rejects invoice with non-existent client', async () => {
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: 99999, // Non-existent
          items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
          total: 50
        })
        .expect(400);

      expect(res.body.message).toMatch(/client|not found|does not exist/i);
    });

    test('rejects invoice with non-existent item', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: 99999, quantity: 1, price: 50 }], // Non-existent item
          total: 50
        })
        .expect(400);

      expect(res.body.message).toMatch(/item|not found|does not exist/i);
    });
  });

  describe('Data Type Validation', () => {
    test('handles non-numeric price gracefully', async () => {
      const res = await request(app)
        .post('/items')
        .send({
          name: 'Invalid Price Item',
          price: 'not-a-number',
          cost: 50,
          inventory: 10
        })
        .expect(400);

      expect(res.body.message).toMatch(/price|number|numeric/i);
    });

    test('handles non-numeric quantity gracefully', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 'five', price: 50 }],
          total: 250
        })
        .expect(400);

      expect(res.body.message).toMatch(/quantity|number|numeric/i);
    });
  });
});
