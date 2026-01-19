const request = require('supertest');
const { initializeTestDb, resetTestDb, openTestDb, closeTestDb } = require('./helpers/testDatabase');
const { seedClients, seedItems } = require('./helpers/factories');

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

describe('Realistic Volume Testing', () => {
  describe('Client Management at Scale', () => {
    test('handles 100 clients efficiently', async () => {
      // Seed 100 clients
      const startSeed = Date.now();
      const clients = await seedClients(db, 100);
      const seedDuration = Date.now() - startSeed;

      console.log(`Seeded 100 clients in ${seedDuration}ms`);
      expect(clients).toHaveLength(100);
      expect(seedDuration).toBeLessThan(5000); // Should complete in < 5s

      // Test fetching all clients
      const startFetch = Date.now();
      const res = await request(app).get('/clients').expect(200);
      const fetchDuration = Date.now() - startFetch;

      console.log(`Fetched 100 clients in ${fetchDuration}ms`);
      expect(res.body).toHaveLength(100);
      expect(fetchDuration).toBeLessThan(1000); // Should complete in < 1s
    }, 30000);

    test('search works with 100+ clients', async () => {
      const clients = await seedClients(db, 150);

      // Search for specific client
      const searchTerm = clients[75].name.split(' ')[0];

      const startSearch = Date.now();
      const res = await request(app)
        .get(`/clients/search?q=${encodeURIComponent(searchTerm)}`)
        .expect(200);
      const searchDuration = Date.now() - startSearch;

      console.log(`Client search completed in ${searchDuration}ms`);
      expect(res.body.length).toBeGreaterThan(0);
      expect(searchDuration).toBeLessThan(500); // Fast search
    }, 30000);
  });

  describe('Item Management at Scale', () => {
    test('handles 150 items efficiently', async () => {
      const startSeed = Date.now();
      const items = await seedItems(db, 150);
      const seedDuration = Date.now() - startSeed;

      console.log(`Seeded 150 items in ${seedDuration}ms`);
      expect(items).toHaveLength(150);

      // Test fetching all items
      const startFetch = Date.now();
      const res = await request(app).get('/items').expect(200);
      const fetchDuration = Date.now() - startFetch;

      console.log(`Fetched 150 items in ${fetchDuration}ms`);
      expect(res.body).toHaveLength(150);
      expect(fetchDuration).toBeLessThan(1500); // Should complete in < 1.5s
    }, 30000);

    test('item search performs well with 150+ items', async () => {
      const items = await seedItems(db, 150);

      const searchTerm = items[100].name.split(' ')[0];

      const startSearch = Date.now();
      const res = await request(app)
        .get(`/items/search?q=${encodeURIComponent(searchTerm)}`)
        .expect(200);
      const searchDuration = Date.now() - startSearch;

      console.log(`Item search completed in ${searchDuration}ms`);
      expect(res.body.length).toBeGreaterThan(0);
      expect(searchDuration).toBeLessThan(500);
    }, 30000);
  });

  describe('Invoice Volume Testing', () => {
    test('creates 200 invoices with good performance', async () => {
      // Setup
      console.log('Setting up data for 200 invoices...');
      const clients = await seedClients(db, 50);
      const items = await seedItems(db, 30);

      console.log('Creating 200 invoices...');
      const startCreate = Date.now();

      // Create 200 invoices
      for (let i = 0; i < 200; i++) {
        const clientId = clients[i % clients.length].id;
        const itemId = items[i % items.length].id;

        await request(app)
          .post('/invoices')
          .send({
            clientId,
            items: [{ itemId, quantity: 1, price: 50 }],
            total: 50
          })
          .expect(200);

        if (i % 50 === 0 && i > 0) {
          console.log(`  Created ${i} invoices...`);
        }
      }

      const createDuration = Date.now() - startCreate;
      console.log(`Created 200 invoices in ${createDuration}ms (${(createDuration / 200).toFixed(2)}ms/invoice)`);

      // Verify all created
      const invoiceCount = await db.get('SELECT COUNT(*) as count FROM invoices');
      expect(invoiceCount.count).toBe(200);

      // Test fetching all invoices
      const startFetch = Date.now();
      const res = await request(app).get('/invoices').expect(200);
      const fetchDuration = Date.now() - startFetch;

      console.log(`Fetched 200 invoices in ${fetchDuration}ms`);
      expect(res.body).toHaveLength(200);
      expect(fetchDuration).toBeLessThan(2000); // Should complete in < 2s
    }, 120000); // 2 minute timeout

    test('invoice number sequence remains correct with 100+ invoices', async () => {
      const clients = await seedClients(db, 20);
      const items = await seedItems(db, 10);

      const invoiceNumbers = [];

      // Create 100 invoices
      for (let i = 0; i < 100; i++) {
        const clientId = clients[i % clients.length].id;
        const itemId = items[i % items.length].id;

        const res = await request(app)
          .post('/invoices')
          .send({
            clientId,
            items: [{ itemId, quantity: 1, price: 50 }],
            total: 50
          });

        invoiceNumbers.push(res.body.invoiceNumber);
      }

      // Verify no duplicates
      const uniqueNumbers = new Set(invoiceNumbers);
      expect(uniqueNumbers.size).toBe(100);

      // Verify sequential (extract sequence numbers and check)
      const year = new Date().getFullYear();
      const sequences = invoiceNumbers.map(num => {
        const match = num.match(/INV-(\d{4})-(\d{3})/);
        return parseInt(match[2]);
      });

      // Should be 1-100
      expect(Math.min(...sequences)).toBe(1);
      expect(Math.max(...sequences)).toBe(100);
      expect(sequences.length).toBe(uniqueNumbers.size);
    }, 60000);
  });

  describe('Database Performance', () => {
    test('maintains performance with mixed operations', async () => {
      // Setup: 50 clients, 50 items
      const clients = await seedClients(db, 50);
      const items = await seedItems(db, 50);

      console.log('Running 100 mixed operations...');
      const startMixed = Date.now();

      // Perform 100 mixed operations
      for (let i = 0; i < 100; i++) {
        const operation = i % 4;

        switch (operation) {
          case 0: // Create invoice
            await request(app)
              .post('/invoices')
              .send({
                clientId: clients[i % clients.length].id,
                items: [{ itemId: items[i % items.length].id, quantity: 1, price: 50 }],
                total: 50
              });
            break;

          case 1: // Search clients
            await request(app).get('/clients/search?q=Test');
            break;

          case 2: // Fetch items
            await request(app).get('/items');
            break;

          case 3: // Fetch invoices
            await request(app).get('/invoices');
            break;
        }

        if (i % 25 === 0 && i > 0) {
          console.log(`  Completed ${i} operations...`);
        }
      }

      const mixedDuration = Date.now() - startMixed;
      console.log(`100 mixed operations completed in ${mixedDuration}ms (${(mixedDuration / 100).toFixed(2)}ms/operation)`);

      expect(mixedDuration).toBeLessThan(30000); // Should complete in < 30s
    }, 60000);

    test('database remains consistent after many operations', async () => {
      const client = await db.run('INSERT INTO clients (name) VALUES (?)', ['Consistency Test Client']);
      const item = await db.run(
        'INSERT INTO items (name, price, inventory) VALUES (?, ?, ?)',
        ['Consistency Item', 100, 500]
      );

      // Create 50 invoices
      for (let i = 0; i < 50; i++) {
        await request(app)
          .post('/invoices')
          .send({
            clientId: client.lastID,
            items: [{ itemId: item.lastID, quantity: 1, price: 100 }],
            total: 100
          });
      }

      // Verify counts match
      const invoiceCount = await db.get('SELECT COUNT(*) as count FROM invoices');
      const invoiceItemsCount = await db.get('SELECT COUNT(*) as count FROM invoice_items');
      const itemInventory = await db.get('SELECT inventory FROM items WHERE id = ?', [item.lastID]);

      // Every invoice should have invoice_items
      expect(invoiceItemsCount.count).toBe(invoiceCount.count);

      // Inventory should be exactly: 500 - 50
      expect(itemInventory.inventory).toBe(450);

      // Verify all invoice numbers are unique
      const duplicates = await db.get(`
        SELECT invoiceNumber, COUNT(*) as count
        FROM invoices
        GROUP BY invoiceNumber
        HAVING count > 1
      `);
      expect(duplicates).toBeUndefined();
    }, 60000);
  });

  describe('Query Performance with Indexes', () => {
    test('invoice queries use indexes effectively', async () => {
      // Create substantial data
      const clients = await seedClients(db, 30);
      const items = await seedItems(db, 20);

      // Create 100 invoices
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post('/invoices')
          .send({
            clientId: clients[i % clients.length].id,
            items: [{ itemId: items[i % items.length].id, quantity: 1, price: 50 }],
            total: 50
          });
      }

      // Test query performance
      const start = Date.now();
      const result = await db.all(`
        SELECT i.*, c.name as clientName
        FROM invoices i
        LEFT JOIN clients c ON i.clientId = c.id
        WHERE i.paymentStatus = 'unpaid'
        ORDER BY i.invoiceDate DESC
        LIMIT 20
      `);
      const duration = Date.now() - start;

      console.log(`Indexed query completed in ${duration}ms`);
      expect(duration).toBeLessThan(100); // Should be very fast with indexes
    }, 60000);
  });
});
