import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

export default function InvoiceList({ onEdit, onView, onDuplicate, refreshKey }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState({ open: false, invoice: null });
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    loadInvoices();
  }, [refreshKey]);

  const loadInvoices = async () => {
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load invoices' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.deleteInvoice(id);
      setMessage({ type: 'success', text: 'Invoice deleted successfully' });
      loadInvoices();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete invoice' });
    }
  };

  const handleVoid = async (id) => {
    if (!confirm('Are you sure you want to void this invoice? This will restore inventory and mark it as voided.')) return;
    try {
      await api.voidInvoice(id);
      setMessage({ type: 'success', text: 'Invoice voided successfully' });
      loadInvoices();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to void invoice' });
    }
  };

  const openPaymentModal = (invoice) => {
    const balance = parseFloat(invoice.total) - parseFloat(invoice.amountPaid || 0);
    setPaymentAmount(balance.toFixed(2));
    setPaymentModal({ open: true, invoice });
  };

  const closePaymentModal = () => {
    setPaymentModal({ open: false, invoice: null });
    setPaymentAmount('');
  };

  const handleRecordPayment = async () => {
    if (!paymentModal.invoice) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid payment amount' });
      return;
    }

    const invoice = paymentModal.invoice;
    const total = parseFloat(invoice.total);
    const alreadyPaid = parseFloat(invoice.amountPaid || 0);
    const balance = total - alreadyPaid;

    // Warn if payment exceeds balance
    if (amount > balance) {
      setMessage({ type: 'error', text: `Payment amount ($${amount.toFixed(2)}) exceeds remaining balance ($${balance.toFixed(2)})` });
      return;
    }

    const newAmountPaid = alreadyPaid + amount;
    const newStatus = newAmountPaid >= total ? 'paid' : 'partial';

    try {
      await api.updateInvoicePayment(invoice.id, {
        paymentStatus: newStatus,
        amountPaid: newAmountPaid,
      });
      setMessage({
        type: 'success',
        text: `Payment of $${amount.toFixed(2)} recorded. Invoice ${newStatus === 'paid' ? 'fully paid' : 'partially paid'}.`
      });
      closePaymentModal();
      loadInvoices();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to record payment' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isPastDue = (invoice) => {
    if (invoice.paymentStatus === 'paid') return false;
    if (!invoice.dueDate) return false;
    return new Date(invoice.dueDate) < new Date();
  };

  const getStatusBadge = (invoice) => {
    if (invoice.paymentStatus === 'voided') {
      return <span className="status-badge status-voided">Voided</span>;
    }
    const pastDue = isPastDue(invoice);
    if (pastDue) {
      return <span className="status-badge status-overdue">Past Due</span>;
    }
    switch (invoice.paymentStatus) {
      case 'paid':
        return <span className="status-badge status-paid">Paid</span>;
      case 'partial':
        return <span className="status-badge status-partial">Partial</span>;
      default:
        return <span className="status-badge status-unpaid">Unpaid</span>;
    }
  };

  const pastDueCount = invoices.filter(isPastDue).length;

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      // Search filter (client name or invoice number)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesClient = invoice.clientName?.toLowerCase().includes(search);
        const matchesNumber = invoice.invoiceNumber?.toLowerCase().includes(search);
        if (!matchesClient && !matchesNumber) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pastdue') {
          if (!isPastDue(invoice)) return false;
        } else if (invoice.paymentStatus !== statusFilter) {
          return false;
        }
      }

      // Date range filter
      if (dateFrom) {
        const invoiceDate = new Date(invoice.invoiceDate || invoice.createdAt);
        if (invoiceDate < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const invoiceDate = new Date(invoice.invoiceDate || invoice.createdAt);
        if (invoiceDate > new Date(dateTo + 'T23:59:59')) return false;
      }

      return true;
    });
  }, [invoices, searchTerm, statusFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || dateFrom || dateTo;

  // Reset to page 1 when filters change
  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (loading) return <div className="loading">Loading invoices...</div>;

  return (
    <div className="card">
      <h2>Invoices</h2>

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

      {pastDueCount > 0 && (
        <div className="past-due-summary">
          {pastDueCount} invoice{pastDueCount > 1 ? 's' : ''} past due
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
        <div className="form-row" style={{ marginBottom: '0.5rem' }}>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <input
              type="text"
              placeholder="Search by client or invoice #..."
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm)(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <select value={statusFilter} onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}>
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="pastdue">Past Due</option>
              <option value="voided">Voided</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
            />
          </div>
          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          )}
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {hasActiveFilters
              ? `Showing ${filteredInvoices.length} of ${invoices.length} invoices`
              : `${invoices.length} invoices`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem' }}>Per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '0.25rem', fontSize: '0.85rem' }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="empty-state">
          <p>No invoices yet. Create your first invoice above.</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="empty-state">
          <p>No invoices match your filters.</p>
        </div>
      ) : (
        <div>
          {paginatedInvoices.map((invoice) => (
            <div key={invoice.id} className={`invoice-list-item ${isPastDue(invoice) ? 'past-due' : ''}`}>
              <div className="invoice-info">
                <h4>
                  {invoice.invoiceNumber || `#${invoice.id}`}
                  {' '}
                  {getStatusBadge(invoice)}
                </h4>
                <p>
                  {invoice.clientName || 'Unknown Client'} • {formatDate(invoice.invoiceDate || invoice.createdAt)}
                  {invoice.dueDate && <span> • Due: {formatDate(invoice.dueDate)}</span>}
                  {invoice.paymentStatus === 'paid' && invoice.paymentDate && (
                    <span style={{ color: '#27ae60' }}> • Paid: {formatDate(invoice.paymentDate)}</span>
                  )}
                </p>
              </div>
              <div>
                <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
                  <strong>${parseFloat(invoice.total).toFixed(2)}</strong>
                  {invoice.paymentStatus !== 'paid' && invoice.paymentStatus !== 'voided' && parseFloat(invoice.amountPaid || 0) > 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#e67e22' }}>
                      Paid: ${parseFloat(invoice.amountPaid).toFixed(2)} |
                      Balance: ${(parseFloat(invoice.total) - parseFloat(invoice.amountPaid || 0)).toFixed(2)}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => onView(invoice.id)}
                  style={{ marginRight: '0.5rem' }}
                >
                  View/Print
                </button>
                {invoice.paymentStatus !== 'voided' && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => onEdit(invoice.id)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Edit
                  </button>
                )}
                {onDuplicate && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => onDuplicate(invoice.id)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Duplicate
                  </button>
                )}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(invoice.id)}
                  style={{ marginRight: '0.5rem' }}
                >
                  Delete
                </button>
                {invoice.paymentStatus !== 'voided' && invoice.paymentStatus !== 'paid' && (
                  <button
                    className="btn btn-sm"
                    onClick={() => openPaymentModal(invoice)}
                    style={{ background: '#27ae60', color: 'white', marginRight: '0.5rem' }}
                  >
                    Record Payment
                  </button>
                )}
                {invoice.paymentStatus !== 'voided' && (
                  <button
                    className="btn btn-sm"
                    onClick={() => handleVoid(invoice.id)}
                    style={{ background: '#f39c12', color: 'white' }}
                  >
                    Void
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap'
            }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>

              {getPageNumbers().map(page => (
                <button
                  key={page}
                  className={`btn btn-sm ${page === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCurrentPage(page)}
                  style={{ minWidth: '40px' }}
                >
                  {page}
                </button>
              ))}

              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>

              <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: '#666' }}>
                Page {currentPage} of {totalPages}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal.open && paymentModal.invoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '8px',
            maxWidth: '400px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0 }}>Record Payment</h3>
            <p style={{ color: '#666' }}>
              {paymentModal.invoice.invoiceNumber || `Invoice #${paymentModal.invoice.id}`}
              <br />
              <strong>Total:</strong> ${parseFloat(paymentModal.invoice.total).toFixed(2)}
              <br />
              <strong>Already Paid:</strong> ${parseFloat(paymentModal.invoice.amountPaid || 0).toFixed(2)}
              <br />
              <strong>Balance Due:</strong> ${(parseFloat(paymentModal.invoice.total) - parseFloat(paymentModal.invoice.amountPaid || 0)).toFixed(2)}
            </p>
            <div className="form-group">
              <label>Payment Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={closePaymentModal}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleRecordPayment}>
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
