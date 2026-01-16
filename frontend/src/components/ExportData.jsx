import { useState } from 'react';
import { api } from '../api';

// Helper to round money
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function ExportData() {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);

  // Report template state
  const [selectedReport, setSelectedReport] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const escapeCSV = (value) => {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadCSV = (data, filename) => {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportClients = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const clients = await api.getClients();
      const headers = ['ID', 'Name', 'Street', 'Street2', 'City', 'State', 'ZIP', 'Phone', 'Email'];
      const rows = clients.map(c => [
        c.id, c.name, c.street, c.street2, c.city, c.state, c.zip, c.phone, c.email
      ].map(escapeCSV).join(','));
      downloadCSV([headers.join(','), ...rows].join('\n'), `clients-${new Date().toISOString().split('T')[0]}.csv`);
      setMessage({ type: 'success', text: `Exported ${clients.length} clients` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export clients' });
    }
    setExporting(false);
  };

  const exportItems = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const items = await api.getItems();
      const headers = ['ID', 'Name', 'Price', 'Cost', 'Inventory', 'Reorder Level', 'Margin %'];
      const rows = items.map(i => {
        const price = parseFloat(i.price) || 0;
        const cost = parseFloat(i.cost) || 0;
        const margin = price > 0 ? ((price - cost) / price * 100).toFixed(1) : '0';
        return [
          i.id, i.name, price.toFixed(2), cost.toFixed(2),
          i.inventory || 0, i.reorderLevel || 0, margin
        ].map(escapeCSV).join(',');
      });
      downloadCSV([headers.join(','), ...rows].join('\n'), `items-${new Date().toISOString().split('T')[0]}.csv`);
      setMessage({ type: 'success', text: `Exported ${items.length} items` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export items' });
    }
    setExporting(false);
  };

  const exportInvoices = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const invoices = await api.getInvoices();
      const headers = ['Invoice #', 'Date', 'Due Date', 'Client', 'Total', 'Status', 'Amount Paid'];
      const rows = invoices.map(i => [
        i.invoiceNumber || i.id,
        i.invoiceDate?.split('T')[0] || '',
        i.dueDate?.split('T')[0] || '',
        i.clientName || '',
        parseFloat(i.total).toFixed(2),
        i.paymentStatus || 'unpaid',
        parseFloat(i.amountPaid || 0).toFixed(2)
      ].map(escapeCSV).join(','));
      downloadCSV([headers.join(','), ...rows].join('\n'), `invoices-${new Date().toISOString().split('T')[0]}.csv`);
      setMessage({ type: 'success', text: `Exported ${invoices.length} invoices` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export invoices' });
    }
    setExporting(false);
  };

  const exportFinancialSummary = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const invoices = await api.getInvoices();
      const settings = await api.getSettings();

      // Group by month
      const monthlyData = {};
      invoices.forEach(inv => {
        const date = new Date(inv.invoiceDate || inv.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, count: 0, paid: 0, unpaid: 0 };
        }
        monthlyData[monthKey].revenue += parseFloat(inv.total) || 0;
        monthlyData[monthKey].count += 1;
        if (inv.paymentStatus === 'paid') {
          monthlyData[monthKey].paid += parseFloat(inv.total) || 0;
        } else {
          monthlyData[monthKey].unpaid += parseFloat(inv.total) || 0;
        }
      });

      const headers = ['Month', 'Invoice Count', 'Total Revenue', 'Paid', 'Unpaid'];
      const rows = Object.entries(monthlyData)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, data]) => [
          month,
          data.count,
          data.revenue.toFixed(2),
          data.paid.toFixed(2),
          data.unpaid.toFixed(2)
        ].map(escapeCSV).join(','));

      // Add totals row
      const totals = Object.values(monthlyData).reduce((acc, data) => ({
        count: acc.count + data.count,
        revenue: acc.revenue + data.revenue,
        paid: acc.paid + data.paid,
        unpaid: acc.unpaid + data.unpaid
      }), { count: 0, revenue: 0, paid: 0, unpaid: 0 });

      rows.push(['TOTAL', totals.count, totals.revenue.toFixed(2), totals.paid.toFixed(2), totals.unpaid.toFixed(2)].join(','));

      downloadCSV([headers.join(','), ...rows].join('\n'), `financial-summary-${new Date().toISOString().split('T')[0]}.csv`);
      setMessage({ type: 'success', text: 'Exported financial summary' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export financial summary' });
    }
    setExporting(false);
  };

  // Helper to filter invoices by date range
  const filterByDateRange = (invoices, from, to) => {
    return invoices.filter(inv => {
      if (inv.paymentStatus === 'voided') return false;
      const invDate = inv.invoiceDate?.split('T')[0] || '';
      if (from && invDate < from) return false;
      if (to && invDate > to) return false;
      return true;
    });
  };

  // Report: Profit Analysis
  const generateProfitAnalysis = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const [invoices, settings] = await Promise.all([
        api.getInvoices(),
        api.getSettings(),
      ]);

      const filtered = filterByDateRange(invoices, dateFrom, dateTo);
      const feePercent = settings.sellingFeePercent || 0;
      const feeFixed = settings.sellingFeeFixed || 0;

      // Aggregate data
      let totalRevenue = 0;
      let totalCosts = 0;
      let totalFees = 0;
      let totalTax = 0;
      const itemStats = {};

      for (const inv of filtered) {
        const invoiceData = await api.getInvoice(inv.id);
        const subtotal = (invoiceData.items || []).reduce((sum, item) => {
          const itemTotal = (parseFloat(item.price) || 0) * (item.quantity || 0);
          const itemCost = (parseFloat(item.itemCost) || 0) * (item.quantity || 0);

          // Track per-item stats
          const itemName = item.itemName || 'Unknown';
          if (!itemStats[itemName]) {
            itemStats[itemName] = { revenue: 0, cost: 0, qty: 0 };
          }
          itemStats[itemName].revenue += itemTotal;
          itemStats[itemName].cost += itemCost;
          itemStats[itemName].qty += item.quantity || 0;

          totalCosts += itemCost;
          return sum + itemTotal;
        }, 0);

        totalRevenue += parseFloat(inv.total) || 0;
        totalTax += (parseFloat(inv.total) || 0) - subtotal;
        totalFees += roundMoney((subtotal * feePercent / 100) + (subtotal > 0 ? feeFixed : 0));
      }

      const totalProfit = roundMoney(totalRevenue - totalCosts - totalFees);

      // Build CSV
      const rows = [
        ['PROFIT ANALYSIS REPORT'],
        [`Date Range: ${dateFrom || 'All'} to ${dateTo || 'All'}`],
        [''],
        ['SUMMARY'],
        ['Metric', 'Amount'],
        ['Total Revenue (with tax)', `$${roundMoney(totalRevenue).toFixed(2)}`],
        ['Total Item Costs', `$${roundMoney(totalCosts).toFixed(2)}`],
        ['Total Selling Fees', `$${roundMoney(totalFees).toFixed(2)}`],
        ['Tax Collected', `$${roundMoney(totalTax).toFixed(2)}`],
        ['NET PROFIT', `$${totalProfit.toFixed(2)}`],
        ['Profit Margin', `${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%`],
        [''],
        ['PROFIT BY ITEM'],
        ['Item', 'Qty Sold', 'Revenue', 'Cost', 'Profit', 'Margin %'],
      ];

      Object.entries(itemStats)
        .sort((a, b) => (b[1].revenue - b[1].cost) - (a[1].revenue - a[1].cost))
        .forEach(([name, stats]) => {
          const profit = stats.revenue - stats.cost;
          const margin = stats.revenue > 0 ? ((profit / stats.revenue) * 100).toFixed(1) : '0';
          rows.push([
            escapeCSV(name),
            stats.qty,
            `$${stats.revenue.toFixed(2)}`,
            `$${stats.cost.toFixed(2)}`,
            `$${profit.toFixed(2)}`,
            `${margin}%`
          ]);
        });

      downloadCSV(rows.map(r => r.join(',')).join('\n'), `profit-analysis-${new Date().toISOString().split('T')[0]}.csv`);
      setMessage({ type: 'success', text: `Generated Profit Analysis for ${filtered.length} invoices` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to generate Profit Analysis' });
    }
    setExporting(false);
  };

  // Report: Inventory Value
  const generateInventoryValue = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const [items, inventoryProducts] = await Promise.all([
        api.getItems(),
        api.getInventoryProducts(),
      ]);

      const rows = [
        ['INVENTORY VALUE REPORT'],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [''],
        ['SELLABLE ITEMS'],
        ['Item', 'On Hand', 'Unit Cost', 'Total Value', 'Sell Price', 'Potential Revenue'],
      ];

      let totalItemValue = 0;
      let totalPotentialRevenue = 0;

      items.filter(i => i.active !== 0).forEach(item => {
        const qty = item.baseInventoryId ? (parseInt(item.baseInventoryQty) || 0) : (parseInt(item.inventory) || 0);
        const cost = parseFloat(item.cost) || 0;
        const price = parseFloat(item.price) || 0;
        const value = qty * cost;
        const potential = qty * price;
        totalItemValue += value;
        totalPotentialRevenue += potential;

        rows.push([
          escapeCSV(item.name),
          qty,
          `$${cost.toFixed(2)}`,
          `$${value.toFixed(2)}`,
          `$${price.toFixed(2)}`,
          `$${potential.toFixed(2)}`
        ]);
      });

      rows.push(['', '', '', `$${totalItemValue.toFixed(2)}`, '', `$${totalPotentialRevenue.toFixed(2)}`]);
      rows.push(['']);
      rows.push(['INVENTORY PRODUCTS (Raw Materials)']);
      rows.push(['Product', 'On Hand', 'Reorder Level', 'Status']);

      inventoryProducts.forEach(product => {
        const qty = parseInt(product.quantity) || 0;
        const reorder = parseInt(product.reorderLevel) || 0;
        const status = reorder > 0 && qty <= reorder ? 'LOW STOCK' : 'OK';
        rows.push([
          escapeCSV(product.name),
          qty,
          reorder,
          status
        ]);
      });

      rows.push(['']);
      rows.push(['SUMMARY']);
      rows.push(['Total Inventory Cost Value', `$${totalItemValue.toFixed(2)}`]);
      rows.push(['Total Potential Revenue', `$${totalPotentialRevenue.toFixed(2)}`]);
      rows.push(['Potential Gross Profit', `$${(totalPotentialRevenue - totalItemValue).toFixed(2)}`]);

      downloadCSV(rows.map(r => r.join(',')).join('\n'), `inventory-value-${new Date().toISOString().split('T')[0]}.csv`);
      setMessage({ type: 'success', text: 'Generated Inventory Value Report' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to generate Inventory Value Report' });
    }
    setExporting(false);
  };

  // Report: Client Revenue Summary
  const generateClientRevenue = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const invoices = await api.getInvoices();
      const filtered = filterByDateRange(invoices, dateFrom, dateTo);

      const clientStats = {};
      filtered.forEach(inv => {
        const clientName = inv.clientName || 'Unknown';
        if (!clientStats[clientName]) {
          clientStats[clientName] = { invoices: 0, billed: 0, collected: 0, outstanding: 0 };
        }
        const total = parseFloat(inv.total) || 0;
        const paid = parseFloat(inv.amountPaid) || 0;
        clientStats[clientName].invoices += 1;
        clientStats[clientName].billed += total;
        clientStats[clientName].collected += inv.paymentStatus === 'paid' ? total : paid;
        clientStats[clientName].outstanding += inv.paymentStatus === 'paid' ? 0 : (total - paid);
      });

      const rows = [
        ['CLIENT REVENUE SUMMARY'],
        [`Date Range: ${dateFrom || 'All'} to ${dateTo || 'All'}`],
        [''],
        ['Client', 'Invoices', 'Total Billed', 'Collected', 'Outstanding'],
      ];

      let totals = { invoices: 0, billed: 0, collected: 0, outstanding: 0 };

      Object.entries(clientStats)
        .sort((a, b) => b[1].billed - a[1].billed)
        .forEach(([name, stats]) => {
          rows.push([
            escapeCSV(name),
            stats.invoices,
            `$${stats.billed.toFixed(2)}`,
            `$${stats.collected.toFixed(2)}`,
            `$${stats.outstanding.toFixed(2)}`
          ]);
          totals.invoices += stats.invoices;
          totals.billed += stats.billed;
          totals.collected += stats.collected;
          totals.outstanding += stats.outstanding;
        });

      rows.push(['']);
      rows.push(['TOTAL', totals.invoices, `$${totals.billed.toFixed(2)}`, `$${totals.collected.toFixed(2)}`, `$${totals.outstanding.toFixed(2)}`]);

      downloadCSV(rows.map(r => r.join(',')).join('\n'), `client-revenue-${new Date().toISOString().split('T')[0]}.csv`);
      setMessage({ type: 'success', text: `Generated Client Revenue Summary for ${Object.keys(clientStats).length} clients` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to generate Client Revenue Summary' });
    }
    setExporting(false);
  };

  // Report: Tax Report
  const generateTaxReport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const [invoices, settings] = await Promise.all([
        api.getInvoices(),
        api.getSettings(),
      ]);

      const filtered = filterByDateRange(invoices, dateFrom, dateTo);
      const taxRate = settings.taxRate || 0.08;

      let totalTaxable = 0;
      let totalNonTaxable = 0;
      let totalTaxCollected = 0;
      const monthlyTax = {};

      for (const inv of filtered) {
        const invoiceData = await api.getInvoice(inv.id);
        let taxable = 0;
        let nonTaxable = 0;

        (invoiceData.items || []).forEach(item => {
          const lineTotal = (parseFloat(item.price) || 0) * (item.quantity || 0);
          if (item.taxExempt) {
            nonTaxable += lineTotal;
          } else {
            taxable += lineTotal;
          }
        });

        const taxAmount = roundMoney(taxable * taxRate);
        totalTaxable += taxable;
        totalNonTaxable += nonTaxable;
        totalTaxCollected += taxAmount;

        // Group by month
        const date = new Date(inv.invoiceDate || inv.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyTax[monthKey]) {
          monthlyTax[monthKey] = { taxable: 0, nonTaxable: 0, tax: 0 };
        }
        monthlyTax[monthKey].taxable += taxable;
        monthlyTax[monthKey].nonTaxable += nonTaxable;
        monthlyTax[monthKey].tax += taxAmount;
      }

      const rows = [
        ['TAX REPORT'],
        [`Date Range: ${dateFrom || 'All'} to ${dateTo || 'All'}`],
        [`Tax Rate: ${(taxRate * 100).toFixed(2)}%`],
        [''],
        ['SUMMARY'],
        ['Taxable Sales', `$${totalTaxable.toFixed(2)}`],
        ['Non-Taxable Sales', `$${totalNonTaxable.toFixed(2)}`],
        ['Total Sales', `$${(totalTaxable + totalNonTaxable).toFixed(2)}`],
        ['TAX COLLECTED', `$${totalTaxCollected.toFixed(2)}`],
        [''],
        ['TAX BY MONTH'],
        ['Month', 'Taxable Sales', 'Non-Taxable', 'Tax Collected'],
      ];

      Object.entries(monthlyTax)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([month, data]) => {
          rows.push([
            month,
            `$${data.taxable.toFixed(2)}`,
            `$${data.nonTaxable.toFixed(2)}`,
            `$${data.tax.toFixed(2)}`
          ]);
        });

      downloadCSV(rows.map(r => r.join(',')).join('\n'), `tax-report-${new Date().toISOString().split('T')[0]}.csv`);
      setMessage({ type: 'success', text: `Generated Tax Report for ${filtered.length} invoices` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to generate Tax Report' });
    }
    setExporting(false);
  };

  // Report: Sales by Item
  const generateSalesByItem = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const invoices = await api.getInvoices();
      const filtered = filterByDateRange(invoices, dateFrom, dateTo);

      const itemStats = {};

      for (const inv of filtered) {
        const invoiceData = await api.getInvoice(inv.id);
        (invoiceData.items || []).forEach(item => {
          const itemName = item.itemName || 'Unknown';
          if (!itemStats[itemName]) {
            itemStats[itemName] = { qty: 0, revenue: 0, invoices: new Set() };
          }
          itemStats[itemName].qty += item.quantity || 0;
          itemStats[itemName].revenue += (parseFloat(item.price) || 0) * (item.quantity || 0);
          itemStats[itemName].invoices.add(inv.id);
        });
      }

      const rows = [
        ['SALES BY ITEM REPORT'],
        [`Date Range: ${dateFrom || 'All'} to ${dateTo || 'All'}`],
        [''],
        ['Item', 'Qty Sold', 'Revenue', '# of Invoices', 'Avg Price'],
      ];

      let totalQty = 0;
      let totalRevenue = 0;

      Object.entries(itemStats)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .forEach(([name, stats]) => {
          const avgPrice = stats.qty > 0 ? stats.revenue / stats.qty : 0;
          rows.push([
            escapeCSV(name),
            stats.qty,
            `$${stats.revenue.toFixed(2)}`,
            stats.invoices.size,
            `$${avgPrice.toFixed(2)}`
          ]);
          totalQty += stats.qty;
          totalRevenue += stats.revenue;
        });

      rows.push(['']);
      rows.push(['TOTAL', totalQty, `$${totalRevenue.toFixed(2)}`, '', '']);

      downloadCSV(rows.map(r => r.join(',')).join('\n'), `sales-by-item-${new Date().toISOString().split('T')[0]}.csv`);
      setMessage({ type: 'success', text: `Generated Sales by Item Report for ${Object.keys(itemStats).length} items` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to generate Sales by Item Report' });
    }
    setExporting(false);
  };

  // Generate selected report
  const generateReport = () => {
    switch (selectedReport) {
      case 'profit': return generateProfitAnalysis();
      case 'inventory': return generateInventoryValue();
      case 'client': return generateClientRevenue();
      case 'tax': return generateTaxReport();
      case 'sales': return generateSalesByItem();
      default:
        setMessage({ type: 'error', text: 'Please select a report type' });
    }
  };

  return (
    <div className="card">
      <h2>Export Data</h2>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Download your data as CSV files for use in spreadsheet applications like Excel or Google Sheets.
      </p>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1rem' }}>
          {message.text}
          <button
            onClick={() => setMessage(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button className="btn btn-primary" onClick={exportClients} disabled={exporting}>
          Export Clients
        </button>
        <button className="btn btn-primary" onClick={exportItems} disabled={exporting}>
          Export Items (with cost & inventory)
        </button>
        <button className="btn btn-primary" onClick={exportInvoices} disabled={exporting}>
          Export Invoices
        </button>
        <button className="btn btn-primary" onClick={exportFinancialSummary} disabled={exporting}>
          Export Financial Summary (by month)
        </button>
      </div>

      {/* Report Templates Section */}
      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e0e0e0' }}>
        <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Report Templates</h3>
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Generate detailed reports with customizable date ranges.
        </p>

        <div className="form-row" style={{ marginBottom: '1rem' }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label>Report Type</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="">-- Select a Report --</option>
              <option value="profit">Profit Analysis</option>
              <option value="inventory">Inventory Value</option>
              <option value="client">Client Revenue Summary</option>
              <option value="tax">Tax Report</option>
              <option value="sales">Sales by Item</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
        </div>

        {selectedReport && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px', fontSize: '0.85rem' }}>
            {selectedReport === 'profit' && (
              <span><strong>Profit Analysis:</strong> Revenue, costs, fees, and profit margins. Shows overall summary and breakdown by item.</span>
            )}
            {selectedReport === 'inventory' && (
              <span><strong>Inventory Value:</strong> Current stock levels, cost values, and potential revenue. Includes raw materials status.</span>
            )}
            {selectedReport === 'client' && (
              <span><strong>Client Revenue:</strong> Total billed, collected, and outstanding amounts per client.</span>
            )}
            {selectedReport === 'tax' && (
              <span><strong>Tax Report:</strong> Taxable vs non-taxable sales and tax collected, broken down by month.</span>
            )}
            {selectedReport === 'sales' && (
              <span><strong>Sales by Item:</strong> Quantity sold, revenue, and average price for each item.</span>
            )}
          </div>
        )}

        <button
          className="btn btn-success"
          onClick={generateReport}
          disabled={exporting || !selectedReport}
          style={{ minWidth: '200px' }}
        >
          {exporting ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
    </div>
  );
}
