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

describe('Boundary Conditions & Edge Values', () => {
  describe('Large Values', () => {
    test('handles very large invoice totals', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        ['Expensive Item', 999999.99, 10]
      );

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 5, price: 999999.99 }],
          total: 4999999.95
        })
        .expect(200);

      const invoice = await db.get('SELECT total FROM invoices WHERE id = ?', [res.body.id]);
      expect(invoice.total).toBeCloseTo(4999999.95, 2);
    });

    test('handles maximum inventory value', async () => {
      const maxInt = 2147483647; // SQLite INTEGER max

      const item = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        ['Max Inventory Item', 10, maxInt]
      );

      const itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(maxInt);
    });

    test('handles very long text fields', async () => {
      const longName = 'A'.repeat(500);
      const longNotes = 'B'.repeat(5000);

      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        [longName, 50, 10]
      );

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
          total: 50,
          notes: longNotes
        })
        .expect(200);

      const invoice = await db.get('SELECT notes FROM invoices WHERE id = ?', [res.body.id]);
      expect(invoice.notes.length).toBe(5000);
    });
  });

  describe('Small Values', () => {
    test('handles zero-price items', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        ['Free Item', 0, 10]
      );

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 0 }],
          total: 0
        })
        .expect(200);

      expect(res.body.id).toBeDefined();

      // Verify inventory still decremented
      const itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(9);
    });

    test('handles zero inventory items (made-to-order)', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        ['Made-to-Order Item', 100, 0]
      );

      // Should allow if we're tracking but not enforcing stock
      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 100 }],
          total: 100
        })
        .expect(400); // Should reject if insufficient inventory

      expect(res.body.message).toMatch(/insufficient inventory/i);
    });

    test('handles very small decimal prices', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        ['Cheap Item', 0.01, 100]
      );

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 0.01 }],
          total: 0.01
        })
        .expect(200);

      const invoice = await db.get('SELECT total FROM invoices WHERE id = ?', [res.body.id]);
      expect(invoice.total).toBeCloseTo(0.01, 2);
    });
  });

  describe('Floating Point Precision', () => {
    test('handles floating point arithmetic correctly', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        ['Item', 0.1, 100]
      );

      // 0.1 + 0.1 + 0.1 = 0.30000000000000004 in JavaScript
      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 3, price: 0.1 }],
          total: 0.3
        })
        .expect(200);

      const invoice = await db.get('SELECT total FROM invoices WHERE id = ?', [res.body.id]);
      expect(invoice.total).toBeCloseTo(0.3, 2);
    });

    test('handles tax calculations with decimals', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        ['Item', 99.99, 100]
      );

      // With 8% tax: 99.99 * 1.08 = 107.9892
      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 99.99, taxExempt: false }],
          total: 107.99 // Rounded
        })
        .expect(200);

      const invoice = await db.get('SELECT total FROM invoices WHERE id = ?', [res.body.id]);
      expect(invoice.total).toBeCloseTo(107.99, 2);
    });
  });

  describe('Empty and Null Values', () => {
    test('handles empty notes field', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
          total: 50,
          notes: ''
        })
        .expect(200);

      const invoice = await db.get('SELECT notes FROM invoices WHERE id = ?', [res.body.id]);
      expect(invoice.notes).toBe('');
    });

    test('handles null optional fields in client', async () => {
      const res = await request(app)
        .post('/clients')
        .send({
          name: 'Minimal Client',
          // All other fields omitted
        })
        .expect(200);

      const client = await db.get('SELECT * FROM clients WHERE id = ?', [res.body.id]);
      expect(client.name).toBe('Minimal Client');
      expect(client.street).toBeNull();
      expect(client.email).toBeNull();
    });
  });

  describe('Quantity Edge Cases', () => {
    test('handles single quantity (minimum)', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
          total: 50
        })
        .expect(200);

      expect(res.body.id).toBeDefined();
    });

    test('handles large quantity order', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 10, 1000]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 500, price: 10 }],
          total: 5000
        })
        .expect(200);

      const itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(500);
    });

    test('handles exact inventory depletion', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      // Order exactly the available amount
      await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 10, price: 50 }],
          total: 500
        })
        .expect(200);

      const itemCheck = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);
      expect(itemCheck.inventory).toBe(0);

      // Next order should fail
      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
          total: 50
        })
        .expect(400);

      expect(res.body.message).toMatch(/insufficient inventory/i);
    });
  });

  describe('Date Edge Cases', () => {
    test('handles invoice with due date before invoice date', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
          total: 50,
          invoiceDate: '2025-02-01',
          dueDate: '2025-01-01' // Before invoice date
        })
        .expect(400);

      expect(res.body.message).toMatch(/due date|after|before/i);
    });

    test('handles same invoice and due date', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
      const item = await db.run('INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)', ['Item', 50, 10]);

      const res = await request(app)
        .post('/invoices')
        .send({
          clientId: client.lastID,
          items: [{ itemId: item.lastID, quantity: 1, price: 50 }],
          total: 50,
          invoiceDate: '2025-01-15',
          dueDate: '2025-01-15' // Same day
        })
        .expect(200);

      expect(res.body.id).toBeDefined();
    });
  });
});
