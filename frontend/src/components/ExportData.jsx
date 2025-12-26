import { useState } from 'react';
import { api } from '../api';

export default function ExportData() {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);

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
    </div>
  );
}
