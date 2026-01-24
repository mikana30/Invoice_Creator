import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api';

export default function ItemManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', cost: '', inventory: '', reorderLevel: '' });
  const [components, setComponents] = useState([]); // Components are other items
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Component search state
  const [componentSearch, setComponentSearch] = useState('');
  const [componentSuggestions, setComponentSuggestions] = useState([]);
  const [showComponentDropdown, setShowComponentDropdown] = useState(false);

  // Inline component creation form
  const [showCreateComponentForm, setShowCreateComponentForm] = useState(false);
  const [newComponentForm, setNewComponentForm] = useState({ name: '', price: '', cost: '', includeInCost: true });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await api.getItems();
      setItems(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load items' });
    } finally {
      setLoading(false);
    }
  };

  // Search items for component selection
  const searchComponents = useCallback(async (query) => {
    if (query.length < 1) {
      setComponentSuggestions([]);
      return;
    }
    try {
      const results = await api.searchItems(query);
      // Filter out the current item being edited and already-added components
      const componentIds = components.map(c => c.componentItemId);
      const filtered = results.filter(item =>
        item.id !== editingId && !componentIds.includes(item.id)
      );
      setComponentSuggestions(filtered);
    } catch (err) {
      setComponentSuggestions([]);
    }
  }, [editingId, components]);

  // Calculate cost from components (only those marked as includeInCost)
  const calculatedCost = useMemo(() => {
    if (components.length === 0) return null;
    const includedComponents = components.filter(comp => comp.includeInCost !== false);
    if (includedComponents.length === 0 && components.length > 0) {
      // All components excluded from cost - return 0 but still show as calculated
      return 0;
    }
    return components.reduce((sum, comp) => {
      if (comp.includeInCost === false) return sum;
      const compCost = parseFloat(comp.componentCost) || 0;
      return sum + (compCost * comp.quantityNeeded);
    }, 0);
  }, [components]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name?.trim()) {
      setMessage({ type: 'error', text: 'Item name is required' });
      return;
    }

    const itemData = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      cost: calculatedCost !== null ? calculatedCost : (parseFloat(form.cost) || 0),
      inventory: parseInt(form.inventory) || 0,
      reorderLevel: parseInt(form.reorderLevel) || 0,
      components: components.map(c => ({
        componentItemId: c.componentItemId,
        quantityNeeded: c.quantityNeeded
      }))
    };

    try {
      if (editingId) {
        await api.updateItem(editingId, itemData);
        setMessage({ type: 'success', text: 'Item updated successfully' });
      } else {
        await api.createItem(itemData);
        setMessage({ type: 'success', text: 'Item created successfully' });
      }
      resetForm();
      await loadItems();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save item' });
    }
  };

  const resetForm = () => {
    setForm({ name: '', price: '', cost: '', inventory: '', reorderLevel: '' });
    setComponents([]);
    setEditingId(null);
    setComponentSearch('');
    setComponentSuggestions([]);
    setShowCreateComponentForm(false);
    setNewComponentForm({ name: '', price: '', cost: '', includeInCost: true });
  };

  const handleEdit = async (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      price: item.price?.toString() || '',
      cost: item.cost?.toString() || '',
      inventory: item.inventory?.toString() || '',
      reorderLevel: item.reorderLevel?.toString() || '',
    });
    // Load existing components
    try {
      const itemComponents = await api.getItemComponents(item.id);
      setComponents(itemComponents.map(c => ({
        componentItemId: c.componentItemId,
        componentName: c.componentName,
        componentCost: c.componentCost,
        componentInventory: c.componentInventory,
        quantityNeeded: c.quantityNeeded,
        includeInCost: c.includeInCost !== 0 // Default to true if NULL or 1
      })));
    } catch (err) {
      setComponents([]);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.deleteItem(id);
      setMessage({ type: 'success', text: 'Item deleted successfully' });
      loadItems();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete item' });
    }
  };

  const handleToggleActive = async (item) => {
    const newActive = !(item.active === 1 || item.active === undefined);
    try {
      await api.toggleItemActive(item.id, newActive);
      setMessage({ type: 'success', text: newActive ? 'Item activated' : 'Item archived' });
      loadItems();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update item' });
    }
  };

  // Add a component from suggestions
  const addComponent = (item, includeInCost = true) => {
    setComponents([...components, {
      componentItemId: item.id,
      componentName: item.name,
      componentCost: item.cost || 0,
      componentInventory: item.inventory || 0,
      quantityNeeded: 1,
      includeInCost: includeInCost
    }]);
    setComponentSearch('');
    setComponentSuggestions([]);
    setShowComponentDropdown(false);
  };

  // Show inline form to create a new component
  const showCreateForm = () => {
    setNewComponentForm({ name: componentSearch.trim(), price: '', cost: '', includeInCost: true });
    setShowCreateComponentForm(true);
    setShowComponentDropdown(false);
  };

  // Submit the inline component creation form
  const submitNewComponent = async () => {
    if (!newComponentForm.name?.trim()) {
      setMessage({ type: 'error', text: 'Component name is required' });
      return;
    }
    try {
      const newItem = await api.createQuickComponent({
        name: newComponentForm.name.trim(),
        price: parseFloat(newComponentForm.price) || 0,
        cost: parseFloat(newComponentForm.cost) || 0
      });
      // Add to components list with the includeInCost setting
      setComponents([...components, {
        componentItemId: newItem.id,
        componentName: newItem.name,
        componentCost: newItem.cost || 0,
        componentInventory: newItem.inventory || 0,
        quantityNeeded: 1,
        includeInCost: newComponentForm.includeInCost
      }]);
      setMessage({ type: 'success', text: `Created "${newItem.name}"` });
      cancelCreateForm();
      await loadItems(); // Refresh items list
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create component' });
    }
  };

  // Cancel inline component creation
  const cancelCreateForm = () => {
    setShowCreateComponentForm(false);
    setNewComponentForm({ name: '', price: '', cost: '', includeInCost: true });
    setComponentSearch('');
  };

  const updateComponentQty = (index, qty) => {
    const updated = [...components];
    updated[index].quantityNeeded = parseInt(qty) || 1;
    setComponents(updated);
  };

  const toggleComponentIncludeInCost = (index) => {
    const updated = [...components];
    updated[index].includeInCost = !updated[index].includeInCost;
    setComponents(updated);
  };

  const removeComponent = (index) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  // Filter items
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (!showArchived) {
      filtered = filtered.filter(item => item.active === 1 || item.active === undefined || item.active === null);
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => item.name?.toLowerCase().includes(search));
    }
    return filtered;
  }, [items, searchTerm, showArchived]);

  const archivedCount = items.filter(item => item.active === 0).length;

  if (loading) return <div className="loading">Loading items...</div>;

  return (
    <div>
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <div className="card">
        <h2>{editingId ? 'Edit Item' : 'Add New Item'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Item Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Laser Engraved Mirror"
                required
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
              {calculatedCost !== null && (
                <small style={{ color: '#888' }}>Calculated from components</small>
              )}
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
              {components.length > 0 && (
                <small style={{ color: '#888' }}>Uses component inventory</small>
              )}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Reorder Level</label>
              <input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                placeholder="0"
                disabled={components.length > 0}
              />
            </div>
          </div>

          {/* Components Section */}
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
            <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
              Components / Recipe
            </label>
            <small style={{ color: '#888', display: 'block', marginBottom: '0.75rem' }}>
              Add items that make up this product. Cost will auto-calculate.
            </small>

            {/* Component search */}
            <div className="autocomplete" style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                value={componentSearch}
                onChange={(e) => {
                  setComponentSearch(e.target.value);
                  searchComponents(e.target.value);
                  setShowComponentDropdown(true);
                }}
                onFocus={() => {
                  if (componentSearch) setShowComponentDropdown(true);
                }}
                onBlur={() => setTimeout(() => setShowComponentDropdown(false), 200)}
                placeholder="Type to search or create components..."
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
                      <small>Cost: ${(item.cost || 0).toFixed(2)} | Stock: {item.inventory || 0}</small>
                    </div>
                  ))}
                  <div
                    className="autocomplete-item autocomplete-create-new"
                    onClick={showCreateForm}
                  >
                    <strong>+ Create "{componentSearch}"</strong>
                    <small>Add as new component with cost</small>
                  </div>
                </div>
              )}

              {/* Inline component creation form */}
              {showCreateComponentForm && (
                <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.75rem' }}>Create New Component</div>
                  <div className="form-row" style={{ marginBottom: '0.5rem' }}>
                    <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem' }}>Name *</label>
                      <input
                        type="text"
                        value={newComponentForm.name}
                        onChange={(e) => setNewComponentForm({ ...newComponentForm, name: e.target.value })}
                        placeholder="Component name"
                        autoFocus
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem' }}>Sell Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newComponentForm.price}
                        onChange={(e) => setNewComponentForm({ ...newComponentForm, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem' }}>Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newComponentForm.cost}
                        onChange={(e) => setNewComponentForm({ ...newComponentForm, cost: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newComponentForm.includeInCost}
                        onChange={(e) => setNewComponentForm({ ...newComponentForm, includeInCost: e.target.checked })}
                      />
                      <span style={{ fontSize: '0.9rem' }}>Add cost to parent item's total cost</span>
                    </label>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={cancelCreateForm}>
                        Cancel
                      </button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={submitNewComponent}>
                        Create & Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Component list */}
            {components.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
                  <span style={{ width: '24px' }} title="Include in cost calculation"></span>
                  <span style={{ flex: 2 }}>Component</span>
                  <span style={{ width: '80px', textAlign: 'center' }}>Qty</span>
                  <span style={{ width: '80px', textAlign: 'right' }}>Cost</span>
                  <span style={{ width: '32px' }}></span>
                </div>
                {components.map((comp, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', opacity: comp.includeInCost === false ? 0.6 : 1 }}>
                    <input
                      type="checkbox"
                      checked={comp.includeInCost !== false}
                      onChange={() => toggleComponentIncludeInCost(index)}
                      title={comp.includeInCost !== false ? 'Included in cost calculation' : 'Excluded from cost calculation'}
                      style={{ width: '24px' }}
                    />
                    <span style={{ flex: 2, textDecoration: comp.includeInCost === false ? 'line-through' : 'none' }}>
                      {comp.componentName}
                      {comp.includeInCost === false && <span style={{ color: '#888', marginLeft: '0.5rem', fontSize: '0.8rem' }}>(not in cost)</span>}
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={comp.quantityNeeded}
                      onChange={(e) => updateComponentQty(index, e.target.value)}
                      style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', textAlign: 'center', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                    <span style={{ width: '80px', textAlign: 'right', color: comp.includeInCost === false ? '#888' : 'inherit' }}>
                      ${((comp.componentCost || 0) * comp.quantityNeeded).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => removeComponent(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: '600' }}>
                  Total Component Cost: ${calculatedCost?.toFixed(2) || '0.00'}
                </div>
              </div>
            )}
          </div>

          <div className="btn-group" style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Item' : 'Add Item'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Items</h2>
        {items.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              {archivedCount > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />
                  Show archived ({archivedCount})
                </label>
              )}
            </div>
          </div>
        )}
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No items yet. Add your first item above.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>No items match your search.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Margin</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const price = parseFloat(item.price) || 0;
                const cost = item.calculatedCost || parseFloat(item.cost) || 0;
                const margin = price > 0 ? ((price - cost) / price * 100).toFixed(1) : 0;
                const inventory = parseInt(item.inventory) || 0;
                const reorderLevel = parseInt(item.reorderLevel) || 0;
                const lowStock = inventory <= reorderLevel && reorderLevel > 0;
                const isArchived = item.active === 0;
                const hasComponents = item.componentCount > 0;

                return (
                  <tr key={item.id} style={isArchived ? { opacity: 0.5, backgroundColor: 'var(--bg-tertiary)' } : {}}>
                    <td>
                      {item.name}
                      {hasComponents && <span style={{ color: '#3498db', marginLeft: '0.5rem', fontSize: '0.8rem' }}>({item.componentCount} parts)</span>}
                      {isArchived && <span style={{ color: '#888', marginLeft: '0.5rem', fontSize: '0.8rem' }}>(archived)</span>}
                    </td>
                    <td>${price.toFixed(2)}</td>
                    <td>${cost.toFixed(2)}</td>
                    <td>{margin}%</td>
                    <td>
                      <span style={lowStock ? { color: '#e74c3c', fontWeight: 'bold' } : {}}>
                        {inventory}
                      </span>
                      {lowStock && <span style={{ color: '#e74c3c', marginLeft: '0.25rem' }}>Low!</span>}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => handleEdit(item)}>Edit</button>{' '}
                      <button
                        className="btn btn-sm"
                        onClick={() => handleToggleActive(item)}
                        style={{ background: isArchived ? '#27ae60' : '#95a5a6', color: 'white' }}
                      >
                        {isArchived ? 'Activate' : 'Archive'}
                      </button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
