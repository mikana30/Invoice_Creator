import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import { QuickAddClientModal, QuickAddItemModal } from './QuickAddModals';

// Round to 2 decimal places to avoid floating point issues
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Debounce hook
function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  return debouncedCallback;
}

export default function InvoiceForm({ editingInvoice, onSave, onCancel }) {
  const [clients, setClients] = useState([]);
  const [settings, setSettings] = useState({ taxRate: 0.08, sellingFeePercent: 0, sellingFeeFixed: 0 });
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [invoiceItems, setInvoiceItems] = useState([
    { itemId: null, name: '', quantity: 1, price: 0, cost: 0, taxExempt: false, suggestions: [], showSuggestions: false },
  ]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Quick-add modal state
  const [showClientModal, setShowClientModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemModalIndex, setItemModalIndex] = useState(null);
  const [itemModalInitialPrice, setItemModalInitialPrice] = useState(0);

  // Track unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editingInvoice && clients.length > 0) {
      setSelectedClientId(editingInvoice.clientId);
      const client = clients.find((c) => c.id === editingInvoice.clientId);
      if (client) setClientSearch(client.name);

      // For duplicates (id is null), use today's date
      if (editingInvoice.id) {
        if (editingInvoice.invoiceDate) {
          setInvoiceDate(editingInvoice.invoiceDate.split('T')[0]);
        }
        if (editingInvoice.dueDate) {
          setDueDate(editingInvoice.dueDate.split('T')[0]);
        }
      } else {
        // Duplicate mode - use today's date
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setDueDate(''); // Will be recalculated by the useEffect
      }
      setPaymentStatus(editingInvoice.paymentStatus || 'unpaid');
      setAmountPaid(editingInvoice.amountPaid || 0);
      setNotes(editingInvoice.notes || '');

      if (editingInvoice.items && editingInvoice.items.length > 0) {
        const loadedItems = editingInvoice.items.map((invItem) => ({
          itemId: invItem.itemId,
          name: invItem.itemName || '',
          quantity: invItem.quantity,
          price: invItem.price,
          cost: invItem.itemCost || 0,
          taxExempt: invItem.taxExempt === 1 || invItem.taxExempt === true,
          suggestions: [],
          showSuggestions: false,
        }));
        setInvoiceItems(loadedItems);
      }
    }
  }, [editingInvoice, clients]);

  // Calculate due date when invoice date changes (for new invoices or duplicates)
  useEffect(() => {
    const isNewOrDuplicate = !editingInvoice || !editingInvoice.id;
    if (isNewOrDuplicate && invoiceDate && settings.defaultPaymentTerms !== undefined) {
      const terms = settings.defaultPaymentTerms || 30;
      const dateObj = new Date(invoiceDate);
      dateObj.setDate(dateObj.getDate() + terms);
      setDueDate(dateObj.toISOString().split('T')[0]);
    }
  }, [invoiceDate, settings.defaultPaymentTerms, editingInvoice]);

  const loadData = async () => {
    try {
      const [clientsData, settingsData] = await Promise.all([
        api.getClients(),
        api.getSettings(),
      ]);
      setClients(clientsData);
      setSettings(settingsData);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClientId(client.id);
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  // Quick-add client callback
  const handleClientCreated = (newClient) => {
    setClients([...clients, newClient]);
    setSelectedClientId(newClient.id);
    setClientSearch(newClient.name);
    setShowClientDropdown(false);
    setShowClientModal(false);
    setHasUnsavedChanges(true);
  };

  // Quick-add item callback
  const handleItemCreated = (newItem) => {
    if (itemModalIndex !== null) {
      const newItems = [...invoiceItems];
      newItems[itemModalIndex].itemId = newItem.id;
      newItems[itemModalIndex].name = newItem.name;
      newItems[itemModalIndex].price = newItem.price;
      newItems[itemModalIndex].cost = newItem.cost || 0;
      newItems[itemModalIndex].showSuggestions = false;
      setInvoiceItems(newItems);
      setHasUnsavedChanges(true);
    }
    setShowItemModal(false);
    setItemModalIndex(null);
  };

  // Open quick-add item modal for a specific row
  const openItemModal = (index) => {
    setItemModalIndex(index);
    setItemModalInitialPrice(invoiceItems[index].price || 0);
    setShowItemModal(true);
  };

  // Debounced search function
  const searchItems = useCallback(async (index, value) => {
    if (value.length > 0) {
      try {
        const suggestions = await api.searchItems(value);
        setInvoiceItems(prevItems => {
          const newItems = [...prevItems];
          if (newItems[index]) {
            newItems[index].suggestions = suggestions;
            // Always show dropdown when there's text (so user can see "Create new" option)
            newItems[index].showSuggestions = true;
          }
          return newItems;
        });
      } catch (err) {
        // Ignore search errors - still show dropdown for "Create new" option
        setInvoiceItems(prevItems => {
          const newItems = [...prevItems];
          if (newItems[index]) {
            newItems[index].showSuggestions = true;
          }
          return newItems;
        });
      }
    }
  }, []);

  const debouncedSearch = useDebounce(searchItems, 300);

  const handleItemNameChange = (index, value) => {
    const newItems = [...invoiceItems];
    newItems[index].name = value;
    newItems[index].itemId = null; // Reset itemId when typing

    if (value.length === 0) {
      newItems[index].suggestions = [];
      newItems[index].showSuggestions = false;
    } else {
      // Show dropdown immediately when there's text (for "Create new" option)
      newItems[index].showSuggestions = true;
    }

    setInvoiceItems(newItems);
    setHasUnsavedChanges(true);

    // Debounced API search
    if (value.length > 0) {
      debouncedSearch(index, value);
    }
  };

  const handleItemSelect = (index, item) => {
    const newItems = [...invoiceItems];
    newItems[index].itemId = item.id;
    newItems[index].name = item.name;
    newItems[index].price = item.price;
    newItems[index].cost = item.cost || 0;
    newItems[index].showSuggestions = false;
    setInvoiceItems(newItems);
    setHasUnsavedChanges(true);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoiceItems];
    newItems[index][field] = value;
    setInvoiceItems(newItems);
    setHasUnsavedChanges(true);
  };

  const handleItemBlur = (index) => {
    setTimeout(() => {
      const newItems = [...invoiceItems];
      newItems[index].showSuggestions = false;
      setInvoiceItems(newItems);
    }, 200);
  };

  const addItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { itemId: null, name: '', quantity: 1, price: 0, cost: 0, taxExempt: false, suggestions: [], showSuggestions: false },
    ]);
    setHasUnsavedChanges(true);
  };

  const removeItem = (index) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
      setHasUnsavedChanges(true);
    }
  };

  const calculateSubtotal = () => {
    return roundMoney(invoiceItems.reduce((sum, item) => sum + item.quantity * item.price, 0));
  };

  const calculateTax = () => {
    const taxRate = settings.taxRate || 0.08;
    return roundMoney(invoiceItems.reduce((sum, item) => {
      if (item.taxExempt) return sum;
      return sum + roundMoney(item.quantity * item.price * taxRate);
    }, 0));
  };

  const calculateTotal = () => {
    return roundMoney(calculateSubtotal() + calculateTax());
  };

  const calculateItemCosts = () => {
    return roundMoney(invoiceItems.reduce((sum, item) => sum + item.quantity * (item.cost || 0), 0));
  };

  const calculateFees = () => {
    const subtotal = calculateSubtotal();
    const feePercent = settings.sellingFeePercent || 0;
    const feeFixed = settings.sellingFeeFixed || 0;
    return roundMoney((subtotal * feePercent / 100) + feeFixed);
  };

  const calculateProfit = () => {
    const revenue = calculateTotal();
    const itemCosts = calculateItemCosts();
    const fees = calculateFees();
    return roundMoney(revenue - itemCosts - fees);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClientId) {
      setMessage({ type: 'error', text: 'Please select a client' });
      return;
    }

    const validItems = invoiceItems.filter((item) => item.name.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one item' });
      return;
    }

    // Create any new items that don't exist in the database
    const processedItems = [];
    for (const item of validItems) {
      let itemId = item.itemId;

      if (!itemId) {
        // Create new item
        try {
          const newItem = await api.createItem({ name: item.name.trim(), price: item.price });
          itemId = newItem.id;
        } catch (err) {
          setMessage({ type: 'error', text: `Failed to create item: ${item.name}` });
          return;
        }
      }

      processedItems.push({
        itemId,
        quantity: parseInt(item.quantity),
        price: parseFloat(item.price),
        taxExempt: item.taxExempt,
      });
    }

    const invoiceData = {
      clientId: selectedClientId,
      items: processedItems,
      total: calculateTotal(),
      invoiceDate,
      dueDate,
      paymentStatus,
      amountPaid: parseFloat(amountPaid) || 0,
      notes: notes.trim() || null,
    };

    try {
      if (editingInvoice && editingInvoice.id) {
        await api.updateInvoice(editingInvoice.id, invoiceData);
        setMessage({ type: 'success', text: 'Invoice updated successfully' });
      } else {
        await api.createInvoice(invoiceData);
        setMessage({ type: 'success', text: 'Invoice created successfully' });
      }

      // Reset form
      setSelectedClientId('');
      setClientSearch('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setPaymentStatus('unpaid');
      setAmountPaid(0);
      setNotes('');
      setInvoiceItems([{ itemId: null, name: '', quantity: 1, price: 0, cost: 0, taxExempt: false, suggestions: [], showSuggestions: false }]);
      setHasUnsavedChanges(false);

      if (onSave) onSave();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save invoice' });
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  if (loading) return <div className="loading">Loading...</div>;

  const taxRate = settings.taxRate || 0.08;
  const isEditing = editingInvoice && editingInvoice.id;
  const isDuplicating = editingInvoice && !editingInvoice.id;

  return (
    <div className="card">
      <h2>{isEditing ? 'Edit Invoice' : isDuplicating ? 'Duplicate Invoice' : 'Create New Invoice'}</h2>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button
            onClick={() => setMessage(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group autocomplete" style={{ flex: 2 }}>
            <label>Client</label>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setShowClientDropdown(true);
                if (!e.target.value) setSelectedClientId('');
                setHasUnsavedChanges(true);
              }}
              onFocus={() => setShowClientDropdown(true)}
              onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
              placeholder="Search for a client..."
              required
            />
            {showClientDropdown && clientSearch && (
              <div className="autocomplete-dropdown">
                {filteredClients.map((client) => {
                  const addressParts = [client.street, client.city, client.state].filter(Boolean);
                  const addressStr = addressParts.join(', ');
                  return (
                    <div
                      key={client.id}
                      className="autocomplete-item"
                      onClick={() => handleClientSelect(client)}
                    >
                      <strong>{client.name}</strong>
                      <small>
                        {addressStr} {client.phone && `• ${client.phone}`}
                      </small>
                    </div>
                  );
                })}
                {/* Create New Client option */}
                <div
                  className="autocomplete-item"
                  onClick={() => setShowClientModal(true)}
                  style={{ borderTop: filteredClients.length > 0 ? '1px solid #eee' : 'none', color: '#3498db' }}
                >
                  <strong>+ Create "{clientSearch}"</strong>
                  <small>Add as a new client</small>
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label>Invoice Date</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => { setInvoiceDate(e.target.value); setHasUnsavedChanges(true); }}
              required
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => { setDueDate(e.target.value); setHasUnsavedChanges(true); }}
            />
          </div>
        </div>

        {editingInvoice && (
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            {paymentStatus === 'partial' && (
              <div className="form-group" style={{ flex: 1 }}>
                <label>Amount Paid ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}
          </div>
        )}

        <h3>Invoice Items</h3>
        <div className="invoice-items">
          {invoiceItems.map((item, index) => (
            <div key={index} className="invoice-item-row">
              <div className="form-group item-name autocomplete">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleItemNameChange(index, e.target.value)}
                  onBlur={() => handleItemBlur(index)}
                  onFocus={() => {
                    // Always show dropdown on focus if there's text (to show "Create new" option)
                    if (item.name.length > 0) {
                      const newItems = [...invoiceItems];
                      newItems[index].showSuggestions = true;
                      setInvoiceItems(newItems);
                      // Re-trigger search in case suggestions are stale
                      debouncedSearch(index, item.name);
                    }
                  }}
                  placeholder="Type item name..."
                  required
                />
                {item.showSuggestions && (
                  <div className="autocomplete-dropdown">
                    {item.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="autocomplete-item"
                        onClick={() => handleItemSelect(index, suggestion)}
                      >
                        <strong>{suggestion.name}</strong>
                        <small>${parseFloat(suggestion.price).toFixed(2)}</small>
                      </div>
                    ))}
                    {/* Create New Item option */}
                    {item.name && (
                      <div
                        className="autocomplete-item"
                        onClick={() => openItemModal(index)}
                        style={{ borderTop: item.suggestions.length > 0 ? '1px solid #eee' : 'none', color: '#3498db' }}
                      >
                        <strong>+ Create "{item.name}"</strong>
                        <small>Add as a new item with inventory/recipe</small>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="form-group item-qty">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                  placeholder="Qty"
                />
              </div>
              <div className="form-group item-price">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                  placeholder="Price"
                />
              </div>
              <div className="item-tax">
                <input
                  type="checkbox"
                  checked={item.taxExempt}
                  onChange={(e) => handleItemChange(index, 'taxExempt', e.target.checked)}
                  id={`tax-${index}`}
                />
                <label htmlFor={`tax-${index}`}>No Tax</label>
              </div>
              <div className="item-total">${(item.quantity * item.price).toFixed(2)}</div>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => removeItem(index)}
                disabled={invoiceItems.length === 1}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-secondary" onClick={addItem}>
          + Add Item
        </button>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label>Notes / Memo (appears on invoice)</label>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setHasUnsavedChanges(true); }}
            placeholder="Add any notes or special instructions for this invoice..."
            rows="3"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        <div className="invoice-summary">
          <p>Subtotal: ${calculateSubtotal().toFixed(2)}</p>
          <p>Tax ({(taxRate * 100).toFixed(1)}%): ${calculateTax().toFixed(2)}</p>
          <p className="total">Total: ${calculateTotal().toFixed(2)}</p>
        </div>

        {/* Internal profit summary - not shown on printed invoice */}
        <div className="internal-summary" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', borderLeft: '4px solid #6c757d' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#6c757d' }}>Internal Summary</h4>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <small style={{ color: '#6c757d' }}>Item Costs</small>
              <p style={{ margin: 0 }}>${calculateItemCosts().toFixed(2)}</p>
            </div>
            <div>
              <small style={{ color: '#6c757d' }}>Selling Fees</small>
              <p style={{ margin: 0 }}>${calculateFees().toFixed(2)}</p>
            </div>
            <div>
              <small style={{ color: '#6c757d' }}>Est. Profit</small>
              <p style={{ margin: 0, fontWeight: 'bold', color: calculateProfit() >= 0 ? '#27ae60' : '#e74c3c' }}>
                ${calculateProfit().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-success">
            {isEditing ? 'Update Invoice' : 'Create Invoice'}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Quick-add modals */}
      {showClientModal && (
        <QuickAddClientModal
          initialName={clientSearch}
          onSave={handleClientCreated}
          onClose={() => setShowClientModal(false)}
        />
      )}

      {showItemModal && itemModalIndex !== null && (
        <QuickAddItemModal
          initialName={invoiceItems[itemModalIndex]?.name || ''}
          initialPrice={itemModalInitialPrice}
          onSave={handleItemCreated}
          onClose={() => {
            setShowItemModal(false);
            setItemModalIndex(null);
          }}
        />
      )}
    </div>
  );
}
