import { useState, useEffect } from 'react';
import { api } from '../api';

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalBilled: 0,
    totalCollected: 0,
    unpaidTotal: 0,
    paidThisMonth: 0,
    overdueTotal: 0,
    overdueCount: 0,
    invoiceCount: 0,
    lowStockItems: [],
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const [invoices, items, inventoryProducts, allComponents] = await Promise.all([
        api.getInvoices(),
        api.getItems(),
        api.getInventoryProducts(),
        api.getAllItemComponents(),
      ]);

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      let totalBilled = 0;
      let totalCollected = 0;
      let unpaidTotal = 0;
      let paidThisMonth = 0;
      let overdueTotal = 0;
      let overdueCount = 0;

      invoices.forEach(inv => {
        // Skip voided invoices entirely
        if (inv.paymentStatus === 'voided') return;

        const total = parseFloat(inv.total) || 0;
        const amountPaid = parseFloat(inv.amountPaid) || 0;
        totalBilled += total;
        totalCollected += amountPaid;

        if (inv.paymentStatus !== 'paid') {
          unpaidTotal += total - (parseFloat(inv.amountPaid) || 0);

          // Check if overdue
          if (inv.dueDate && new Date(inv.dueDate) < now) {
            overdueTotal += total - (parseFloat(inv.amountPaid) || 0);
            overdueCount++;
          }
        }

        // Paid this month - use payment date, not invoice date
        if (inv.paymentStatus === 'paid' && inv.paymentDate) {
          const paidDate = new Date(inv.paymentDate);
          if (paidDate.getMonth() === thisMonth && paidDate.getFullYear() === thisYear) {
            paidThisMonth += total;
          }
        }
      });

      // Low stock items (including shared inventory and recipe items)
      const lowStockItems = [];

      // Group components by itemId
      const componentsByItem = {};
      allComponents.forEach(comp => {
        if (!componentsByItem[comp.itemId]) {
          componentsByItem[comp.itemId] = [];
        }
        componentsByItem[comp.itemId].push(comp);
      });

      items.forEach(item => {
        const itemComponents = componentsByItem[item.id];

        if (itemComponents && itemComponents.length > 0) {
          // Recipe item - calculate how many can be built
          let buildable = Infinity;
          itemComponents.forEach(comp => {
            const canBuild = Math.floor(comp.availableQty / comp.quantityNeeded);
            buildable = Math.min(buildable, canBuild);
          });
          buildable = buildable === Infinity ? 0 : buildable;

          // Alert if can build 5 or fewer
          if (buildable <= 5) {
            lowStockItems.push({
              name: `${item.name} (Recipe)`,
              quantity: buildable,
              reorderLevel: 'Can build',
              isRecipe: true,
            });
          }
        } else if (!item.baseInventoryId) {
          const inventory = parseInt(item.inventory) || 0;
          const reorderLevel = parseInt(item.reorderLevel) || 0;
          if (reorderLevel > 0 && inventory <= reorderLevel) {
            lowStockItems.push({
              name: item.name,
              quantity: inventory,
              reorderLevel,
            });
          }
        }
      });

      inventoryProducts.forEach(product => {
        const quantity = parseInt(product.quantity) || 0;
        const reorderLevel = parseInt(product.reorderLevel) || 0;
        if (reorderLevel > 0 && quantity <= reorderLevel) {
          lowStockItems.push({
            name: `${product.name} (Shared)`,
            quantity,
            reorderLevel,
          });
        }
      });

      // Count active (non-voided) invoices
      const activeInvoiceCount = invoices.filter(inv => inv.paymentStatus !== 'voided').length;

      setMetrics({
        totalBilled: roundMoney(totalBilled),
        totalCollected: roundMoney(totalCollected),
        unpaidTotal: roundMoney(unpaidTotal),
        paidThisMonth: roundMoney(paidThisMonth),
        overdueTotal: roundMoney(overdueTotal),
        overdueCount,
        invoiceCount: activeInvoiceCount,
        lowStockItems,
      });
    } catch (err) {
      console.error('Failed to load metrics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="card">
        <h2>Dashboard</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#2e7d32', marginBottom: '0.5rem' }}>Total Collected</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1b5e20' }}>
              ${metrics.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>of ${metrics.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })} billed</div>
          </div>

          <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#1565c0', marginBottom: '0.5rem' }}>Collected This Month</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0d47a1' }}>
              ${metrics.paidThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#e65100', marginBottom: '0.5rem' }}>Unpaid Total</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#bf360c' }}>
              ${metrics.unpaidTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {metrics.overdueCount > 0 && (
            <div style={{ padding: '1rem', background: '#ffebee', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#c62828', marginBottom: '0.5rem' }}>Overdue</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#b71c1c' }}>
                ${metrics.overdueTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#c62828' }}>{metrics.overdueCount} invoice{metrics.overdueCount > 1 ? 's' : ''}</div>
            </div>
          )}
        </div>
      </div>

      {metrics.lowStockItems.length > 0 && (
        <div className="card">
          <h2>Low Stock Alerts</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
              </tr>
            </thead>
            <tbody>
              {metrics.lowStockItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td style={{ color: '#e74c3c', fontWeight: 'bold' }}>{item.quantity}</td>
                  <td>{item.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
