import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

export default function InventoryManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await api.getItems();
      setItems(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load inventory' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (item, delta) => {
    const newQty = Math.max(0, (item.inventory || 0) + delta);
    try {
      await api.updateItem(item.id, { ...item, inventory: newQty });
      setMessage({ type: 'success', text: `Updated ${item.name} stock to ${newQty}` });
      loadItems();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update inventory' });
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => item.active !== 0); // Only show active items

    if (showLowStockOnly) {
      filtered = filtered.filter(item => {
        const inventory = item.inventory || 0;
        const reorderLevel = item.reorderLevel || 0;
        return reorderLevel > 0 && inventory <= reorderLevel;
      });
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => item.name?.toLowerCase().includes(search));
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortColumn) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'inventory':
          aVal = a.inventory || 0;
          bVal = b.inventory || 0;
          break;
        case 'reorderLevel':
          aVal = a.reorderLevel || 0;
          bVal = b.reorderLevel || 0;
          break;
        case 'status':
          // Low stock items first when ascending
          const aLow = (a.reorderLevel || 0) > 0 && (a.inventory || 0) <= (a.reorderLevel || 0);
          const bLow = (b.reorderLevel || 0) > 0 && (b.inventory || 0) <= (b.reorderLevel || 0);
          aVal = aLow ? 0 : 1;
          bVal = bLow ? 0 : 1;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [items, searchTerm, showLowStockOnly, sortColumn, sortDirection]);

  const lowStockCount = items.filter(item => {
    const inventory = item.inventory || 0;
    const reorderLevel = item.reorderLevel || 0;
    return item.active !== 0 && reorderLevel > 0 && inventory <= reorderLevel;
  }).length;

  if (loading) return <div className="loading">Loading inventory...</div>;

  return (
    <div>
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <div className="card">
        <h2>Inventory Overview</h2>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          Quick stock management. Use the Items tab to add new items or edit components.
        </p>

        {lowStockCount > 0 && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} at or below reorder level
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
          {lowStockCount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
              />
              Low stock only ({lowStockCount})
            </label>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>{showLowStockOnly ? 'No items at low stock.' : 'No items found.'}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Item {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('inventory')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  In Stock {sortColumn === 'inventory' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('reorderLevel')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Reorder At {sortColumn === 'reorderLevel' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Status {sortColumn === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th>Quick Adjust</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const inventory = item.inventory || 0;
                const reorderLevel = item.reorderLevel || 0;
                const lowStock = reorderLevel > 0 && inventory <= reorderLevel;
                const hasComponents = item.componentCount > 0;

                return (
                  <tr key={item.id}>
                    <td>
                      {item.name}
                      {hasComponents && (
                        <span style={{ color: '#3498db', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                          ({item.componentCount} parts)
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={item.editValue !== undefined ? item.editValue : inventory}
                        onChange={(e) => {
                          const newItems = items.map(i =>
                            i.id === item.id ? { ...i, editValue: e.target.value } : i
                          );
                          setItems(newItems);
                        }}
                        onBlur={(e) => {
                          const newQty = parseInt(e.target.value);
                          if (!isNaN(newQty) && newQty >= 0 && newQty !== inventory) {
                            handleAdjust(item, newQty - inventory);
                          } else {
                            // Reset to original if invalid
                            const newItems = items.map(i =>
                              i.id === item.id ? { ...i, editValue: undefined } : i
                            );
                            setItems(newItems);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                          }
                          if (e.key === 'Escape') {
                            const newItems = items.map(i =>
                              i.id === item.id ? { ...i, editValue: undefined } : i
                            );
                            setItems(newItems);
                          }
                        }}
                        style={{
                          width: '70px',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: lowStock ? '#e74c3c' : 'var(--text-primary)',
                          fontWeight: lowStock ? 'bold' : 'normal',
                          textAlign: 'center'
                        }}
                      />
                    </td>
                    <td>{reorderLevel || '-'}</td>
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
                        onClick={() => handleAdjust(item, -1)}
                        disabled={inventory <= 0}
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        -1
                      </button>{' '}
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleAdjust(item, 1)}
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        +1
                      </button>{' '}
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleAdjust(item, 10)}
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        +10
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
