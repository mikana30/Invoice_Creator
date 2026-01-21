import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

// Hook to handle Escape key to close modals
function useEscapeKey(onClose) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);
}

// Shared modal styles (dark theme)
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
};

const modalContentStyle = {
  backgroundColor: 'var(--bg-secondary, #161b22)',
  border: '1px solid var(--border-primary, #30363d)',
  borderRadius: '12px',
  padding: '1.5rem',
  maxWidth: '500px',
  width: '90%',
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid var(--border-primary, #30363d)',
};

// ============================================
// Quick Add Client Modal
// ============================================
export function QuickAddClientModal({ initialName, onSave, onClose }) {
  useEscapeKey(onClose);

  const [form, setForm] = useState({
    name: initialName || '',
    street: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const newClient = await api.createClient(form);
      onSave(newClient);
    } catch (err) {
      setError(err.message || 'Failed to create client');
      setSaving(false);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0 }}>Quick Add Client</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted, #6e7681)' }}
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Street Address</label>
            <input
              type="text"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>

          <div className="form-group">
            <label>Street Address 2</label>
            <input
              type="text"
              value={form.street2}
              onChange={(e) => setForm({ ...form, street2: e.target.value })}
              placeholder="Apt, Suite, Unit, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>ZIP</label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="btn-group" style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Client'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Quick Add Inventory Product Modal
// ============================================
export function QuickAddInventoryProductModal({ initialName, onSave, onClose }) {
  useEscapeKey(onClose);

  const [form, setForm] = useState({
    name: initialName || '',
    quantity: 0,
    reorderLevel: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const newProduct = await api.createInventoryProduct({
        name: form.name,
        quantity: parseInt(form.quantity) || 0,
        reorderLevel: parseInt(form.reorderLevel) || 0,
      });
      onSave(newProduct);
    } catch (err) {
      setError(err.message || 'Failed to create inventory product');
      setSaving(false);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalContentStyle, maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0 }}>Quick Add Inventory Product</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted, #6e7681)' }}
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
              placeholder="e.g., Wood, Ribbon, Bell"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Starting Quantity</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Reorder Level</label>
              <input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
              />
            </div>
          </div>

          <div className="btn-group" style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Product'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Quick Add Item Modal (with Recipe support)
// ============================================
export function QuickAddItemModal({ initialName, initialPrice, onSave, onClose }) {
  useEscapeKey(onClose);

  const [form, setForm] = useState({
    name: initialName || '',
    price: initialPrice?.toString() || '',
    cost: '',
    inventory: '',
    reorderLevel: '',
    baseInventoryId: '',
  });
  const [components, setComponents] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductForIndex, setNewProductForIndex] = useState(null);

  useEffect(() => {
    loadInventoryProducts();
  }, []);

  const loadInventoryProducts = async () => {
    try {
      const products = await api.getInventoryProducts();
      setInventoryProducts(products);
    } catch (err) {
      console.error('Failed to load inventory products', err);
    }
  };

  const addComponent = () => {
    setComponents([...components, { inventoryProductId: '', quantityNeeded: 1 }]);
  };

  const updateComponent = (index, field, value) => {
    const updated = [...components];
    if (value === '__create_new__') {
      setNewProductForIndex(index);
      setShowNewProductModal(true);
      return;
    }
    updated[index][field] = field === 'quantityNeeded' ? parseInt(value) || 1 : value;
    setComponents(updated);
  };

  const removeComponent = (index) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleNewProductCreated = (newProduct) => {
    setInventoryProducts([...inventoryProducts, newProduct]);
    if (newProductForIndex !== null) {
      const updated = [...components];
      updated[newProductForIndex].inventoryProductId = newProduct.id.toString();
      setComponents(updated);
    }
    setShowNewProductModal(false);
    setNewProductForIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const itemData = {
        name: form.name,
        price: parseFloat(form.price) || 0,
        cost: parseFloat(form.cost) || 0,
        inventory: parseInt(form.inventory) || 0,
        reorderLevel: parseInt(form.reorderLevel) || 0,
        baseInventoryId: form.baseInventoryId ? parseInt(form.baseInventoryId) : null,
      };

      const newItem = await api.createItem(itemData);

      // Save components if any
      if (components.length > 0) {
        const validComponents = components.filter(c => c.inventoryProductId);
        if (validComponents.length > 0) {
          await api.updateItemComponents(newItem.id, validComponents);
        }
      }

      onSave(newItem);
    } catch (err) {
      setError(err.message || 'Failed to create item');
      setSaving(false);
    }
  };

  if (showNewProductModal) {
    return (
      <QuickAddInventoryProductModal
        onSave={handleNewProductCreated}
        onClose={() => {
          setShowNewProductModal(false);
          setNewProductForIndex(null);
        }}
      />
    );
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalContentStyle, maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0 }}>Quick Add Item</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted, #6e7681)' }}
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Item Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Sell Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Base Inventory (Shared)</label>
              <select
                value={form.baseInventoryId}
                onChange={(e) => setForm({ ...form, baseInventoryId: e.target.value })}
              >
                <option value="">-- None --</option>
                {inventoryProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Qty: {product.quantity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Inventory Count</label>
              <input
                type="number"
                min="0"
                value={form.inventory}
                onChange={(e) => setForm({ ...form, inventory: e.target.value })}
                placeholder="0"
                disabled={!!form.baseInventoryId || components.length > 0}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Reorder Level</label>
              <input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                placeholder="0"
                disabled={!!form.baseInventoryId || components.length > 0}
              />
            </div>
          </div>

          {/* Recipe / Bill of Materials */}
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary, #1c2128)', borderRadius: '8px', border: '1px solid var(--border-secondary, #21262d)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontWeight: '600', margin: 0 }}>Recipe / Components</label>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={addComponent}
                disabled={!!form.baseInventoryId}
              >
                + Add Component
              </button>
            </div>

            {form.baseInventoryId && (
              <small style={{ color: '#888', display: 'block', marginBottom: '0.5rem' }}>
                Cannot use recipe when linked to shared inventory
              </small>
            )}

            {components.length === 0 && !form.baseInventoryId && (
              <small style={{ color: 'var(--text-muted, #6e7681)' }}>
                Add inventory products needed to make this item
              </small>
            )}

            {components.map((comp, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <select
                  value={comp.inventoryProductId}
                  onChange={(e) => updateComponent(index, 'inventoryProductId', e.target.value)}
                  style={{ flex: 2, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-primary, #30363d)', background: 'var(--bg-tertiary, #1c2128)', color: 'var(--text-primary, #e6edf3)' }}
                  required
                >
                  <option value="">-- Select Product --</option>
                  {inventoryProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Qty: {product.quantity})
                    </option>
                  ))}
                  <option value="__create_new__">+ Create New Product...</option>
                </select>
                <input
                  type="number"
                  min="1"
                  value={comp.quantityNeeded}
                  onChange={(e) => updateComponent(index, 'quantityNeeded', e.target.value)}
                  style={{ width: '70px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-primary, #30363d)', background: 'var(--bg-tertiary, #1c2128)', color: 'var(--text-primary, #e6edf3)', textAlign: 'center' }}
                  placeholder="Qty"
                />
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => removeComponent(index)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          <div className="btn-group" style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Item'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
