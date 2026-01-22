import { useState, useEffect, useCallback, useRef } from 'react';
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

    if (!form.name || !form.name.trim()) {
      setError('Client name is required');
      return;
    }

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
                maxLength={2}
                placeholder="TX"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>ZIP</label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                maxLength={10}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
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
// Quick Add Item Modal (simplified unified system)
// ============================================
export function QuickAddItemModal({ initialName, initialPrice, onSave, onClose }) {
  useEscapeKey(onClose);

  const [form, setForm] = useState({
    name: initialName || '',
    price: initialPrice?.toString() || '',
    cost: '',
    inventory: '',
  });
  const [components, setComponents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Component search
  const [componentSearch, setComponentSearch] = useState('');
  const [componentSuggestions, setComponentSuggestions] = useState([]);
  const [showComponentDropdown, setShowComponentDropdown] = useState(false);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [inlineCreatePrice, setInlineCreatePrice] = useState('');
  const [inlineCreateCost, setInlineCreateCost] = useState('');
  const inlineCreateRef = useRef(false);

  // Keep ref in sync with state for blur handler
  useEffect(() => {
    inlineCreateRef.current = showInlineCreate;
  }, [showInlineCreate]);

  const searchComponents = useCallback(async (query) => {
    if (query.length < 1) {
      setComponentSuggestions([]);
      return;
    }
    try {
      const results = await api.searchItems(query);
      const componentIds = components.map(c => c.componentItemId);
      setComponentSuggestions(results.filter(item => !componentIds.includes(item.id)));
    } catch (err) {
      setComponentSuggestions([]);
    }
  }, [components]);

  const addComponent = (item) => {
    setComponents([...components, {
      componentItemId: item.id,
      componentName: item.name,
      componentCost: item.cost || 0,
      quantityNeeded: 1
    }]);
    setComponentSearch('');
    setComponentSuggestions([]);
    setShowComponentDropdown(false);
  };

  const createAndAddComponent = async () => {
    if (!componentSearch.trim()) return;
    try {
      const newItem = await api.createQuickComponent({
        name: componentSearch.trim(),
        price: parseFloat(inlineCreatePrice) || 0,
        cost: parseFloat(inlineCreateCost) || 0
      });
      addComponent(newItem);
      setShowInlineCreate(false);
      setInlineCreatePrice('');
      setInlineCreateCost('');
    } catch (err) {
      setError(err.message || 'Failed to create item');
    }
  };

  const updateComponentQty = (index, qty) => {
    const updated = [...components];
    updated[index].quantityNeeded = parseInt(qty) || 1;
    setComponents(updated);
  };

  const removeComponent = (index) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  // Calculate cost from components
  const calculatedCost = components.length > 0
    ? components.reduce((sum, c) => sum + ((c.componentCost || 0) * c.quantityNeeded), 0)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name?.trim()) {
      setError('Item name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const itemData = {
        name: form.name.trim(),
        price: parseFloat(form.price) || 0,
        cost: calculatedCost !== null ? calculatedCost : (parseFloat(form.cost) || 0),
        inventory: parseInt(form.inventory) || 0,
        reorderLevel: 0,
        components: components.map(c => ({
          componentItemId: c.componentItemId,
          quantityNeeded: c.quantityNeeded
        }))
      };

      const newItem = await api.createItem(itemData);
      onSave(newItem);
    } catch (err) {
      setError(err.message || 'Failed to create item');
      setSaving(false);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalContentStyle, maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
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
                placeholder="e.g., Laser Engraved Mirror"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Sell Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>
                Cost ($)
                {calculatedCost !== null && (
                  <span style={{ color: '#27ae60', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                    Auto: ${calculatedCost.toFixed(2)}
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={calculatedCost !== null ? calculatedCost.toFixed(2) : form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="0.00"
                disabled={calculatedCost !== null}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Inventory</label>
              <input
                type="number"
                min="0"
                value={form.inventory}
                onChange={(e) => setForm({ ...form, inventory: e.target.value })}
                placeholder="0"
                disabled={components.length > 0}
              />
            </div>
          </div>

          {/* Components Section */}
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary, #1c2128)', borderRadius: '8px', border: '1px solid var(--border-secondary, #21262d)' }}>
            <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
              Components / Recipe
            </label>
            <small style={{ color: 'var(--text-muted, #6e7681)', display: 'block', marginBottom: '0.75rem' }}>
              Add items that make up this product. Cost will auto-calculate.
            </small>

            {/* Component search */}
            <div className="autocomplete" style={{ marginBottom: '0.75rem', position: 'relative' }}>
              <input
                type="text"
                value={componentSearch}
                onChange={(e) => {
                  setComponentSearch(e.target.value);
                  searchComponents(e.target.value);
                  setShowComponentDropdown(true);
                  setShowInlineCreate(false);
                }}
                onFocus={() => {
                  if (componentSearch) setShowComponentDropdown(true);
                }}
                onBlur={() => setTimeout(() => { if (!inlineCreateRef.current) setShowComponentDropdown(false); }, 300)}
                placeholder="Search existing items or type new name..."
                style={{ width: '100%', padding: '0.6rem', fontSize: '1rem' }}
              />
              {showComponentDropdown && componentSearch && (
                <div className="autocomplete-dropdown">
                  {componentSuggestions.length === 0 && (
                    <div className="autocomplete-item autocomplete-no-results">
                      <small>No matching items found</small>
                    </div>
                  )}
                  {componentSuggestions.map((item) => (
                    <div
                      key={item.id}
                      className="autocomplete-item"
                      onClick={() => addComponent(item)}
                    >
                      <strong>{item.name}</strong>
                      <small>Cost: ${(item.cost || 0).toFixed(2)}</small>
                    </div>
                  ))}
                  {!showInlineCreate ? (
                    <div
                      className="autocomplete-item autocomplete-create-new"
                      onClick={() => setShowInlineCreate(true)}
                    >
                      <strong>+ Create "{componentSearch}"</strong>
                      <small>Click to add as new item</small>
                    </div>
                  ) : (
                    <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
                        Create: {componentSearch}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sell Price</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={inlineCreatePrice}
                            onChange={(e) => setInlineCreatePrice(e.target.value)}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '0.4rem', fontSize: '0.9rem' }}
                            autoFocus
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cost</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={inlineCreateCost}
                            onChange={(e) => setInlineCreateCost(e.target.value)}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '0.4rem', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={createAndAddComponent}
                          style={{ flex: 1 }}
                        >
                          Create Item
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setShowInlineCreate(false);
                            setInlineCreatePrice('');
                            setInlineCreateCost('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Component list */}
            {components.length > 0 && (
              <div>
                {components.map((comp, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ flex: 2 }}>{comp.componentName}</span>
                    <input
                      type="number"
                      min="1"
                      value={comp.quantityNeeded}
                      onChange={(e) => updateComponentQty(index, e.target.value)}
                      style={{ width: '60px', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', textAlign: 'center', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                    <span style={{ width: '70px', textAlign: 'right' }}>
                      ${((comp.componentCost || 0) * comp.quantityNeeded).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => removeComponent(index)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: '600' }}>
                  Total: ${calculatedCost?.toFixed(2) || '0.00'}
                </div>
              </div>
            )}
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
