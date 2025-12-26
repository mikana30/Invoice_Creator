import { useState } from 'react';
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
import { api } from './api';

function App() {
  const [currentView, setCurrentView] = useState('invoices');
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState(null);
  const [invoiceListKey, setInvoiceListKey] = useState(0);
  const [showSupportForm, setShowSupportForm] = useState(false);

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

  const handleInvoiceSaved = () => {
    setEditingInvoice(null);
    setInvoiceListKey((k) => k + 1);
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

    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <ClientManager />;
      case 'items':
        return <ItemManager />;
      case 'inventory':
        return <InventoryManager />;
      case 'settings':
        return <Settings />;
      case 'export':
        return <ExportData />;
      case 'invoices':
      default:
        return (
          <>
            <InvoiceForm
              editingInvoice={editingInvoice}
              onSave={handleInvoiceSaved}
              onCancel={editingInvoice ? handleCancelEdit : null}
            />
            <InvoiceList onEdit={handleEditInvoice} onView={handleViewInvoice} onDuplicate={handleDuplicateInvoice} refreshKey={invoiceListKey} />
          </>
        );
    }
  };

  return (
    <div className="app">
      {/* Update notification banner */}
      {window.electronAPI && <UpdateNotification />}

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
        <button
          className="help-btn"
          onClick={() => setShowSupportForm(true)}
          title="Get Help"
        >
          Help
        </button>
      </nav>

      <main className="main-content">{renderContent()}</main>

      {/* Support form modal */}
      {showSupportForm && <SupportForm onClose={() => setShowSupportForm(false)} />}
    </div>
  );
}

export default App;
