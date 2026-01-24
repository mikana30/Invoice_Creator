const express = require('express');
const cors = require('cors');
const path = require('path');
const { openDb } = require('./database');
require('./init-db'); // Initialize database tables on startup
const app = express();
const port = process.env.PORT || 3001;

/**
 * Invoice Creator - Backend Server
 * Copyright (c) 2025 Blue Line Scannables
 * All Rights Reserved. Proprietary and Confidential.
 * Unauthorized use, copying, or distribution is prohibited.
 * Build: BLS-IC-7X9K2M4P | Signature: 0x424C532D494332303235
 */
const _sig = Buffer.from('426c7565204c696e65205363616e6e61626c6573', 'hex').toString();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve static frontend files in production
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// Input validation helpers
function validatePositiveNumber(value, fieldName) {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) {
    return `${fieldName} must be a non-negative number`;
  }
  return null;
}

function validatePositiveInteger(value, fieldName) {
  const num = parseInt(value);
  if (isNaN(num) || num < 0) {
    return `${fieldName} must be a non-negative integer`;
  }
  return null;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.3.3' });
});

// Settings routes
app.get('/settings', async (req, res) => {
  const db = await openDb();
  let settings = await db.get('SELECT * FROM settings WHERE id = 1');
  if (!settings) {
    await db.run(`INSERT INTO settings (id) VALUES (1)`);
    settings = await db.get('SELECT * FROM settings WHERE id = 1');
  }
  res.json(settings);
});

app.put('/settings', async (req, res) => {
  const {
    businessName, businessStreet, businessStreet2, businessCity,
    businessState, businessZip, businessPhone, businessEmail,
    taxRate, bannerImage, invoiceNumberPrefix, invoiceNumberNextSequence,
    defaultPaymentTerms, sellingFeePercent, sellingFeeFixed
  } = req.body;
  const db = await openDb();
  await db.run(
    `UPDATE settings SET
      businessName = ?, businessStreet = ?, businessStreet2 = ?,
      businessCity = ?, businessState = ?, businessZip = ?,
      businessPhone = ?, businessEmail = ?, taxRate = ?, bannerImage = ?,
      invoiceNumberPrefix = ?, invoiceNumberNextSequence = ?,
      defaultPaymentTerms = ?, sellingFeePercent = ?, sellingFeeFixed = ?
    WHERE id = 1`,
    [businessName, businessStreet, businessStreet2, businessCity,
     businessState, businessZip, businessPhone, businessEmail, taxRate, bannerImage,
     invoiceNumberPrefix, invoiceNumberNextSequence, defaultPaymentTerms,
     sellingFeePercent, sellingFeeFixed]
  );
  res.json({ message: 'Settings updated' });
});

// Client routes
app.get('/clients', async (req, res) => {
  const db = await openDb();
  const clients = await db.all('SELECT * FROM clients ORDER BY name');
  res.json(clients);
});

app.get('/clients/search', async (req, res) => {
  const { q } = req.query;
  const db = await openDb();
  const clients = await db.all(
    'SELECT * FROM clients WHERE name LIKE ? ORDER BY name LIMIT 10',
    [`%${q || ''}%`]
  );
  res.json(clients);
});

