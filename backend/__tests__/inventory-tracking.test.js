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

describe('Inventory Tracking', () => {
  describe('Direct Inventory', () => {
    test('tracks inventory correctly across multiple operations', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        ['Tracked Item', 100, 50]
      );

      // Create invoice - should decrease to 45
      const inv1 = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 5, price: 100 }],
          total: 500
        });

      let itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(45);

      // Create another invoice - should decrease to 40
      const inv2 = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 5, price: 100 }],
          total: 500
        });

      itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(40);

      // Void first invoice - should restore to 45
      await request(app).patch(`/invoices/${inv1.body.id}/void`);

      itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(45);

      // Delete second invoice - should restore to 50
      await request(app).delete(`/invoices/${inv2.body.id}`);

      itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(50);
    });
  });

  describe('Shared Inventory', () => {
    test('creates invoice with shared inventory deduction', async () => {
      // Create shared inventory product
      const invProduct = await db.run(
        'INSERT INTO inventory_products (name, quantity, reorderLevel) VALUES (?, ?, ?)',
        ['Shared Material', 200, 10]
      );

      // Create item linked to shared inventory
      const item = await db.run(
        'INSERT INTO items (name, price, cost, baseInventoryId) VALUES (?, ?, ?, ?)',
        ['Product Using Shared Material', 75, 30, invProduct.lastID]
      );

      // Create client
      const client = await db.run('INSERT INTO clients (name, email) VALUES (?, ?)', ['Test Client', 'test@test.com']);

      // Create invoice
      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 10, price: 75, taxExempt: false }],
          total: 750,
          invoiceDate: '2025-01-15'
        })
        .expect(200);

      // Verify shared inventory deducted
      const invCheck = await db.get('SELECT quantity FROM inventory_products WHERE id = ?', [invProduct.lastID]);
      expect(invCheck.quantity).toBe(190); // 200 - 10

      // Verify item's local inventory unchanged (uses shared)
      const itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(0);
    });

    test('multiple items share same inventory pool', async () => {
      // Create one shared inventory product
      const invProduct = await db.run(
        'INSERT INTO inventory_products (name, quantity) VALUES (?, ?)',
        ['Common Material', 100]
      );

      // Create 3 different items all using the same shared inventory
      const item1 = await db.run(
        'INSERT INTO items (name, price, baseInventoryId) VALUES (?, ?, ?)',
        ['Product A', 50, invProduct.lastID]
      );
      const item2 = await db.run(
        'INSERT INTO items (name, price, baseInventoryId) VALUES (?, ?, ?)',
        ['Product B', 75, invProduct.lastID]
      );
      const item3 = await db.run(
        'INSERT INTO items (name, price, baseInventoryId) VALUES (?, ?, ?)',
        ['Product C', 100, invProduct.lastID]
      );

      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);

      // Create invoice with all 3 products
      await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [
            { itemId: item1.lastID, quantity: 10, price: 50 },
            { itemId: item2.lastID, quantity: 5, price: 75 },
            { itemId: item3.lastID, quantity: 3, price: 100 }
          ],
          total: 1075 // (10*50) + (5*75) + (3*100)
        })
        .expect(200);

      // Verify shared inventory decreased by total (10 + 5 + 3 = 18)
      const invCheck = await db.get('SELECT quantity FROM inventory_products WHERE id = ?', [invProduct.lastID]);
      expect(invCheck.quantity).toBe(82); // 100 - 18
    });

    test('shared inventory prevents negative quantities', async () => {
      const invProduct = await db.run(
        'INSERT INTO inventory_products (name, quantity) VALUES (?, ?)',
        ['Limited Material', 10]
      );

      const item = await db.run(
        'INSERT INTO items (name, price, baseInventoryId) VALUES (?, ?, ?)',
        ['Product', 100, invProduct.lastID]
      );

      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);

      // Try to order more than available
      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 15, price: 100 }],
          total: 1500
        })
        .expect(400);

      expect(res.body.message).toMatch(/insufficient inventory/i);

      // Verify shared inventory unchanged
      const invCheck = await db.get('SELECT quantity FROM inventory_products WHERE id = ?', [invProduct.lastID]);
      expect(invCheck.quantity).toBe(10);
    });

    test('voiding invoice restores shared inventory', async () => {
      const invProduct = await db.run(
        'INSERT INTO inventory_products (name, quantity) VALUES (?, ?)',
        ['Material', 100]
      );

      const item = await db.run(
        'INSERT INTO items (name, price, baseInventoryId) VALUES (?, ?, ?)',
        ['Product', 50, invProduct.lastID]
      );

      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);

      // Create invoice
      const createRes = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 20, price: 50 }],
          total: 1000
        });

      // Verify inventory decreased
      let invCheck = await db.get('SELECT quantity FROM inventory_products WHERE id = ?', [invProduct.lastID]);
      expect(invCheck.quantity).toBe(80);

      // Void invoice
      await request(app).patch(`/invoices/${createRes.body.id}/void`);

      // Verify inventory restored
      invCheck = await db.get('SELECT quantity FROM inventory_products WHERE id = ?', [invProduct.lastID]);
      expect(invCheck.quantity).toBe(100);
    });

    test('editing invoice adjusts shared inventory correctly', async () => {
      const invProduct = await db.run(
        'INSERT INTO inventory_products (name, quantity) VALUES (?, ?)',
        ['Material', 100]
      );

      const item = await db.run(
        'INSERT INTO items (name, price, baseInventoryId) VALUES (?, ?, ?)',
        ['Product', 50, invProduct.lastID]
      );

      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);

      // Create invoice with quantity 10
      const createRes = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 10, price: 50 }],
          total: 500
        });

      let invCheck = await db.get('SELECT quantity FROM inventory_products WHERE id = ?', [invProduct.lastID]);
      expect(invCheck.quantity).toBe(90); // 100 - 10

      // Edit invoice to quantity 15 (increase by 5)
      await request(app)
        .put(`/invoices/${createRes.body.id}`)
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 15, price: 50 }],
          total: 750,
          invoiceDate: '2025-01-15',
          dueDate: '2025-02-15',
          paymentStatus: 'unpaid',
          amountPaid: 0
        });

      invCheck = await db.get('SELECT quantity FROM inventory_products WHERE id = ?', [invProduct.lastID]);
      expect(invCheck.quantity).toBe(85); // 90 - 5

      // Edit invoice to quantity 8 (decrease by 7)
      await request(app)
        .put(`/invoices/${createRes.body.id}`)
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 8, price: 50 }],
          total: 400,
          invoiceDate: '2025-01-15',
          dueDate: '2025-02-15',
          paymentStatus: 'unpaid',
          amountPaid: 0
        });

      invCheck = await db.get('SELECT quantity FROM inventory_products WHERE id = ?', [invProduct.lastID]);
      expect(invCheck.quantity).toBe(92); // 85 + 7
    });
  });

  describe('Mixed Inventory', () => {
    test('handles invoice with both direct and shared inventory items', async () => {
      // Setup shared inventory
      const invProduct = await db.run(
        'INSERT INTO inventory_products (name, quantity) VALUES (?, ?)',
        ['Shared Material', 50]
      );

      // Item with shared inventory
      const sharedItem = await db.run(
        'INSERT INTO items (name, price, baseInventoryId) VALUES (?, ?, ?)',
        ['Shared Product', 100, invProduct.lastID]
      );

      // Item with direct inventory
      const directItem = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        ['Direct Product', 75, 30]
      );

      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);

      // Create invoice with both types
      await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [
            { itemId: sharedItem.lastID, quantity: 5, price: 100 },
            { itemId: directItem.lastID, quantity: 3, price: 75 }
          ],
          total: 725
        })
        .expect(200);

      // Verify shared inventory decreased
      const sharedCheck = await db.get('SELECT quantity FROM inventory_products WHERE id = ?', [invProduct.lastID]);
      expect(sharedCheck.quantity).toBe(45); // 50 - 5

      // Verify direct inventory decreased
      const directCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [directItem.lastID]);
      expect(directCheck.inventory).toBe(27); // 30 - 3
    });
  });
});
