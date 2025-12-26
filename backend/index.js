const express = require('express');
const cors = require('cors');
const { openDb } = require('./database');
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

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

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
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
  const db = await openDb();
  const result = await db.run(
    'INSERT INTO clients (name, street, street2, city, state, zip, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, street, street2, city, state, zip, phone, email]
  );
  res.json({ id: result.lastID });
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

// Item routes
app.get('/items', async (req, res) => {
  const db = await openDb();
  const items = await db.all(`
    SELECT i.*, ip.name as baseInventoryName, ip.quantity as baseInventoryQty
    FROM items i
    LEFT JOIN inventory_products ip ON i.baseInventoryId = ip.id
    ORDER BY i.name
  `);
  res.json(items);
});

app.get('/items/search', async (req, res) => {
  const { q } = req.query;
  const db = await openDb();
  // Only return active items for autocomplete
  const items = await db.all(
    `SELECT i.*, ip.name as baseInventoryName, ip.quantity as baseInventoryQty
     FROM items i
     LEFT JOIN inventory_products ip ON i.baseInventoryId = ip.id
     WHERE i.name LIKE ? AND (i.active = 1 OR i.active IS NULL)
     ORDER BY i.name LIMIT 10`,
    [`%${q || ''}%`]
  );
  res.json(items);
});

app.post('/items', async (req, res) => {
  const { name, price, cost = 0, inventory = 0, reorderLevel = 0, baseInventoryId = null } = req.body;

  // Validate inputs
  const priceError = validatePositiveNumber(price, 'Price');
  if (priceError) return res.status(400).json({ message: priceError });
  const costError = validatePositiveNumber(cost, 'Cost');
  if (costError) return res.status(400).json({ message: costError });

  // Only validate inventory if not using shared inventory
  if (!baseInventoryId) {
    const invError = validatePositiveInteger(inventory, 'Inventory');
    if (invError) return res.status(400).json({ message: invError });
  }

  // When using shared inventory, ignore local inventory/reorderLevel
  const finalInventory = baseInventoryId ? 0 : parseInt(inventory);
  const finalReorderLevel = baseInventoryId ? 0 : (parseInt(reorderLevel) || 0);

  const db = await openDb();
  try {
    const result = await db.run(
      'INSERT INTO items (name, price, cost, inventory, reorderLevel, baseInventoryId) VALUES (?, ?, ?, ?, ?, ?)',
      [name, parseFloat(price), parseFloat(cost), finalInventory, finalReorderLevel, baseInventoryId]
    );
    res.json({ id: result.lastID, name, price: parseFloat(price), cost: parseFloat(cost), inventory: finalInventory, reorderLevel: finalReorderLevel, baseInventoryId });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      // Item exists, return existing item
      const existing = await db.get('SELECT * FROM items WHERE name = ?', [name]);
      res.json(existing);
    } else {
      res.status(500).json({ message: 'Error creating item' });
    }
  }
});

app.put('/items/:id', async (req, res) => {
  const { name, price, cost = 0, inventory = 0, reorderLevel = 0, baseInventoryId = null } = req.body;
  const { id } = req.params;

  // When using shared inventory, ignore local inventory/reorderLevel
  const finalInventory = baseInventoryId ? 0 : parseInt(inventory) || 0;
  const finalReorderLevel = baseInventoryId ? 0 : (parseInt(reorderLevel) || 0);

  const db = await openDb();
  await db.run(
    'UPDATE items SET name = ?, price = ?, cost = ?, inventory = ?, reorderLevel = ?, baseInventoryId = ? WHERE id = ?',
    [name, parseFloat(price), parseFloat(cost), finalInventory, finalReorderLevel, baseInventoryId, id]
  );
  res.json({ message: 'Item updated' });
});

app.delete('/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await openDb();
    // Check if item is used in any invoices
    const invoiceCount = await db.get('SELECT COUNT(*) as count FROM invoice_items WHERE itemId = ?', [id]);
    if (invoiceCount.count > 0) {
      return res.status(400).json({
        message: `Cannot delete: this item is used in ${invoiceCount.count} invoice(s). Historical data would be lost.`
      });
    }
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

// Inventory Products routes (shared inventory)
app.get('/inventory-products', async (req, res) => {
  const db = await openDb();
  const products = await db.all('SELECT * FROM inventory_products ORDER BY name');
  res.json(products);
});

app.post('/inventory-products', async (req, res) => {
  const { name, quantity = 0, reorderLevel = 0 } = req.body;
  const db = await openDb();
  try {
    const result = await db.run(
      'INSERT INTO inventory_products (name, quantity, reorderLevel) VALUES (?, ?, ?)',
      [name, quantity, reorderLevel]
    );
    res.json({ id: result.lastID, name, quantity, reorderLevel });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ message: 'Inventory product with this name already exists' });
    } else {
      res.status(500).json({ message: 'Error creating inventory product' });
    }
  }
});