app.post('/clients', async (req, res) => {
  const { name, street, street2, city, state, zip, phone, email } = req.body;

  // Validate required fields
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Client name is required' });
  }

  try {
    const db = await openDb();
    const result = await db.run(
      'INSERT INTO clients (name, street, street2, city, state, zip, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), street || '', street2 || '', city || '', state || '', zip || '', phone || '', email || '']
    );
    // Return the full client object so frontend has complete data
    res.json({
      id: result.lastID,
      name: name.trim(),
      street: street || '',
      street2: street2 || '',
      city: city || '',
      state: state || '',
      zip: zip || '',
      phone: phone || '',
      email: email || ''
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Failed to create client' });
  }
});

app.put('/clients/:id', async (req, res) => {
  const { name, street, street2, city, state, zip, phone, email } = req.body;
  const { id } = req.params;
  const db = await openDb();
  await db.run(
    'UPDATE clients SET name = ?, street = ?, street2 = ?, city = ?, state = ?, zip = ?, phone = ?, email = ? WHERE id = ?',
    [name, street, street2, city, state, zip, phone, email, id]
  );
  res.json({ message: 'Client updated' });
});

app.delete('/clients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await openDb();
    // Check if client has any invoices
    const invoiceCount = await db.get('SELECT COUNT(*) as count FROM invoices WHERE clientId = ?', [id]);
    if (invoiceCount.count > 0) {
      return res.status(400).json({
        message: `Cannot delete: this client has ${invoiceCount.count} invoice(s). Delete or reassign invoices first.`
      });
    }
    await db.run('DELETE FROM clients WHERE id = ?', [id]);
    res.json({ message: 'Client deleted' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Failed to delete client' });
  }
});

// Helper: Calculate item cost from components (recursive)
// Only includes components where includeInCost = 1 (or NULL for backwards compatibility)
async function calculateItemCost(db, itemId, visited = new Set()) {
  // Prevent infinite loops from circular references
  if (visited.has(itemId)) return 0;
  visited.add(itemId);

  const components = await db.all(
    'SELECT componentItemId, quantityNeeded, includeInCost FROM item_components WHERE parentItemId = ?',
    [itemId]
  );

  if (components.length === 0) {
    // No components - use item's own cost
    const item = await db.get('SELECT cost FROM items WHERE id = ?', [itemId]);
    return item ? parseFloat(item.cost) || 0 : 0;
  }

  // Sum up component costs (only those marked as includeInCost)
  let totalCost = 0;
  for (const comp of components) {
    // Include if includeInCost is 1 or NULL (backwards compatibility)
    if (comp.includeInCost === 0) continue;
    const componentCost = await calculateItemCost(db, comp.componentItemId, new Set(visited));
    totalCost += componentCost * comp.quantityNeeded;
  }
  return totalCost;
}

// Item routes - unified system where everything is an item
app.get('/items', async (req, res) => {
  try {
    const db = await openDb();
    const items = await db.all('SELECT * FROM items ORDER BY name');

    // For each item, get its components count and calculated cost
    for (const item of items) {
      const componentCount = await db.get(
        'SELECT COUNT(*) as count FROM item_components WHERE parentItemId = ?',
        [item.id]
      );
      item.componentCount = componentCount.count;

      // Calculate cost from components if it has any
      if (componentCount.count > 0) {
        item.calculatedCost = await calculateItemCost(db, item.id);
      }
    }

    res.json(items);
  } catch (error) {
    console.error('Error loading items:', error);
    res.status(500).json({ message: 'Failed to load items' });
  }
});

app.get('/items/search', async (req, res) => {
  const { q } = req.query;
  try {
    const db = await openDb();
    // Only return active items for autocomplete
    const items = await db.all(
      `SELECT * FROM items
       WHERE name LIKE ? AND (active = 1 OR active IS NULL)
       ORDER BY name LIMIT 15`,
      [`%${q || ''}%`]
    );
    res.json(items);
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({ message: 'Failed to search items' });
  }
});

app.post('/items', async (req, res) => {
  const { name, price = 0, cost = 0, inventory = 0, reorderLevel = 0, components = [] } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Item name is required' });
  }

  const db = await openDb();
  try {
    // Create the item
    const result = await db.run(
      'INSERT INTO items (name, price, cost, inventory, reorderLevel, active) VALUES (?, ?, ?, ?, ?, 1)',
      [name.trim(), parseFloat(price) || 0, parseFloat(cost) || 0, parseInt(inventory) || 0, parseInt(reorderLevel) || 0]
    );
    const itemId = result.lastID;

    // Add components if provided
    if (components.length > 0) {
      for (const comp of components) {
        if (comp.componentItemId && comp.quantityNeeded > 0) {
          await db.run(
            'INSERT INTO item_components (parentItemId, componentItemId, quantityNeeded, includeInCost) VALUES (?, ?, ?, ?)',
            [itemId, comp.componentItemId, comp.quantityNeeded, comp.includeInCost !== false ? 1 : 0]
          );
        }
      }
    }

    // Return the created item with calculated cost
    const newItem = await db.get('SELECT * FROM items WHERE id = ?', [itemId]);
    if (components.length > 0) {
      newItem.calculatedCost = await calculateItemCost(db, itemId);
    }

    res.json(newItem);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      // Item already exists - return it
      const existing = await db.get('SELECT * FROM items WHERE name = ?', [name.trim()]);
      res.json(existing);
    } else {
      console.error('Error creating item:', error);
      res.status(500).json({ message: 'Failed to create item' });
    }
  }
});

