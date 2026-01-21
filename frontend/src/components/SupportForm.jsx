import { useState, useEffect } from 'react';
import { api } from '../api';

export default function SupportForm({ onClose }) {
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [stats, setStats] = useState({ invoices: 0, collected: 0, clients: 0 });
  const [formData, setFormData] = useState({
    type: 'question',
    subject: '',
    message: '',
    email: ''
  });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [invoices, clients] = await Promise.all([
        api.getInvoices(),
        api.getClients()
      ]);

      // Calculate total collected (excluding voided)
      let totalCollected = 0;
      let invoiceCount = 0;
      invoices.forEach(inv => {
        if (inv.paymentStatus !== 'voided') {
          invoiceCount++;
          totalCollected += parseFloat(inv.amountPaid) || 0;
        }
      });

      setStats({
        invoices: invoiceCount,
        collected: Math.round(totalCollected * 100) / 100,
        clients: clients.length
      });
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[Invoice Creator] ${formData.subject}`);
    const body = encodeURIComponent(`Type: ${formData.type}\n\n${formData.message}\n\nReply-to: ${formData.email}`);
    window.location.href = `mailto:bluelinescannables@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
  };

  const handleDonateClick = (platform) => {
    const urls = {
      venmo: 'https://venmo.com/u/Micheal-Bauman',
      paypal: 'https://www.paypal.com/ncp/payment/7B9QBKBAUC99G'
    };
    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  if (sent) {
    return (
      <div className="support-modal">
        <div className="support-card">
          <div className="support-success">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h2>Email Client Opened!</h2>
            <p>Please send the email from your email client to complete your submission.</p>
            <button onClick={onClose} className="btn btn-primary">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="support-modal">
      <div className="support-card">
        <div className="support-header">
          <h2>Help & Support</h2>
          <button onClick={onClose} className="support-close">&times;</button>
        </div>

        {/* Stats + Donate Section */}
        <div className="support-main">
          {/* Usage Stats */}
          <div className="support-stats">
            <div className="stat-item">
              <div className="stat-value">{stats.invoices}</div>
              <div className="stat-label">Invoices Created</div>
            </div>
            <div className="stat-item stat-highlight">
              <div className="stat-value">${stats.collected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div className="stat-label">Collected</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.clients}</div>
              <div className="stat-label">Clients</div>
            </div>
          </div>

          {/* Donate Section */}
          <div className="support-donate">
            <div className="support-donate-content">
              <div className="support-donate-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#e74c3c" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className="support-donate-text">
                <h3>Help Fund New Features</h3>
                <p>Your support keeps Invoice Creator growing and helps build the features you need.</p>
              </div>
            </div>
            <div className="donate-buttons">
              <button className="btn-venmo" onClick={() => handleDonateClick('venmo')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.5 3c.9 1.5 1.3 3 1.3 5 0 5.5-4.7 12.7-8.5 17.7H4.8L2 3.6l6.4-.6 1.5 12c1.4-2.3 3.2-6 3.2-8.5 0-1.9-.3-3.2-.9-4.2L19.5 3z"/>
                </svg>
                Venmo
              </button>
              <button className="btn-paypal" onClick={() => handleDonateClick('paypal')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.23A.859.859 0 0 1 5.79 1.5h6.916c2.297 0 4.09.605 5.33 1.8.906.872 1.482 2.088 1.482 3.549 0 .14-.012.28-.025.418a6.088 6.088 0 0 1-.318 1.34c-.63 2.012-2.166 3.396-4.318 3.896-.485.113-1.006.17-1.555.17H10.66a.859.859 0 0 0-.847.73l-.99 6.293a.641.641 0 0 1-.633.54h-.003l-1.11.001zm12.474-13.4c-.07.45-.17.892-.31 1.32-.63 2.012-2.166 3.396-4.318 3.896-.485.113-1.006.17-1.555.17H10.66a.859.859 0 0 0-.847.73l-1.272 8.074h3.91a.641.641 0 0 0 .633-.54l.804-5.098a.859.859 0 0 1 .847-.73h1.736c3.104 0 5.479-1.256 6.176-4.886.165-.858.23-1.638.165-2.333a3.915 3.915 0 0 0-.262-.603z"/>
                </svg>
                PayPal
              </button>
            </div>
          </div>
        </div>

        {/* Help Section - Collapsible */}
        <div className="support-help-section">
          {!showHelpForm ? (
            <button className="help-toggle" onClick={() => setShowHelpForm(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Need help? Have a feature idea? Contact us
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          ) : (
            <div className="help-form-container">
              <button className="help-toggle open" onClick={() => setShowHelpForm(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Contact Support
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
              <form onSubmit={handleSubmit} className="support-form">
                <div className="form-group">
                  <label htmlFor="type">What can we help with?</label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="form-control"
                  >
                    <option value="question">General Question</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Brief description"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Please describe your question or issue..."
                    className="form-control"
                    rows={4}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Your Email (for follow-up)</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="form-control"
                  />
                </div>

                <div className="support-actions">
                  <button type="submit" className="btn btn-primary">
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .support-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
        }

        .support-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 480px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .support-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #eee;
        }

        .support-header h2 {
          margin: 0;
          color: #2c3e50;
          font-size: 1.25rem;
        }

        .support-close {
          background: none;
          border: none;
          font-size: 1.75rem;
          color: #999;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .support-close:hover {
          color: #333;
        }

        /* Main Section */
        .support-main {
          padding: 1.5rem;
        }

        /* Stats */
        .support-stats {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .stat-item {
          flex: 1;
          text-align: center;
          padding: 1rem 0.5rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .stat-item.stat-highlight {
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 0.25rem;
        }

        .stat-highlight .stat-value {
          color: #1b5e20;
          font-size: 1.1rem;
        }

        .stat-label {
          font-size: 0.7rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-highlight .stat-label {
          color: #2e7d32;
        }

        /* Donate Section */
        .support-donate {
          background: linear-gradient(135deg, #fef9f9 0%, #fff5f5 100%);
          border: 1px solid #fce4e4;
          border-radius: 10px;
          padding: 1.25rem;
        }

        .support-donate-content {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .support-donate-icon {
          flex-shrink: 0;
          padding-top: 0.125rem;
        }

        .support-donate-text h3 {
          margin: 0 0 0.375rem;
          font-size: 1.1rem;
          color: #2c3e50;
        }

        .support-donate-text p {
          margin: 0;
          font-size: 0.9rem;
          color: #666;
          line-height: 1.5;
        }

        .donate-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .btn-venmo {
          flex: 1;
          background: #008CFF;
          color: white;
          padding: 0.625rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.95rem;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .btn-venmo:hover {
          background: #0077D9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 140, 255, 0.25);
        }

        .btn-paypal {
          flex: 1;
          background: #003087;
          color: white;
          padding: 0.625rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.95rem;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .btn-paypal:hover {
          background: #002570;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 48, 135, 0.25);
        }

        /* Help Section */
        .support-help-section {
          border-top: 1px solid #eee;
        }

        .help-toggle {
          width: 100%;
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #666;
          transition: all 0.2s;
        }

        .help-toggle:hover {
          background: #f8f9fa;
          color: #333;
        }

        .help-toggle.open {
          background: #f8f9fa;
          color: #333;
          border-bottom: 1px solid #eee;
        }

        .help-toggle .chevron {
          margin-left: auto;
        }

        .help-form-container {
          background: #fafafa;
        }

        /* Form Styles */
        .support-form {
          padding: 1.25rem 1.5rem;
        }

        .support-form .form-group {
          margin-bottom: 0.875rem;
        }

        .support-form label {
          display: block;
          margin-bottom: 0.375rem;
          font-weight: 500;
          font-size: 0.875rem;
          color: #2c3e50;
        }

        .support-form .form-control {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.95rem;
          background: white;
        }

        .support-form .form-control:focus {
          border-color: #3498db;
          outline: none;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .support-form textarea {
          resize: vertical;
          min-height: 80px;
        }

        .support-actions {
          margin-top: 1rem;
        }

        .support-actions .btn {
          width: 100%;
        }

        /* Success State */
        .support-success {
          padding: 3rem 2rem;
          text-align: center;
        }

        .support-success svg {
          margin-bottom: 1rem;
        }

        .support-success h2 {
          color: #27ae60;
          margin: 0 0 0.5rem;
        }

        .support-success p {
          color: #666;
          margin-bottom: 1.5rem;
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .support-stats {
            gap: 0.5rem;
          }

          .stat-item {
            padding: 0.75rem 0.25rem;
          }

          .stat-value {
            font-size: 1.1rem;
          }

          .stat-highlight .stat-value {
            font-size: 1rem;
          }

          .stat-label {
            font-size: 0.65rem;
          }

          .support-donate-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .donate-buttons {
            flex-direction: column;
          }

          .btn-venmo,
          .btn-paypal {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
