import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

export default function ItemManager() {
  const [items, setItems] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', cost: '', inventory: '', reorderLevel: '', baseInventoryId: '' });
  const [components, setComponents] = useState([]); // Bill of Materials
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsData, invProducts] = await Promise.all([
        api.getItems(),
        api.getInventoryProducts()
      ]);
      setItems(itemsData);
      setInventoryProducts(invProducts);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const data = await api.getItems();
      setItems(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load items' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemData = {
      name: form.name,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      inventory: parseInt(form.inventory) || 0,
      reorderLevel: parseInt(form.reorderLevel) || 0,
      baseInventoryId: form.baseInventoryId ? parseInt(form.baseInventoryId) : null,
    };
    try {
      let itemId = editingId;
      if (editingId) {
        await api.updateItem(editingId, itemData);
        setMessage({ type: 'success', text: 'Item updated successfully' });
      } else {
        const result = await api.createItem(itemData);
        itemId = result.id;
        setMessage({ type: 'success', text: 'Item created successfully' });
      }
      // Save components if any
      if (itemId && components.length > 0) {
        await api.updateItemComponents(itemId, components);
      } else if (itemId) {
        // Clear components if none specified
        await api.updateItemComponents(itemId, []);
      }
      setForm({ name: '', price: '', cost: '', inventory: '', reorderLevel: '', baseInventoryId: '' });
      setComponents([]);
      setEditingId(null);
      await loadItems();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save item' });
    }
  };

  const handleEdit = async (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      price: item.price?.toString() || '',
      cost: item.cost?.toString() || '',
      inventory: item.inventory?.toString() || '',
      reorderLevel: item.reorderLevel?.toString() || '',
      baseInventoryId: item.baseInventoryId?.toString() || '',
    });
    // Load existing components
    try {
      const itemComponents = await api.getItemComponents(item.id);
      setComponents(itemComponents.map(c => ({
        inventoryProductId: c.inventoryProductId,
        quantityNeeded: c.quantityNeeded
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
      setMessage({ type: 'error', text: 'Failed to delete item' });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '', price: '', cost: '', inventory: '', reorderLevel: '', baseInventoryId: '' });
    setComponents([]);
  };

  // Component management functions
  const addComponent = () => {
    setComponents([...components, { inventoryProductId: '', quantityNeeded: 1 }]);
  };

  const updateComponent = (index, field, value) => {
    const updated = [...components];
    updated[index][field] = field === 'quantityNeeded' ? parseInt(value) || 1 : value;
    setComponents(updated);
  };

  const removeComponent = (index) => {
    setComponents(components.filter((_, i) => i !== index));
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

  // Filter items by search term and active status
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter by active status
    if (!showArchived) {
      filtered = filtered.filter(item => item.active === 1 || item.active === undefined || item.active === null);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(search) ||
        item.baseInventoryName?.toLowerCase().includes(search)
      );
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
          <button
            onClick={() => setMessage(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div className="card">
        <h2>{editingId ? 'Edit Item' : 'Add New Item'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Item Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                <option value="">-- None (use item's own inventory) --</option>
                {inventoryProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Qty: {product.quantity})
                  </option>
                ))}
              </select>
              <small style={{ color: '#888' }}>Link to shared inventory for items using the same base product</small>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Item Inventory Count</label>
              <input
                type="number"
                min="0"
                value={form.inventory}
                onChange={(e) => setForm({ ...form, inventory: e.target.value })}
                placeholder="0"
                disabled={!!form.baseInventoryId || components.length > 0}
              />
              {form.baseInventoryId && (
                <small style={{ color: '#888' }}>Disabled: using shared inventory</small>
              )}
              {components.length > 0 && !form.baseInventoryId && (
                <small style={{ color: '#888' }}>Disabled: using recipe components</small>
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
                disabled={!!form.baseInventoryId || components.length > 0}
              />
              {!form.baseInventoryId && components.length === 0 && (
                <small style={{ color: '#888' }}>Alert when stock falls below this</small>
              )}
            </div>
          </div>

          {/* Recipe / Bill of Materials */}
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
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
              <small style={{ color: '#888' }}>
                Add inventory products needed to make this item (e.g., 1 wood, 1 ribbon, 1 bell)
              </small>
            )}
            {components.map((comp, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <select
                  value={comp.inventoryProductId}
                  onChange={(e) => updateComponent(index, 'inventoryProductId', e.target.value)}
                  style={{ flex: 2, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  required
                >
                  <option value="">-- Select Inventory Product --</option>
                  {inventoryProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Qty: {product.quantity})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={comp.quantityNeeded}
                  onChange={(e) => updateComponent(index, 'quantityNeeded', e.target.value)}
                  style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  placeholder="Qty"
                />
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => removeComponent(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="btn-group">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Item' : 'Add Item'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
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
                placeholder="Search items by name or inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
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
            {(searchTerm || showArchived) && (
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                Showing {filteredItems.length} of {items.length} items
              </div>
            )}
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
                <th>Inventory</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const price = parseFloat(item.price) || 0;
                const cost = parseFloat(item.cost) || 0;
                const margin = price > 0 ? ((price - cost) / price * 100).toFixed(1) : 0;
                // Use shared inventory quantity if linked, otherwise use item's own inventory
                const inventory = item.baseInventoryId
                  ? parseInt(item.baseInventoryQty) || 0
                  : parseInt(item.inventory) || 0;
                const reorderLevel = parseInt(item.reorderLevel) || 0;
                const lowStock = !item.baseInventoryId && inventory <= reorderLevel && reorderLevel > 0;
                const isArchived = item.active === 0;
                return (
                  <tr key={item.id} style={isArchived ? { opacity: 0.5, backgroundColor: '#f5f5f5' } : {}}>
                    <td>
                      {item.name}
                      {isArchived && <span style={{ color: '#888', marginLeft: '0.5rem', fontSize: '0.8rem' }}>(archived)</span>}
                    </td>
                    <td>${price.toFixed(2)}</td>
                    <td>${cost.toFixed(2)}</td>
                    <td>{margin}%</td>
                    <td>
                      {item.baseInventoryId ? (
                        <span title={`Shared: ${item.baseInventoryName}`}>
                          {inventory}
                          <small style={{ color: '#3498db', marginLeft: '0.25rem' }}>
                            ({item.baseInventoryName})
                          </small>
                        </span>
                      ) : (
                        <>
                          <span style={lowStock ? { color: '#e74c3c', fontWeight: 'bold' } : {}}>
                            {inventory}
                          </span>
                          {lowStock && <span style={{ color: '#e74c3c', marginLeft: '0.25rem' }}>Low!</span>}
                        </>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </button>{' '}
                      <button
                        className="btn btn-sm"
                        onClick={() => handleToggleActive(item)}
                        style={{ background: isArchived ? '#27ae60' : '#95a5a6', color: 'white' }}
                      >
                        {isArchived ? 'Activate' : 'Archive'}
                      </button>{' '}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </button>
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