app.put('/items/:id', async (req, res) => {
  const { name, price = 0, cost = 0, inventory = 0, reorderLevel = 0, components } = req.body;
  const { id } = req.params;

  try {
    const db = await openDb();

    // Update the item
    await db.run(
      'UPDATE items SET name = ?, price = ?, cost = ?, inventory = ?, reorderLevel = ? WHERE id = ?',
      [name, parseFloat(price) || 0, parseFloat(cost) || 0, parseInt(inventory) || 0, parseInt(reorderLevel) || 0, id]
    );

    // Update components if provided
    if (components !== undefined) {
      // Clear existing components
      await db.run('DELETE FROM item_components WHERE parentItemId = ?', [id]);

      // Add new components
      for (const comp of components || []) {
        if (comp.componentItemId && comp.quantityNeeded > 0) {
          await db.run(
            'INSERT INTO item_components (parentItemId, componentItemId, quantityNeeded, includeInCost) VALUES (?, ?, ?, ?)',
            [id, comp.componentItemId, comp.quantityNeeded, comp.includeInCost !== false ? 1 : 0]
          );
        }
      }
    }

    res.json({ message: 'Item updated' });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Failed to update item' });
  }
});

app.delete('/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await openDb();

    // Check if item is used in any invoices
    const invoiceCount = await db.get('SELECT COUNT(*) as count FROM invoice_items WHERE itemId = ?', [id]);
    if (invoiceCount.count > 0) {
      return res.status(400).json({
        message: `Cannot delete: this item is used in ${invoiceCount.count} invoice(s).`
      });
    }

    // Check if item is used as a component of other items
    const componentCount = await db.get('SELECT COUNT(*) as count FROM item_components WHERE componentItemId = ?', [id]);
    if (componentCount.count > 0) {
      return res.status(400).json({
        message: `Cannot delete: this item is used as a component in ${componentCount.count} other item(s).`
      });
    }

    // Delete the item (item_components with this as parent will cascade delete)
    await db.run('DELETE FROM items WHERE id = ?', [id]);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

// Toggle item active status (archive/unarchive)
app.patch('/items/:id/active', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  try {
    const db = await openDb();
    await db.run('UPDATE items SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
    res.json({ message: active ? 'Item activated' : 'Item archived' });
  } catch (error) {
    console.error('Error toggling item status:', error);
    res.status(500).json({ message: 'Failed to update item status' });
  }
});

// Get components for an item
app.get('/items/:id/components', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await openDb();
    const components = await db.all(`
      SELECT ic.id, ic.componentItemId, ic.quantityNeeded, ic.includeInCost,
             i.name as componentName, i.price as componentPrice, i.cost as componentCost, i.inventory as componentInventory
      FROM item_components ic
      JOIN items i ON ic.componentItemId = i.id
      WHERE ic.parentItemId = ?
    `, [id]);
    res.json(components);
  } catch (error) {
    console.error('Error loading components:', error);
    res.status(500).json({ message: 'Failed to load components' });
  }
});

// Update components for an item
app.put('/items/:id/components', async (req, res) => {
  const { id } = req.params;
  const { components } = req.body;

  try {
    const db = await openDb();

    // Clear existing components
    await db.run('DELETE FROM item_components WHERE parentItemId = ?', [id]);

    // Add new components
    for (const comp of components || []) {
      if (comp.componentItemId && comp.quantityNeeded > 0) {
        await db.run(
          'INSERT INTO item_components (parentItemId, componentItemId, quantityNeeded, includeInCost) VALUES (?, ?, ?, ?)',
          [id, comp.componentItemId, comp.quantityNeeded, comp.includeInCost !== false ? 1 : 0]
        );
      }
    }

    // Return updated calculated cost
    const calculatedCost = await calculateItemCost(db, id);
    res.json({ message: 'Components updated', calculatedCost });
  } catch (error) {
    console.error('Error updating components:', error);
    res.status(500).json({ message: 'Failed to update components' });
  }
});

// Quick create an item (for inline creation in dropdowns)
// In unified system, any item can be sold directly OR used as a component
app.post('/items/quick-component', async (req, res) => {
  const { name, price = 0, cost = 0, inventory = 0 } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Item name is required' });
  }

  try {
    const db = await openDb();
    const result = await db.run(
      'INSERT INTO items (name, price, cost, inventory, reorderLevel, active) VALUES (?, ?, ?, ?, 0, 1)',
      [name.trim(), parseFloat(price) || 0, parseFloat(cost) || 0, parseInt(inventory) || 0]
    );

    const newItem = await db.get('SELECT * FROM items WHERE id = ?', [result.lastID]);
    res.json(newItem);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      // Already exists - return it
      const existing = await db.get('SELECT * FROM items WHERE name = ?', [name.trim()]);
      res.json(existing);
    } else {
      console.error('Error creating component:', error);
      res.status(500).json({ message: 'Failed to create component' });
    }
  }
});


