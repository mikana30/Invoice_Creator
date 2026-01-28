import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';

// Check if backup reminder should show (every 7 days)
function shouldShowBackupReminder() {
  const lastBackup = localStorage.getItem('lastBackupDate');
  if (!lastBackup) return true;
  const daysSince = (Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24);
  return daysSince > 7;
}

// Get auto-backup setting from localStorage
function getAutoBackupSetting() {
  return localStorage.getItem('autoBackupOnClose') === 'true';
}

export default function Settings() {
  const [form, setForm] = useState({
    businessName: '',
    businessStreet: '',
    businessStreet2: '',
    businessCity: '',
    businessState: '',
    businessZip: '',
    businessPhone: '',
    businessEmail: '',
    taxRate: 0.08,
    bannerImage: '',
    invoiceNumberPrefix: 'INV',
    invoiceNumberNextSequence: 1,
    defaultPaymentTerms: 30,
    sellingFeePercent: 0,
    sellingFeeFixed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showBackupReminder, setShowBackupReminder] = useState(shouldShowBackupReminder());
  const [isRestoring, setIsRestoring] = useState(false);
  const [autoBackupOnClose, setAutoBackupOnClose] = useState(getAutoBackupSetting());
  const fileInputRef = useRef(null);
  const restoreInputRef = useRef(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setForm({
        businessName: data.businessName || '',
        businessStreet: data.businessStreet || '',
        businessStreet2: data.businessStreet2 || '',
        businessCity: data.businessCity || '',
        businessState: data.businessState || '',
        businessZip: data.businessZip || '',
        businessPhone: data.businessPhone || '',
        businessEmail: data.businessEmail || '',
        taxRate: data.taxRate || 0.08,
        bannerImage: data.bannerImage || '',
        invoiceNumberPrefix: data.invoiceNumberPrefix || 'INV',
        invoiceNumberNextSequence: data.invoiceNumberNextSequence || 1,
        defaultPaymentTerms: data.defaultPaymentTerms ?? 30,
        sellingFeePercent: data.sellingFeePercent || 0,
        sellingFeeFixed: data.sellingFeeFixed || 0,
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image must be less than 2MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, bannerImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBanner = () => {
    setForm({ ...form, bannerImage: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        ...form,
        taxRate: parseFloat(form.taxRate),
        invoiceNumberNextSequence: parseInt(form.invoiceNumberNextSequence),
        defaultPaymentTerms: parseInt(form.defaultPaymentTerms),
        sellingFeePercent: parseFloat(form.sellingFeePercent) || 0,
        sellingFeeFixed: parseFloat(form.sellingFeeFixed) || 0,
      });
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    }
  };

  const handleResetSequence = () => {
    if (confirm('Reset invoice number sequence to 1? This cannot be undone.')) {
      setForm({ ...form, invoiceNumberNextSequence: 1 });
    }
  };

  // Create backup data object (used by both manual backup and auto-backup)
  const createBackupData = async () => {
    const [clients, items, invoices, settings] = await Promise.all([
      api.getClients(),
      api.getItems(),
      api.getInvoices(),
      api.getSettings(),
    ]);

    // For each invoice, get the full details with items
    const fullInvoices = await Promise.all(
      invoices.map(inv => api.getInvoice(inv.id))
    );

    // Get item components for each item
    const itemsWithComponents = await Promise.all(
      items.map(async (item) => {
        try {
          const components = await api.getItemComponents(item.id);
          return { ...item, components };
        } catch {
          return { ...item, components: [] };
        }
      })
    );

    return {
      exportDate: new Date().toISOString(),
      version: '2.0',
      settings,
      clients,
      items: itemsWithComponents,
      invoices: fullInvoices,
    };
  };

  const handleBackupData = async () => {
    try {
      setMessage({ type: 'success', text: 'Preparing backup...' });
      const backup = await createBackupData();

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Record backup date
      localStorage.setItem('lastBackupDate', Date.now().toString());
      setShowBackupReminder(false);
      setMessage({ type: 'success', text: 'Backup downloaded successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create backup: ' + err.message });
    }
  };

  const handleRestoreData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('WARNING: This will replace ALL your current data with the backup. This cannot be undone. Are you sure?')) {
      if (restoreInputRef.current) restoreInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    setMessage({ type: 'success', text: 'Restoring backup... Please wait.' });

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.exportDate) {
        throw new Error('Invalid backup file format');
      }

      // Full data restore - clients, items, inventory, invoices, and settings
      await api.restoreData(backup);
      await loadSettings();

      setMessage({
        type: 'success',
        text: `Full data restored from backup dated ${new Date(backup.exportDate).toLocaleDateString()}. All clients, items, invoices, and settings have been restored.`
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to restore backup: ' + err.message });
    } finally {
      setIsRestoring(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  const dismissBackupReminder = () => {
    setShowBackupReminder(false);
  };

  // Handle auto-backup toggle
  const handleAutoBackupToggle = async (enabled) => {
    setAutoBackupOnClose(enabled);
    localStorage.setItem('autoBackupOnClose', enabled.toString());

    if (enabled) {
      // Immediately create and store a backup in localStorage when enabled
      try {
        setMessage({ type: 'success', text: 'Creating auto-backup...' });
        const backup = await createBackupData();
        localStorage.setItem('autoBackupData', JSON.stringify(backup));
        localStorage.setItem('autoBackupDate', new Date().toISOString());
        setMessage({ type: 'success', text: 'Auto-backup enabled. Backup saved to browser storage.' });
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to create auto-backup: ' + err.message });
      }
    } else {
      localStorage.removeItem('autoBackupData');
      localStorage.removeItem('autoBackupDate');
      setMessage({ type: 'success', text: 'Auto-backup disabled.' });
    }
  };

  // Periodically save backup data when auto-backup is enabled
  useEffect(() => {
    if (!autoBackupOnClose) return;

    const saveBackup = async () => {
      try {
        const backup = await createBackupData();
        localStorage.setItem('autoBackupData', JSON.stringify(backup));
        localStorage.setItem('autoBackupDate', new Date().toISOString());
      } catch (err) {
        console.warn('Auto-backup failed:', err);
      }
    };

    // Save backup every 5 minutes when auto-backup is enabled
    const interval = setInterval(saveBackup, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoBackupOnClose]);

  // Handle downloading the auto-backup from localStorage
  const handleDownloadAutoBackup = () => {
    const backupData = localStorage.getItem('autoBackupData');
    const backupDate = localStorage.getItem('autoBackupDate');

    if (!backupData) {
      setMessage({ type: 'error', text: 'No auto-backup found. Enable auto-backup to create one.' });
      return;
    }

    try {
      const backup = JSON.parse(backupData);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-autobackup-${backupDate?.split('T')[0] || 'unknown'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      localStorage.setItem('lastBackupDate', Date.now().toString());
      setShowBackupReminder(false);
      setMessage({ type: 'success', text: 'Auto-backup downloaded!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to download auto-backup: ' + err.message });
    }
  };

  if (loading) return <div className="loading">Loading settings...</div>;

  return (
    <div className="card">
      <h2>Business Settings</h2>

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

      <form onSubmit={handleSubmit}>
        <h3>Invoice Banner</h3>
        <div className="form-group">
          <label>Banner Image (appears at top of invoices)</label>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0.5rem' }}>
            Recommended: 850 x 150 pixels (or similar wide/short ratio). Max 2MB. PNG or JPG.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            ref={fileInputRef}
            style={{ marginBottom: '0.5rem' }}
          />
          {form.bannerImage && (
            <div style={{ marginTop: '0.5rem' }}>
              <img
                src={form.bannerImage}
                alt="Banner preview"
                style={{ maxWidth: '100%', maxHeight: '150px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <br />
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleRemoveBanner}
                style={{ marginTop: '0.5rem' }}
              >
                Remove Banner
              </button>
            </div>
          )}
        </div>

        <h3>Business Information</h3>
        <div className="form-group">
          <label>Business Name</label>
          <input
            type="text"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            placeholder="Your Business Name"
          />
        </div>

        <div className="form-group">
          <label>Street Address</label>
          <input
            type="text"
            value={form.businessStreet}
            onChange={(e) => setForm({ ...form, businessStreet: e.target.value })}
            placeholder="123 Main Street"
          />
        </div>

        <div className="form-group">
          <label>Street Address 2 (optional)</label>
          <input
            type="text"
            value={form.businessStreet2}
            onChange={(e) => setForm({ ...form, businessStreet2: e.target.value })}
            placeholder="Suite 100"
          />
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>City</label>
            <input
              type="text"
              value={form.businessCity}
              onChange={(e) => setForm({ ...form, businessCity: e.target.value })}
              placeholder="City"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>State</label>
            <input
              type="text"
              value={form.businessState}
              onChange={(e) => setForm({ ...form, businessState: e.target.value })}
              placeholder="State"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>ZIP</label>
            <input
              type="text"
              value={form.businessZip}
              onChange={(e) => setForm({ ...form, businessZip: e.target.value })}
              placeholder="ZIP"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Phone</label>
            <input
              type="text"
              value={form.businessPhone}
              onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.businessEmail}
              onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
              placeholder="email@business.com"
            />
          </div>
        </div>

        <h3>Tax Settings</h3>
        <div className="form-group" style={{ maxWidth: '200px' }}>
          <label>Tax Rate (%)</label>
          <input
            type="number"
            step="0.001"
            min="0"
            max="100"
            value={form.taxRate * 100}
            onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) / 100 || 0 })}
          />
          <small style={{ color: '#888' }}>e.g., 8.25 for 8.25%</small>
        </div>

        <h3>Invoice Numbering</h3>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Invoice Prefix</label>
            <input
              type="text"
              value={form.invoiceNumberPrefix}
              onChange={(e) => setForm({ ...form, invoiceNumberPrefix: e.target.value })}
              placeholder="INV"
            />
            <small style={{ color: '#888' }}>e.g., INV, BILL, ORD</small>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Next Sequence Number</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                min="1"
                value={form.invoiceNumberNextSequence}
                onChange={(e) => setForm({ ...form, invoiceNumberNextSequence: parseInt(e.target.value) || 1 })}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-sm btn-secondary" onClick={handleResetSequence}>
                Reset to 1
              </button>
            </div>
          </div>
        </div>
        <div className="form-group">
          <small style={{ color: '#888' }}>
            Next invoice will be: <strong>{form.invoiceNumberPrefix}-{new Date().getFullYear()}-{String(form.invoiceNumberNextSequence).padStart(3, '0')}</strong>
          </small>
        </div>

        <h3>Payment Terms</h3>
        <div className="form-group" style={{ maxWidth: '250px' }}>
          <label>Default Payment Terms</label>
          <select
            value={form.defaultPaymentTerms}
            onChange={(e) => setForm({ ...form, defaultPaymentTerms: parseInt(e.target.value) })}
          >
            <option value="0">Due on Receipt</option>
            <option value="15">Net 15</option>
            <option value="30">Net 30</option>
            <option value="60">Net 60</option>
          </select>
          <small style={{ color: '#888' }}>Due date will be calculated from invoice date</small>
        </div>

        <h3>Selling Fees</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Track platform fees (e.g., payment processor, marketplace) for profit calculations.
        </p>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Percentage Fee (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.sellingFeePercent}
              onChange={(e) => setForm({ ...form, sellingFeePercent: parseFloat(e.target.value) || 0 })}
            />
            <small style={{ color: '#888' }}>e.g., 2.9 for credit card processing</small>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Fixed Fee ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.sellingFeeFixed}
              onChange={(e) => setForm({ ...form, sellingFeeFixed: parseFloat(e.target.value) || 0 })}
            />
            <small style={{ color: '#888' }}>e.g., 0.30 per transaction</small>
          </div>
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-primary">
            Save Settings
          </button>
        </div>
      </form>

      <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid var(--border-color, #eee)' }}>
        <h3>Data Backup & Restore</h3>

        {showBackupReminder && (
          <div style={{ background: 'rgba(255, 193, 7, 0.1)', border: '1px solid #ffc107', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
            <strong>Backup Reminder:</strong> It's been a while since your last backup. Consider downloading a backup to protect your data.
            <button
              onClick={dismissBackupReminder}
              style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'inherit' }}
            >
              ×
            </button>
          </div>
        )}

        <p style={{ color: 'var(--text-muted, #666)', marginBottom: '1rem' }}>
          Download a complete backup of your data including clients, items, invoices, and settings.
          Store this file in a safe place to protect against data loss.
        </p>

        {/* Auto-backup toggle */}
        <div style={{
          background: 'var(--bg-tertiary, #f5f5f5)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid var(--border-color, #ddd)'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoBackupOnClose}
              onChange={(e) => handleAutoBackupToggle(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <div>
              <strong>Auto-Backup</strong>
              <small style={{ display: 'block', color: 'var(--text-muted, #888)' }}>
                Automatically saves backup to browser storage every 5 minutes
              </small>
            </div>
          </label>
          {autoBackupOnClose && localStorage.getItem('autoBackupDate') && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color, #ddd)' }}>
              <small style={{ color: 'var(--text-muted, #888)' }}>
                Last auto-backup: {new Date(localStorage.getItem('autoBackupDate')).toLocaleString()}
              </small>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleDownloadAutoBackup}
                style={{ marginLeft: '1rem' }}
              >
                Download Auto-Backup
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-success" onClick={handleBackupData}>
            Download Backup
          </button>

          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreData}
              ref={restoreInputRef}
              style={{ display: 'none' }}
              id="restore-file"
            />
            <label
              htmlFor="restore-file"
              className="btn btn-secondary"
              style={{ cursor: isRestoring ? 'wait' : 'pointer' }}
            >
              {isRestoring ? 'Restoring...' : 'Restore All Data from Backup'}
            </label>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted, #888)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Tip: Create regular backups, especially before major updates. Restore will replace ALL data (clients, items, invoices, settings).
        </p>
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #eee' }}>
        <h3>Uninstall</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          To remove Invoice Creator from your computer, use Windows Settings.
        </p>
        <button
          className="btn btn-danger"
          onClick={() => window.open('ms-settings:appsfeatures', '_blank')}
        >
          Open Windows Apps Settings
        </button>
        <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Search for "Invoice Creator" in the list and click Uninstall.
        </p>
      </div>
    </div>
  );
}
