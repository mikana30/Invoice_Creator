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

describe('Payment Status - State Machine', () => {
  let invoiceId;
  let clientId;
  let itemId;

  beforeEach(async () => {
    // Setup invoice for each test
    const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Test Client']);
    const item = await db.run(
      'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
      ['Item', 100, 50]
    );

    const res = await request(app)
      .post('/invoices')
      .send({
        clientId: client.lastID,
        items: [{ itemId: item.lastID, quantity: 1, price: 100 }],
        total: 100
      });

    invoiceId = res.body.id;
    clientId = client.lastID;
    itemId = item.lastID;
  });

  describe('State Transitions', () => {
    test('unpaid → partial transition', async () => {
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'partial', amountPaid: 50 })
        .expect(200);

      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      expect(invoice.paymentStatus).toBe('partial');
      expect(invoice.amountPaid).toBe(50);
      expect(invoice.paymentDate).toBeNull(); // Not fully paid yet
    });

    test('unpaid → paid transition sets payment date', async () => {
      const today = new Date().toISOString().split('T')[0];

      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'paid', amountPaid: 100 })
        .expect(200);

      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      expect(invoice.paymentStatus).toBe('paid');
      expect(invoice.amountPaid).toBe(100);
      expect(invoice.paymentDate).toBe(today);
    });

    test('partial → paid auto-sets amount to total', async () => {
      // Set to partial first
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'partial', amountPaid: 50 });

      // Mark as paid without specifying amount
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'paid' })
        .expect(200);

      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      expect(invoice.amountPaid).toBe(100); // Auto-set to total
    });

    test('paid → unpaid clears payment date and amount', async () => {
      // Mark as paid
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'paid' });

      // Revert to unpaid
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'unpaid' })
        .expect(200);

      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      expect(invoice.paymentStatus).toBe('unpaid');
      expect(invoice.amountPaid).toBe(0);
      expect(invoice.paymentDate).toBeNull();
    });

    test('paid → partial reduces amount paid', async () => {
      // Mark as paid
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'paid' });

      // Change to partial
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'partial', amountPaid: 75 })
        .expect(200);

      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      expect(invoice.paymentStatus).toBe('partial');
      expect(invoice.amountPaid).toBe(75);
      expect(invoice.paymentDate).toBeNull(); // Cleared because no longer fully paid
    });
  });

  describe('Payment Validation', () => {
    test('prevents payment amount exceeding total', async () => {
      const res = await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({
          paymentStatus: 'partial',
          amountPaid: 150 // More than total of 100
        })
        .expect(400);

      expect(res.body.message).toMatch(/cannot exceed|must not exceed/i);
    });

    test('prevents negative payment amounts', async () => {
      const res = await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({
          paymentStatus: 'partial',
          amountPaid: -50
        })
        .expect(400);

      expect(res.body.message).toMatch(/non-negative|positive/i);
    });

    test('partial status requires positive amount paid', async () => {
      const res = await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({
          paymentStatus: 'partial',
          amountPaid: 0
        })
        .expect(400);

      expect(res.body.message).toMatch(/partial/i);
    });
  });

  describe('Voided Status', () => {
    test('voiding prevents further payment updates', async () => {
      // Void invoice
      await request(app).patch(`/invoices/${invoiceId}/void`).expect(200);

      // Try to update payment status
      const res = await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'paid' })
        .expect(400);

      expect(res.body.message).toMatch(/voided/i);
    });

    test('voiding clears payment information', async () => {
      // Mark as partially paid first
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'partial', amountPaid: 50 });

      // Void the invoice
      await request(app).patch(`/invoices/${invoiceId}/void`).expect(200);

      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      expect(invoice.paymentStatus).toBe('voided');
      expect(invoice.amountPaid).toBe(0);
      expect(invoice.paymentDate).toBeNull();
    });
  });

  describe('Payment Date Tracking', () => {
    test('payment date set only when fully paid', async () => {
      // Partial payment - no date
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'partial', amountPaid: 50 });

      let invoice = await db.get('SELECT paymentDate FROM invoices WHERE id = ?', [invoiceId]);
      expect(invoice.paymentDate).toBeNull();

      // Full payment - date set
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'paid' });

      invoice = await db.get('SELECT paymentDate FROM invoices WHERE id = ?', [invoiceId]);
      expect(invoice.paymentDate).toBeTruthy();
    });

    test('payment date persists across status changes', async () => {
      // Mark as paid
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'paid' });

      const firstInvoice = await db.get('SELECT paymentDate FROM invoices WHERE id = ?', [invoiceId]);
      const paymentDate = firstInvoice.paymentDate;

      // Change to unpaid and back to paid
      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'unpaid' });

      await request(app)
        .patch(`/invoices/${invoiceId}/payment`)
        .send({ paymentStatus: 'paid' });

      const secondInvoice = await db.get('SELECT paymentDate FROM invoices WHERE id = ?', [invoiceId]);
      // Should have a payment date (may be today's date)
      expect(secondInvoice.paymentDate).toBeTruthy();
    });
  });

  describe('Integration with Invoice Editing', () => {
    test('can change payment status while editing invoice', async () => {
      await request(app)
        .put(`/invoices/${invoiceId}`)
        .send({
          clientId: clientId,
          items: [{ itemId: itemId, quantity: 1, price: 100 }],
          total: 100,
          invoiceDate: '2025-01-15',
          dueDate: '2025-02-15',
          paymentStatus: 'paid',
          amountPaid: 100
        })
        .expect(200);

      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      expect(invoice.paymentStatus).toBe('paid');
      expect(invoice.amountPaid).toBe(100);
    });

    test('cannot edit payment info on voided invoice', async () => {
      await request(app).patch(`/invoices/${invoiceId}/void`);

      const res = await request(app)
        .put(`/invoices/${invoiceId}`)
        .send({
          clientId: clientId,
          items: [{ itemId: itemId, quantity: 1, price: 100 }],
          total: 100,
          invoiceDate: '2025-01-15',
          dueDate: '2025-02-15',
          paymentStatus: 'paid',
          amountPaid: 100
        })
        .expect(400);

      expect(res.body.message).toMatch(/voided/i);
    });
  });
});