// Invoice routes
app.get('/invoices', async (req, res) => {
  const db = await openDb();
  const invoices = await db.all(`
    SELECT i.id, i.invoiceNumber, i.invoiceDate, i.dueDate, i.paymentStatus,
           i.amountPaid, i.paymentDate, i.createdAt, i.total, c.name as clientName
    FROM invoices i
    LEFT JOIN clients c ON i.clientId = c.id
    ORDER BY i.id DESC
  `);
  res.json(invoices);
});

app.get('/invoices/:id', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
  if (invoice) {
    invoice.items = await db.all(`
      SELECT ii.*, it.name as itemName, it.cost as itemCost
      FROM invoice_items ii
      LEFT JOIN items it ON ii.itemId = it.id
      WHERE ii.invoiceId = ?
    `, [id]);
    res.json(invoice);
  } else {
    res.status(404).json({ message: 'Invoice not found' });
  }
});

// Helper: Recursively decrement inventory for an item and its components
async function decrementInventory(db, itemId, quantity) {
  // Get components for this item
  const components = await db.all(
    `SELECT ic.componentItemId, ic.quantityNeeded, i.name as componentName, i.inventory
     FROM item_components ic
     JOIN items i ON ic.componentItemId = i.id
     WHERE ic.parentItemId = ?`,
    [itemId]
  );

  if (components.length > 0) {
    // Item has components - decrement each component's inventory (recursively)
    for (const comp of components) {
      const neededQty = comp.quantityNeeded * quantity;
      await decrementInventory(db, comp.componentItemId, neededQty);
    }
  } else {
    // No components - decrement this item's inventory directly
    await db.run(
      'UPDATE items SET inventory = inventory - ? WHERE id = ?',
      [quantity, itemId]
    );
  }
}

// Helper: Recursively check inventory for an item and its components
async function checkInventory(db, itemId, quantity, itemName) {
  const components = await db.all(
    `SELECT ic.componentItemId, ic.quantityNeeded, i.name as componentName, i.inventory
     FROM item_components ic
     JOIN items i ON ic.componentItemId = i.id
     WHERE ic.parentItemId = ?`,
    [itemId]
  );

  if (components.length > 0) {
    // Item has components - check each recursively
    for (const comp of components) {
      const neededQty = comp.quantityNeeded * quantity;
      const error = await checkInventory(db, comp.componentItemId, neededQty, comp.componentName);
      if (error) return error;
    }
    return null;
  } else {
    // No components - check this item's inventory directly
    const item = await db.get('SELECT inventory FROM items WHERE id = ?', [itemId]);
    if (item && item.inventory < quantity) {
      return `Insufficient inventory for "${itemName}". Available: ${item.inventory}, Needed: ${quantity}`;
    }
    return null;
  }
}

