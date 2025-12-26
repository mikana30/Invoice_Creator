import { useState } from 'react';

export default function LicenseActivation({ onActivated }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!window.electronAPI) {
        setError('This feature is only available in the desktop app.');
        setLoading(false);
        return;
      }

      const result = await window.electronAPI.activateLicense(licenseKey.trim());

      if (result.valid) {
        if (onActivated) {
          onActivated(result);
        }
      } else {
        setError(result.message || 'Invalid license key. Please check and try again.');
      }
    } catch (err) {
      setError('Failed to activate license. Please try again.');
      console.error('Activation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatLicenseKey = (value) => {
    // Remove any existing formatting
    let clean = value.toUpperCase().replace(/[^A-Z0-9.]/g, '');

    // Don't format if it contains the signature part (after the dot)
    if (clean.includes('.')) {
      const [keyPart, sig] = clean.split('.');
      // Format just the key part
      const formatted = keyPart.match(/.{1,5}/g)?.join('-') || keyPart;
      return `${formatted}.${sig}`;
    }

    // Format in groups of 5
    const formatted = clean.match(/.{1,5}/g)?.join('-') || clean;
    return formatted;
  };

  const handleKeyChange = (e) => {
    const formatted = formatLicenseKey(e.target.value);
    setLicenseKey(formatted);
  };

  return (
    <div className="license-activation">
      <div className="license-card">
        <div className="license-header">
          <h1>Invoice Creator</h1>
          <p>Professional Invoice Management</p>
        </div>

        <form onSubmit={handleSubmit} className="license-form">
          <h2>Activate Your License</h2>
          <p className="license-instructions">
            Enter the license key you received with your purchase to activate the application.
          </p>

          <div className="form-group">
            <label htmlFor="licenseKey">License Key</label>
            <input
              type="text"
              id="licenseKey"
              value={licenseKey}
              onChange={handleKeyChange}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX.signature"
              className="license-input"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="license-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary license-btn"
            disabled={loading || !licenseKey.trim()}
          >
            {loading ? 'Activating...' : 'Activate License'}
          </button>
        </form>

        <div className="license-footer">
          <p>
            Need a license? <a href="https://www.etsy.com/shop/BlueLineScannables" target="_blank" rel="noopener noreferrer">Purchase on Etsy</a>
          </p>
          <p>
            Having trouble? <a href="mailto:bluelinescannables@gmail.com">Contact Support</a>
          </p>
        </div>
      </div>

      <style>{`
        .license-activation {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }

        .license-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 480px;
          width: 100%;
          overflow: hidden;
        }

        .license-header {
          background: #2c3e50;
          color: white;
          padding: 2rem;
          text-align: center;
        }

        .license-header h1 {
          margin: 0 0 0.5rem;
          font-size: 1.75rem;
        }

        .license-header p {
          margin: 0;
          opacity: 0.8;
        }

        .license-form {
          padding: 2rem;
        }

        .license-form h2 {
          margin: 0 0 0.5rem;
          color: #2c3e50;
        }

        .license-instructions {
          color: #666;
          margin-bottom: 1.5rem;
        }

        .license-input {
          width: 100%;
          padding: 1rem;
          font-size: 1rem;
          font-family: monospace;
          border: 2px solid #ddd;
          border-radius: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .license-input:focus {
          border-color: #667eea;
          outline: none;
        }

        .license-error {
          background: #fee;
          color: #c00;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .license-btn {
          width: 100%;
          padding: 1rem;
          font-size: 1.1rem;
          margin-top: 1.5rem;
        }

        .license-footer {
          background: #f8f9fa;
          padding: 1.5rem 2rem;
          text-align: center;
          border-top: 1px solid #eee;
        }

        .license-footer p {
          margin: 0.5rem 0;
          color: #666;
        }

        .license-footer a {
          color: #667eea;
          text-decoration: none;
        }

        .license-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
