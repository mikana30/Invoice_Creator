import { useState, useEffect } from 'react';
import { api } from '../api';

export default function InventoryManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', quantity: '', reorderLevel: '' });
  const [message, setMessage] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [linkedItems, setLinkedItems] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.getInventoryProducts();
      setProducts(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load inventory products' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const productData = {
      name: form.name,
      quantity: parseInt(form.quantity) || 0,
      reorderLevel: parseInt(form.reorderLevel) || 0,
    };
    try {
      if (editingId) {
        await api.updateInventoryProduct(editingId, productData);
        setMessage({ type: 'success', text: 'Inventory product updated successfully' });
      } else {
        await api.createInventoryProduct(productData);
        setMessage({ type: 'success', text: 'Inventory product created successfully' });
      }
      setForm({ name: '', quantity: '', reorderLevel: '' });
      setEditingId(null);
      await loadProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save inventory product' });
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      quantity: product.quantity?.toString() || '',
      reorderLevel: product.reorderLevel?.toString() || '',
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this inventory product?')) return;
    try {
      await api.deleteInventoryProduct(id);
      setMessage({ type: 'success', text: 'Inventory product deleted successfully' });
      if (expandedProduct === id) {
        setExpandedProduct(null);
        setLinkedItems([]);
      }
      await loadProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete inventory product' });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '', quantity: '', reorderLevel: '' });
  };

  const handleToggleLinkedItems = async (productId) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      setLinkedItems([]);
    } else {
      try {
        const items = await api.getInventoryProductItems(productId);
        setLinkedItems(items);
        setExpandedProduct(productId);
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to load linked items' });
      }
    }
  };

  if (loading) return <div className="loading">Loading inventory products...</div>;

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
        <h2>{editingId ? 'Edit Inventory Product' : 'Add Inventory Product'}</h2>
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Create base inventory items that can be shared across multiple sell items.
          For example, a "Notebook" inventory can be linked to both "Youth Notebook" and "Guest Central Notebook" items.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Product Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Spiral Notebook"
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Quantity in Stock</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
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
              />
              <small style={{ color: '#888' }}>Alert when stock falls below this</small>
            </div>
          </div>
          <div className="btn-group">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Product' : 'Add Product'}
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
        <h2>Inventory Products</h2>
        {products.length === 0 ? (
          <div className="empty-state">
            <p>No inventory products yet. Add your first base inventory product above.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Quantity</th>
                <th>Reorder Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const quantity = parseInt(product.quantity) || 0;
                const reorderLevel = parseInt(product.reorderLevel) || 0;
                const lowStock = quantity <= reorderLevel && reorderLevel > 0;
                return (
                  <>
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>
                        <span style={lowStock ? { color: '#e74c3c', fontWeight: 'bold' } : {}}>
                          {quantity}
                        </span>
                      </td>
                      <td>{reorderLevel}</td>
                      <td>
                        {lowStock ? (
                          <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>Low Stock!</span>
                        ) : (
                          <span style={{ color: '#27ae60' }}>OK</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleToggleLinkedItems(product.id)}
                        >
                          {expandedProduct === product.id ? 'Hide' : 'View'} Items
                        </button>{' '}
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(product)}
                        >
                          Edit
                        </button>{' '}
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(product.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {expandedProduct === product.id && (
                      <tr key={`${product.id}-items`}>
                        <td colSpan="5" style={{ background: '#f8f9fa', padding: '1rem' }}>
                          <strong>Linked Sell Items:</strong>
                          {linkedItems.length === 0 ? (
                            <p style={{ color: '#888', margin: '0.5rem 0 0' }}>
                              No items linked to this inventory. Go to Items and select this as the base inventory.
                            </p>
                          ) : (
                            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.5rem' }}>
                              {linkedItems.map((item) => (
                                <li key={item.id}>
                                  {item.name} - ${parseFloat(item.price).toFixed(2)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