app.post('/invoices', async (req, res) => {
  const { clientId, items, total, invoiceDate, notes } = req.body;
  const db = await openDb();

  try {
    // Validate items
    for (const item of items) {
      const qtyError = validatePositiveInteger(item.quantity, 'Quantity');
      if (qtyError) return res.status(400).json({ message: qtyError });
      const priceError = validatePositiveNumber(item.price, 'Price');
      if (priceError) return res.status(400).json({ message: priceError });
    }

    // Start transaction
    await db.run('BEGIN IMMEDIATE');

    try {
      // Check inventory levels before creating invoice
      for (const item of items) {
        const itemRecord = await db.get('SELECT id, name, inventory FROM items WHERE id = ?', [item.itemId]);
        if (!itemRecord) continue;

        const inventoryError = await checkInventory(db, item.itemId, item.quantity, itemRecord.name);
        if (inventoryError) {
          await db.run('ROLLBACK');
          return res.status(400).json({ message: inventoryError });
        }
      }

      // Get settings for invoice number and payment terms
      const settings = await db.get('SELECT * FROM settings WHERE id = 1');
      const prefix = settings.invoiceNumberPrefix || 'INV';
      const paymentTerms = settings.defaultPaymentTerms || 30;

      // Calculate due date
      const invDate = invoiceDate || new Date().toISOString().split('T')[0];
      const dueDateObj = new Date(invDate);
      dueDateObj.setDate(dueDateObj.getDate() + paymentTerms);
      const dueDate = dueDateObj.toISOString().split('T')[0];

      // Generate invoice number
      const seq = settings.invoiceNumberNextSequence || 1;
      const year = new Date().getFullYear();
      const invoiceNumber = `${prefix}-${year}-${String(seq).padStart(3, '0')}`;

      // Insert invoice
      const result = await db.run(
        `INSERT INTO invoices (clientId, total, invoiceDate, invoiceNumber, dueDate, paymentStatus, amountPaid, notes)
         VALUES (?, ?, ?, ?, ?, 'unpaid', 0, ?)`,
        [clientId, total, invDate, invoiceNumber, dueDate, notes || null]
      );
      const invoiceId = result.lastID;

      // Increment invoice number sequence
      await db.run('UPDATE settings SET invoiceNumberNextSequence = ? WHERE id = 1', [seq + 1]);

      // Insert invoice items and decrement inventory
      for (const item of items) {
        await db.run(
          'INSERT INTO invoice_items (invoiceId, itemId, quantity, price, taxExempt) VALUES (?, ?, ?, ?, ?)',
          [invoiceId, item.itemId, item.quantity, item.price, item.taxExempt ? 1 : 0]
        );

        // Decrement inventory (recursively handles components)
        await decrementInventory(db, item.itemId, item.quantity);
      }

      await db.run('COMMIT');
      res.json({ id: invoiceId, invoiceNumber });

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error creating invoice:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ message: 'Invoice number conflict. Please try again.' });
    } else {
      res.status(500).json({ message: 'Failed to create invoice' });
    }
  }
});

// Helper: Recursively restore inventory for an item and its components
async function restoreInventory(db, itemId, quantity) {
  const components = await db.all(
    'SELECT componentItemId, quantityNeeded FROM item_components WHERE parentItemId = ?',
    [itemId]
  );

  if (components.length > 0) {
    for (const comp of components) {
      const restoreQty = comp.quantityNeeded * quantity;
      await restoreInventory(db, comp.componentItemId, restoreQty);
    }
  } else {
    await db.run(
      'UPDATE items SET inventory = inventory + ? WHERE id = ?',
      [quantity, itemId]
    );
  }
}