app.put('/inventory-products/:id', async (req, res) => {
  const { name, quantity = 0, reorderLevel = 0 } = req.body;
  const { id } = req.params;
  const db = await openDb();
  await db.run(
    'UPDATE inventory_products SET name = ?, quantity = ?, reorderLevel = ? WHERE id = ?',
    [name, quantity, reorderLevel, id]
  );
  res.json({ message: 'Inventory product updated' });
});

app.delete('/inventory-products/:id', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  // Check if any items are linked to this inventory product
  const linkedItems = await db.get('SELECT COUNT(*) as count FROM items WHERE baseInventoryId = ?', [id]);
  if (linkedItems.count > 0) {
    return res.status(400).json({ message: 'Cannot delete: items are linked to this inventory' });
  }
  await db.run('DELETE FROM inventory_products WHERE id = ?', [id]);
  res.json({ message: 'Inventory product deleted' });
});

// Get items linked to a specific inventory product
app.get('/inventory-products/:id/items', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  const items = await db.all('SELECT * FROM items WHERE baseInventoryId = ?', [id]);
  res.json(items);
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

    // Start transaction with IMMEDIATE lock to prevent race conditions
    await db.run('BEGIN IMMEDIATE');

    try {
      // Check inventory levels before creating invoice
      for (const item of items) {
        const itemRecord = await db.get('SELECT id, name, inventory, baseInventoryId FROM items WHERE id = ?', [item.itemId]);
        if (!itemRecord) continue;

        if (itemRecord.baseInventoryId) {
          const invProduct = await db.get('SELECT name, quantity FROM inventory_products WHERE id = ?', [itemRecord.baseInventoryId]);
          if (invProduct && invProduct.quantity < item.quantity) {
            await db.run('ROLLBACK');
            return res.status(400).json({
              message: `Insufficient inventory for "${itemRecord.name}". Available: ${invProduct.quantity} (from ${invProduct.name}), Requested: ${item.quantity}`
            });
          }
        } else {
          if (itemRecord.inventory < item.quantity) {
            await db.run('ROLLBACK');
            return res.status(400).json({
              message: `Insufficient inventory for "${itemRecord.name}". Available: ${itemRecord.inventory}, Requested: ${item.quantity}`
            });
          }
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

      // Get and increment sequence atomically within transaction
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

        // Get item to check if it uses shared inventory
        const itemRecord = await db.get('SELECT baseInventoryId FROM items WHERE id = ?', [item.itemId]);

        if (itemRecord && itemRecord.baseInventoryId) {
          // Decrement shared inventory
          await db.run(
            'UPDATE inventory_products SET quantity = quantity - ? WHERE id = ?',
            [item.quantity, itemRecord.baseInventoryId]
          );
        } else {
          // Decrement item's own inventory
          await db.run(
            'UPDATE items SET inventory = inventory - ? WHERE id = ?',
            [item.quantity, item.itemId]
          );
        }
      }

      // Commit transaction
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
      return res.status(400).json({ message: 'Cannot edit a voided invoice. Create a new invoice instead.' });
    }

    // Validate items
    for (const item of items) {
      const qtyError = validatePositiveInteger(item.quantity, 'Quantity');
      if (qtyError) return res.status(400).json({ message: qtyError });
      const priceError = validatePositiveNumber(item.price, 'Price');
      if (priceError) return res.status(400).json({ message: priceError });
    }

    // Validate dates
    if (invoiceDate && dueDate && new Date(invoiceDate) > new Date(dueDate)) {
      return res.status(400).json({ message: 'Due date cannot be before invoice date' });
    }

    // Validate payment status consistency
    const newTotal = parseFloat(total) || 0;
    const newAmountPaid = parseFloat(amountPaid) || 0;
    if (newAmountPaid > newTotal) {
      return res.status(400).json({ message: `Amount paid ($${newAmountPaid.toFixed(2)}) cannot exceed total ($${newTotal.toFixed(2)})` });
    }

    // Start transaction
    await db.run('BEGIN IMMEDIATE');

    try {
      // Get old invoice items to calculate net inventory change
      const oldItems = await db.all('SELECT itemId, quantity FROM invoice_items WHERE invoiceId = ?', [id]);

      // Build map of old quantities by itemId
      const oldQtyMap = {};
      for (const oi of oldItems) {
        oldQtyMap[oi.itemId] = (oldQtyMap[oi.itemId] || 0) + oi.quantity;
      }

      // Check if new quantities would cause negative inventory
      for (const item of items) {
        const itemRecord = await db.get('SELECT id, name, inventory, baseInventoryId FROM items WHERE id = ?', [item.itemId]);
        if (!itemRecord) continue;

        const oldQty = oldQtyMap[item.itemId] || 0;
        const netChange = item.quantity - oldQty;

        if (netChange > 0) {
          if (itemRecord.baseInventoryId) {
            const invProduct = await db.get('SELECT name, quantity FROM inventory_products WHERE id = ?', [itemRecord.baseInventoryId]);
            if (invProduct && invProduct.quantity < netChange) {
              await db.run('ROLLBACK');
              return res.status(400).json({
                message: `Insufficient inventory for "${itemRecord.name}". Available: ${invProduct.quantity} (from ${invProduct.name}), Need additional: ${netChange}`
              });
            }
          } else {
            if (itemRecord.inventory < netChange) {
              await db.run('ROLLBACK');
              return res.status(400).json({
                message: `Insufficient inventory for "${itemRecord.name}". Available: ${itemRecord.inventory}, Need additional: ${netChange}`
              });
            }
          }
        }
      }

      // Restore inventory from old items
      for (const oldItem of oldItems) {
        const itemRecord = await db.get('SELECT baseInventoryId FROM items WHERE id = ?', [oldItem.itemId]);
        if (itemRecord && itemRecord.baseInventoryId) {
          await db.run(
            'UPDATE inventory_products SET quantity = quantity + ? WHERE id = ?',
            [oldItem.quantity, itemRecord.baseInventoryId]
          );
        } else {
          await db.run(
            'UPDATE items SET inventory = inventory + ? WHERE id = ?',
            [oldItem.quantity, oldItem.itemId]
          );
        }
      }

      // Determine final amountPaid and paymentDate
      let finalAmountPaid = newAmountPaid;
      if (paymentStatus === 'paid') {
        finalAmountPaid = newTotal; // Auto-set to total when paid
      } else if (paymentStatus === 'unpaid') {
        finalAmountPaid = 0; // Reset when marked unpaid
      }

      // Handle payment date
      let newPaymentDate = null;
      if (paymentStatus === 'paid') {
        // Set payment date if newly paid
        if (existingInvoice.paymentStatus !== 'paid') {
          newPaymentDate = new Date().toISOString().split('T')[0];
        } else {
          // Keep existing payment date
          const currentInv = await db.get('SELECT paymentDate FROM invoices WHERE id = ?', [id]);
          newPaymentDate = currentInv.paymentDate;
        }
      }

      await db.run(
        `UPDATE invoices SET clientId = ?, total = ?, invoiceDate = ?, dueDate = ?,
         paymentStatus = ?, amountPaid = ?, notes = ?, paymentDate = ? WHERE id = ?`,
        [clientId, total, invoiceDate, dueDate, paymentStatus || 'unpaid', finalAmountPaid, notes || null, newPaymentDate, id]
      );

      await db.run('DELETE FROM invoice_items WHERE invoiceId = ?', [id]);

      // Insert new items and decrement inventory
      for (const item of items) {
        await db.run(
          'INSERT INTO invoice_items (invoiceId, itemId, quantity, price, taxExempt) VALUES (?, ?, ?, ?, ?)',
          [id, item.itemId, item.quantity, item.price, item.taxExempt ? 1 : 0]
        );

        const itemRecord = await db.get('SELECT baseInventoryId FROM items WHERE id = ?', [item.itemId]);
        if (itemRecord && itemRecord.baseInventoryId) {
          await db.run(
            'UPDATE inventory_products SET quantity = quantity - ? WHERE id = ?',
            [item.quantity, itemRecord.baseInventoryId]
          );
        } else {
          await db.run(
            'UPDATE items SET inventory = inventory - ? WHERE id = ?',
            [item.quantity, item.itemId]
          );
        }
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
    // Check if already voided
    const invoice = await db.get('SELECT paymentStatus FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    if (invoice.paymentStatus === 'voided') {
      return res.status(400).json({ message: 'Invoice is already voided' });
    }

    // Start transaction
    await db.run('BEGIN IMMEDIATE');

    try {
      // Restore inventory from invoice items
      const items = await db.all('SELECT itemId, quantity FROM invoice_items WHERE invoiceId = ?', [id]);
      for (const item of items) {
        const itemRecord = await db.get('SELECT baseInventoryId FROM items WHERE id = ?', [item.itemId]);
        if (itemRecord && itemRecord.baseInventoryId) {
          await db.run(
            'UPDATE inventory_products SET quantity = quantity + ? WHERE id = ?',
            [item.quantity, itemRecord.baseInventoryId]
          );
        } else {
          await db.run(
            'UPDATE items SET inventory = inventory + ? WHERE id = ?',
            [item.quantity, item.itemId]
          );
        }
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
    // Check if invoice exists
    const invoice = await db.get('SELECT paymentStatus FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Start transaction
    await db.run('BEGIN IMMEDIATE');

    try {
      // Restore inventory if not already voided
      if (invoice.paymentStatus !== 'voided') {
        const items = await db.all('SELECT itemId, quantity FROM invoice_items WHERE invoiceId = ?', [id]);
        for (const item of items) {
          const itemRecord = await db.get('SELECT baseInventoryId FROM items WHERE id = ?', [item.itemId]);
          if (itemRecord && itemRecord.baseInventoryId) {
            await db.run(
              'UPDATE inventory_products SET quantity = quantity + ? WHERE id = ?',
              [item.quantity, itemRecord.baseInventoryId]
            );
          } else if (itemRecord) {
            await db.run(
              'UPDATE items SET inventory = inventory + ? WHERE id = ?',
              [item.quantity, item.itemId]
            );
          }
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
