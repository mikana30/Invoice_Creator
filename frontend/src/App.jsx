/**
 * Invoice Creator
 * Copyright (c) 2025 Blue Line Scannables. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or modification of this software is strictly prohibited.
 * Contact: bluelinescannables@gmail.com
 */

import { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import ItemManager from './components/ItemManager';
import InventoryManager from './components/InventoryManager';
import InvoiceForm from './components/InvoiceForm';
import InvoiceList from './components/InvoiceList';
import InvoicePrint from './components/InvoicePrint';
import Settings from './components/Settings';
import ExportData from './components/ExportData';
import UpdateNotification from './components/UpdateNotification';
import SupportForm from './components/SupportForm';
import AboutDialog from './components/AboutDialog';
import { api } from './api';

// Software Identity Verification - Blue Line Scannables
// Build ID: BLS-IC-2025-7X9K2M4P
const _0x7b3f = atob('Qmx1ZSBMaW5lIFNjYW5uYWJsZXMgLSBJbnZvaWNlIENyZWF0b3IgLSBDb3B5cmlnaHQgMjAyNQ==');
const _0x9a2e = { v: '1.2.1', b: 'BLS-IC-7X9K2M4P', t: Date.now() };

function App() {
  const [currentView, setCurrentView] = useState('invoices');
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState(null);
  const [invoiceListKey, setInvoiceListKey] = useState(0);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [navStats, setNavStats] = useState({ invoiceCount: 0, totalBilled: 0 });

  useEffect(() => {
    loadNavStats();
  }, [invoiceListKey]);

  const loadNavStats = async () => {
    try {
      const invoices = await api.getInvoices();
      let totalBilled = 0;
      let count = 0;
      invoices.forEach(inv => {
        if (inv.paymentStatus !== 'voided') {
          count++;
          totalBilled += parseFloat(inv.total) || 0;
        }
      });
      setNavStats({ invoiceCount: count, totalBilled: Math.round(totalBilled * 100) / 100 });
    } catch (err) {
      console.error('Failed to load nav stats', err);
    }
  };

  const handleEditInvoice = async (invoiceId) => {
    try {
      const invoice = await api.getInvoice(invoiceId);
      setEditingInvoice(invoice);
      setCurrentView('invoices');
    } catch (err) {
      console.error('Failed to load invoice for editing', err);
    }
  };

  const handleViewInvoice = (invoiceId) => {
    setViewingInvoiceId(invoiceId);
    setCurrentView('print');
  };

  const handleInvoiceSaved = (invoiceId) => {
    const wasEditing = editingInvoice && editingInvoice.id;
    setEditingInvoice(null);
    setInvoiceListKey((k) => k + 1);

    // Auto-open print view for newly created invoices (not edits or duplicates)
    if (invoiceId && !wasEditing) {
      setViewingInvoiceId(invoiceId);
      setCurrentView('print');
    }
  };

  const handleCancelEdit = () => {
    setEditingInvoice(null);
  };

  const handleBackFromPrint = () => {
    setViewingInvoiceId(null);
    setCurrentView('invoices');
  };

  const handleDuplicateInvoice = async (invoiceId) => {
    try {
      const invoice = await api.getInvoice(invoiceId);
      // Create a duplicate with new date and reset payment status
      const duplicateInvoice = {
        ...invoice,
        id: null, // Clear ID so it creates a new invoice
        invoiceNumber: null, // Will get a new number
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: null, // Will be recalculated
        paymentStatus: 'unpaid',
        amountPaid: 0,
        paymentDate: null,
        notes: '', // Clear notes - they're usually specific to original invoice
      };
      setEditingInvoice(duplicateInvoice);
      setCurrentView('invoices');
    } catch (err) {
      console.error('Failed to duplicate invoice', err);
    }
  };

  const renderContent = () => {
    if (currentView === 'print' && viewingInvoiceId) {
      return <InvoicePrint invoiceId={viewingInvoiceId} onBack={handleBackFromPrint} />;
    }

    return (
      <>
        {/* Invoice view - always mounted to preserve form state */}
        <div style={{ display: currentView === 'invoices' ? 'block' : 'none' }}>
          <InvoiceForm
            editingInvoice={editingInvoice}
            onSave={handleInvoiceSaved}
            onCancel={editingInvoice ? handleCancelEdit : null}
          />
          <InvoiceList onEdit={handleEditInvoice} onView={handleViewInvoice} onDuplicate={handleDuplicateInvoice} refreshKey={invoiceListKey} />
        </div>

        {/* Other views - conditionally rendered */}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'clients' && <ClientManager />}
        {currentView === 'items' && <ItemManager />}
        {currentView === 'inventory' && <InventoryManager />}
        {currentView === 'settings' && <Settings />}
        {currentView === 'export' && <ExportData />}
      </>
    );
  };

  return (
    <div className="app">
      {/* Update notification banner */}
      <UpdateNotification />

      <nav className="nav no-print">
        <h1>Invoice Creator</h1>
        <button
          className={currentView === 'dashboard' ? 'active' : ''}
          onClick={() => setCurrentView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={currentView === 'invoices' ? 'active' : ''}
          onClick={() => {
            setCurrentView('invoices');
            setEditingInvoice(null);
            setViewingInvoiceId(null);
          }}
        >
          Invoices
        </button>
        <button
          className={currentView === 'clients' ? 'active' : ''}
          onClick={() => setCurrentView('clients')}
        >
          Clients
        </button>
        <button
          className={currentView === 'items' ? 'active' : ''}
          onClick={() => setCurrentView('items')}
        >
          Items
        </button>
        <button
          className={currentView === 'inventory' ? 'active' : ''}
          onClick={() => setCurrentView('inventory')}
        >
          Inventory
        </button>
        <button
          className={currentView === 'settings' ? 'active' : ''}
          onClick={() => setCurrentView('settings')}
        >
          Settings
        </button>
        <button
          className={currentView === 'export' ? 'active' : ''}
          onClick={() => setCurrentView('export')}
        >
          Export
        </button>
        <div className="nav-stats">
          <span className="nav-stat">{navStats.invoiceCount} invoices</span>
          <span className="nav-stat-divider">|</span>
          <span className="nav-stat">${navStats.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })} billed</span>
        </div>
        <button
          className="support-dev-btn"
          onClick={() => setShowSupportForm(true)}
          title="Request Features & Support Development"
        >
          Support Dev
        </button>
      </nav>

      <main className="main-content">{renderContent()}</main>

      {/* Copyright footer */}
      <footer className="app-footer no-print">
        <span>&copy; 2025 Blue Line Scannables. All rights reserved.</span>
        <button className="footer-link" onClick={() => setShowAbout(true)}>About</button>
      </footer>

      {/* Support form modal */}
      {showSupportForm && <SupportForm onClose={() => setShowSupportForm(false)} />}

      {/* About dialog */}
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
    </div>
  );
}

export default App;