app.put('/invoices/:id', async (req, res) => {
  const { id } = req.params;
  const { clientId, items, total, invoiceDate, dueDate, paymentStatus, amountPaid, notes } = req.body;
  const db = await openDb();

  try {
    // Check if invoice exists and is not voided
    const existingInvoice = await db.get('SELECT paymentStatus, total FROM invoices WHERE id = ?', [id]);
    if (!existingInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    if (existingInvoice.paymentStatus === 'voided') {
      return res.status(400).json({ message: 'Cannot edit a voided invoice.' });
    }

    // Validate items
    for (const item of items) {
      const qtyError = validatePositiveInteger(item.quantity, 'Quantity');
      if (qtyError) return res.status(400).json({ message: qtyError });
      const priceError = validatePositiveNumber(item.price, 'Price');
      if (priceError) return res.status(400).json({ message: priceError });
    }

    // Start transaction
    await db.run('BEGIN IMMEDIATE');

    try {
      // Restore inventory from old items first
      const oldItems = await db.all('SELECT itemId, quantity FROM invoice_items WHERE invoiceId = ?', [id]);
      for (const oldItem of oldItems) {
        await restoreInventory(db, oldItem.itemId, oldItem.quantity);
      }

      // Check inventory for new items
      for (const item of items) {
        const itemRecord = await db.get('SELECT name FROM items WHERE id = ?', [item.itemId]);
        if (!itemRecord) continue;

        const inventoryError = await checkInventory(db, item.itemId, item.quantity, itemRecord.name);
        if (inventoryError) {
          await db.run('ROLLBACK');
          return res.status(400).json({ message: inventoryError });
        }
      }

      // Determine final amountPaid and paymentDate
      const newTotal = parseFloat(total) || 0;
      let finalAmountPaid = parseFloat(amountPaid) || 0;
      if (paymentStatus === 'paid') {
        finalAmountPaid = newTotal;
      } else if (paymentStatus === 'unpaid') {
        finalAmountPaid = 0;
      }

      // Handle payment date
      let newPaymentDate = null;
      if (paymentStatus === 'paid' && existingInvoice.paymentStatus !== 'paid') {
        newPaymentDate = new Date().toISOString().split('T')[0];
      } else if (paymentStatus === 'paid') {
        const currentInv = await db.get('SELECT paymentDate FROM invoices WHERE id = ?', [id]);
        newPaymentDate = currentInv.paymentDate;
      }

      // Update invoice
      await db.run(
        `UPDATE invoices SET clientId = ?, total = ?, invoiceDate = ?, dueDate = ?,
         paymentStatus = ?, amountPaid = ?, notes = ?, paymentDate = ? WHERE id = ?`,
        [clientId, total, invoiceDate, dueDate, paymentStatus || 'unpaid', finalAmountPaid, notes || null, newPaymentDate, id]
      );

      // Replace invoice items
      await db.run('DELETE FROM invoice_items WHERE invoiceId = ?', [id]);

      for (const item of items) {
        await db.run(
          'INSERT INTO invoice_items (invoiceId, itemId, quantity, price, taxExempt) VALUES (?, ?, ?, ?, ?)',
          [id, item.itemId, item.quantity, item.price, item.taxExempt ? 1 : 0]
        );
        await decrementInventory(db, item.itemId, item.quantity);
      }

      await db.run('COMMIT');
      res.json({ message: 'Invoice updated' });

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Failed to update invoice' });
  }
});

// Update payment status only
app.patch('/invoices/:id/payment', async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, amountPaid } = req.body;
  try {
    const db = await openDb();

    // Get invoice total for validation
    const invoice = await db.get('SELECT total, paymentStatus, paymentDate FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    if (invoice.paymentStatus === 'voided') {
      return res.status(400).json({ message: 'Cannot update payment on a voided invoice' });
    }

    // Validate amount paid doesn't exceed total
    let amount = parseFloat(amountPaid) || 0;
    const total = parseFloat(invoice.total) || 0;
    if (amount < 0) {
      return res.status(400).json({ message: 'Amount paid cannot be negative' });
    }
    if (amount > total) {
      return res.status(400).json({ message: `Amount paid ($${amount.toFixed(2)}) cannot exceed invoice total ($${total.toFixed(2)})` });
    }

    // Auto-set amount to total when marking as paid, reset when unpaid
    if (paymentStatus === 'paid') {
      amount = total;
    } else if (paymentStatus === 'unpaid') {
      amount = 0;
    }

    // Set payment date when first marked as paid
    let paymentDate = invoice.paymentDate;
    if (paymentStatus === 'paid' && invoice.paymentStatus !== 'paid') {
      paymentDate = new Date().toISOString().split('T')[0];
    } else if (paymentStatus !== 'paid') {
      paymentDate = null; // Clear payment date if no longer paid
    }

    await db.run(
      'UPDATE invoices SET paymentStatus = ?, amountPaid = ?, paymentDate = ? WHERE id = ?',
      [paymentStatus, amount, paymentDate, id]
    );
    res.json({ message: 'Payment updated', paymentDate });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: 'Failed to update payment' });
  }
});

// Void an invoice - restores inventory and marks as voided
app.patch('/invoices/:id/void', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();

  try {
    const invoice = await db.get('SELECT paymentStatus FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    if (invoice.paymentStatus === 'voided') {
      return res.status(400).json({ message: 'Invoice is already voided' });
    }

    await db.run('BEGIN IMMEDIATE');

    try {
      // Restore inventory from invoice items (recursively handles components)
      const items = await db.all('SELECT itemId, quantity FROM invoice_items WHERE invoiceId = ?', [id]);
      for (const item of items) {
        await restoreInventory(db, item.itemId, item.quantity);
      }

      // Mark invoice as voided
      await db.run(
        'UPDATE invoices SET paymentStatus = ?, amountPaid = 0, paymentDate = NULL WHERE id = ?',
        ['voided', id]
      );

      await db.run('COMMIT');
      res.json({ message: 'Invoice voided successfully' });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error voiding invoice:', error);
    res.status(500).json({ message: 'Failed to void invoice' });
  }
});

