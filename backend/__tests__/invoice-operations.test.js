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

describe('Invoice Operations - Core Functionality', () => {
  describe('Invoice Creation', () => {
    test('creates invoice and decrements inventory', async () => {
      // Setup
      const client = await db.run('INSERT INTO clients (name, email) VALUES (?, ?)', ['Test Client', 'test@example.com']);
      const item = await db.run(
        'INSERT INTO items (name, price, cost, inventory) VALUES (?, ?, ?, ?)',
        ['Test Item', 50, 25, 100]
      );

      // Create invoice
      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 5, price: 50, taxExempt: false }],
          total: 250,
          invoiceDate: '2025-01-15',
          notes: 'Test invoice'
        })
        .expect(200);

      // Verify invoice created
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('invoiceNumber');
      expect(res.body.invoiceNumber).toMatch(/^INV-\d{4}-\d{3}$/);

      // Verify inventory decreased
      const itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(95); // 100 - 5

      // Verify invoice stored correctly
      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [res.body.id]);
      expect(invoice.total).toBe(250);
      expect(invoice.paymentStatus).toBe('unpaid');
      expect(invoice.notes).toBe('Test invoice');

      // Verify invoice items stored
      const invoiceItems = await db.all('SELECT * FROM invoice_items WHERE invoiceId = ?', [res.body.id]);
      expect(invoiceItems).toHaveLength(1);
      expect(invoiceItems[0].quantity).toBe(5);
      expect(invoiceItems[0].price).toBe(50);
    });

    test('creates invoice with multiple items', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Multi Item Client']);
      const item1 = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item 1', 10, 50]);
      const item2 = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item 2', 20, 30]);
      const item3 = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item 3', 30, 40]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [
            { itemId: item1.lastID, quantity: 2, price: 10, taxExempt: false },
            { itemId: item2.lastID, quantity: 3, price: 20, taxExempt: false },
            { itemId: item3.lastID, quantity: 1, price: 30, taxExempt: true }
          ],
          total: 110 // (2*10) + (3*20) + (1*30) = 110
        })
        .expect(200);

      // Verify all inventories decreased
      const item1Check = await db.get('SELECT inventory FROM items WHERE id = ?', [item1.lastID]);
      const item2Check = await db.get('SELECT inventory FROM items WHERE id = ?', [item2.lastID]);
      const item3Check = await db.get('SELECT inventory FROM items WHERE id = ?', [item3.lastID]);

      expect(item1Check.inventory).toBe(48); // 50 - 2
      expect(item2Check.inventory).toBe(27); // 30 - 3
      expect(item3Check.inventory).toBe(39); // 40 - 1

      // Verify invoice items
      const invoiceItems = await db.all('SELECT * FROM invoice_items WHERE invoiceId = ?', [res.body.id]);
      expect(invoiceItems).toHaveLength(3);
    });

    test('rejects invoice with insufficient inventory', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Low Stock Item', 100, 3]);

      // Try to order 5 when only 3 available
      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 5, price: 100, taxExempt: false }],
          total: 500
        })
        .expect(400);

      expect(res.body.message).toMatch(/insufficient inventory/i);

      // Verify inventory unchanged
      const itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(3);

      // Verify no invoice created
      const invoiceCount = await db.get('SELECT COUNT(*) as count FROM invoices');
      expect(invoiceCount.count).toBe(0);
    });

    test('generates sequential invoice numbers', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 100]);

      const year = new Date().getFullYear();
      const invoiceNumbers = [];

      // Create 3 invoices
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/invoices')
          .send({
            clientId: client.lastID,
            items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
            total: 50
          })
          .expect(200);

        invoiceNumbers.push(res.body.invoiceNumber);
      }

      // Verify sequential numbering
      expect(invoiceNumbers).toEqual([
        `INV-${year}-001`,
        `INV-${year}-002`,
        `INV-${year}-003`
      ]);
    });
  });

  describe('Invoice Editing', () => {
    test('updates invoice and adjusts inventory correctly', async () => {
      // Setup
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item1 = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item A', 50, 100]);
      const item2 = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item B', 75, 50]);

      // Create initial invoice: 5x Item A
      const createRes = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item1.lastID, quantity: 5, price: 50 }],
          total: 250
        });

      const invoiceId = createRes.body.id;

      // Verify initial inventory
      let item1Check = await db.get('SELECT inventory FROM items WHERE id = ?', [item1.lastID]);
      expect(item1Check.inventory).toBe(95); // 100 - 5

      // Update invoice to 3x Item A + 2x Item B
      await request(app)
        .put(`/invoices/${invoiceId}`)
        .send({
          clientId: client.lastID,
          items: [
            { itemId: item1.lastID, quantity: 3, price: 50 },
            { itemId: item2.lastID, quantity: 2, price: 75 }
          ],
          total: 300,
          invoiceDate: '2025-01-15',
          dueDate: '2025-02-15',
          paymentStatus: 'unpaid',
          amountPaid: 0
        })
        .expect(200);

      // Verify Item A restored +2 (from 5 to 3)
      item1Check = await db.get('SELECT inventory FROM items WHERE id = ?', [item1.lastID]);
      expect(item1Check.inventory).toBe(97); // 95 + 2

      // Verify Item B deducted -2
      const item2Check = await db.get('SELECT inventory FROM items WHERE id = ?', [item2.lastID]);
      expect(item2Check.inventory).toBe(48); // 50 - 2

      // Verify invoice items updated
      const invoiceItems = await db.all('SELECT * FROM invoice_items WHERE invoiceId = ? ORDER BY itemId', [invoiceId]);
      expect(invoiceItems).toHaveLength(2);
      expect(invoiceItems[0].quantity).toBe(3);
      expect(invoiceItems[1].quantity).toBe(2);
    });

    test('prevents editing voided invoice', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 100]);

      // Create and void invoice
      const createRes = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 5, price: 50 }],
          total: 250
        });

      await request(app).patch(`/invoices/${createRes.body.id}/void`).expect(200);

      // Try to edit voided invoice
      const res = await request(app)
        .put(`/invoices/${createRes.body.id}`)
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 3, price: 50 }],
          total: 150,
          invoiceDate: '2025-01-15',
          dueDate: '2025-02-15',
          paymentStatus: 'unpaid',
          amountPaid: 0
        })
        .expect(400);

      expect(res.body.message).toMatch(/voided/i);
    });
  });

  describe('Invoice Voiding', () => {
    test('voids invoice and restores inventory', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 100]);

      // Create invoice
      const createRes = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 10, price: 50 }],
          total: 500
        });

      // Verify inventory decreased
      let itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(90);

      // Void invoice
      await request(app).patch(`/invoices/${createRes.body.id}/void`).expect(200);

      // Verify inventory restored
      itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(100);

      // Verify invoice marked as voided
      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [createRes.body.id]);
      expect(invoice.paymentStatus).toBe('voided');
      expect(invoice.amountPaid).toBe(0);
      expect(invoice.paymentDate).toBeNull();
    });

    test('prevents double voiding', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 100]);

      const createRes = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 5, price: 50 }],
          total: 250
        });

      // Void once
      await request(app).patch(`/invoices/${createRes.body.id}/void`).expect(200);

      // Try to void again
      const res = await request(app)
        .patch(`/invoices/${createRes.body.id}/void`)
        .expect(400);

      expect(res.body.message).toMatch(/already voided/i);

      // Verify inventory not double-restored
      const itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(100); // Should be 100, not 105
    });
  });

  describe('Invoice Deletion', () => {
    test('deletes invoice and restores inventory', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 100]);

      const createRes = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 7, price: 50 }],
          total: 350
        });

      // Delete invoice
      await request(app).delete(`/invoices/${createRes.body.id}`).expect(200);

      // Verify invoice deleted
      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [createRes.body.id]);
      expect(invoice).toBeUndefined();

      // Verify inventory restored
      const itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(100);

      // Verify invoice items deleted
      const items = await db.all('SELECT * FROM invoice_items WHERE invoiceId = ?', [createRes.body.id]);
      expect(items).toHaveLength(0);
    });

    test('deletes voided invoice without double-restoring inventory', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 100]);

      const createRes = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 8, price: 50 }],
          total: 400
        });

      // Void first
      await request(app).patch(`/invoices/${createRes.body.id}/void`).expect(200);

      // Inventory should be back to 100
      let itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(100);

      // Delete voided invoice
      await request(app).delete(`/invoices/${createRes.body.id}`).expect(200);

      // Verify inventory not double-restored
      itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(100); // Should remain 100, not 108
    });
  });
});