app.delete('/invoices/:id', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();

  try {
    const invoice = await db.get('SELECT paymentStatus FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await db.run('BEGIN IMMEDIATE');

    try {
      // Restore inventory if not already voided (recursively handles components)
      if (invoice.paymentStatus !== 'voided') {
        const items = await db.all('SELECT itemId, quantity FROM invoice_items WHERE invoiceId = ?', [id]);
        for (const item of items) {
          await restoreInventory(db, item.itemId, item.quantity);
        }
      }

      await db.run('DELETE FROM invoice_items WHERE invoiceId = ?', [id]);
      await db.run('DELETE FROM invoices WHERE id = ?', [id]);

      await db.run('COMMIT');
      res.json({ message: 'Invoice deleted and inventory restored' });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Failed to delete invoice' });
  }
});

// Full data restore from backup
app.post('/restore', async (req, res) => {
  const { settings, clients, items, inventoryProducts, invoices } = req.body;
  const db = await openDb();

  try {
    await db.run('BEGIN IMMEDIATE');

    try {
      // Restore settings
      if (settings) {
        await db.run(
          `UPDATE settings SET
            businessName = ?, businessStreet = ?, businessStreet2 = ?,
            businessCity = ?, businessState = ?, businessZip = ?,
            businessPhone = ?, businessEmail = ?, taxRate = ?, bannerImage = ?,
            invoiceNumberPrefix = ?, invoiceNumberNextSequence = ?,
            defaultPaymentTerms = ?, sellingFeePercent = ?, sellingFeeFixed = ?
          WHERE id = 1`,
          [settings.businessName, settings.businessStreet, settings.businessStreet2,
           settings.businessCity, settings.businessState, settings.businessZip,
           settings.businessPhone, settings.businessEmail, settings.taxRate, settings.bannerImage,
           settings.invoiceNumberPrefix, settings.invoiceNumberNextSequence,
           settings.defaultPaymentTerms, settings.sellingFeePercent, settings.sellingFeeFixed]
        );
      }

      // Clear existing data (in order due to foreign keys)
      await db.run('DELETE FROM invoice_items');
      await db.run('DELETE FROM invoices');
      await db.run('DELETE FROM items');
      await db.run('DELETE FROM inventory_products');
      await db.run('DELETE FROM clients');

      // Restore inventory products
      if (inventoryProducts && inventoryProducts.length > 0) {
        for (const product of inventoryProducts) {
          await db.run(
            'INSERT INTO inventory_products (id, name, quantity, reorderLevel) VALUES (?, ?, ?, ?)',
            [product.id, product.name, product.quantity || 0, product.reorderLevel || 0]
          );
        }
      }

      // Restore clients
      if (clients && clients.length > 0) {
        for (const client of clients) {
          await db.run(
            'INSERT INTO clients (id, name, street, street2, city, state, zip, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [client.id, client.name, client.street, client.street2, client.city, client.state, client.zip, client.phone, client.email]
          );
        }
      }

      // Restore items
      if (items && items.length > 0) {
        for (const item of items) {
          await db.run(
            'INSERT INTO items (id, name, price, cost, inventory, reorderLevel, baseInventoryId) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [item.id, item.name, item.price, item.cost || 0, item.inventory || 0, item.reorderLevel || 0, item.baseInventoryId]
          );
        }
      }

      // Restore invoices
      if (invoices && invoices.length > 0) {
        for (const invoice of invoices) {
          await db.run(
            `INSERT INTO invoices (id, clientId, invoiceNumber, invoiceDate, dueDate, paymentStatus, amountPaid, paymentDate, total, notes, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [invoice.id, invoice.clientId, invoice.invoiceNumber, invoice.invoiceDate, invoice.dueDate,
             invoice.paymentStatus, invoice.amountPaid || 0, invoice.paymentDate, invoice.total, invoice.notes, invoice.createdAt]
          );

          // Restore invoice items
          if (invoice.items && invoice.items.length > 0) {
            for (const item of invoice.items) {
              await db.run(
                'INSERT INTO invoice_items (invoiceId, itemId, quantity, price, taxExempt) VALUES (?, ?, ?, ?, ?)',
                [invoice.id, item.itemId, item.quantity, item.price, item.taxExempt ? 1 : 0]
              );
            }
          }
        }
      }

      await db.run('COMMIT');
      res.json({ message: 'Data restored successfully' });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error restoring data:', error);
    res.status(500).json({ message: 'Failed to restore data: ' + error.message });
  }
});

// Catch-all route to serve frontend for SPA routing
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

// Export app for testing
module.exports = { app };
