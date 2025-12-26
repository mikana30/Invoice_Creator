import { useState } from 'react';

export default function SupportForm({ onClose }) {
  const [formData, setFormData] = useState({
    type: 'question',
    subject: '',
    message: '',
    email: ''
  });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (window.electronAPI) {
      // Use Electron's mailto handler
      await window.electronAPI.sendFeedback(formData);
      setSent(true);
    } else {
      // Fallback for web - open mailto directly
      const subject = encodeURIComponent(`[Invoice Creator] ${formData.subject}`);
      const body = encodeURIComponent(`Type: ${formData.type}\n\n${formData.message}\n\nReply-to: ${formData.email}`);
      window.open(`mailto:bluelinescannables@gmail.com?subject=${subject}&body=${body}`);
      setSent(true);
    }
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
          <h2>Contact Support</h2>
          <button onClick={onClose} className="support-close">&times;</button>
        </div>

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
              placeholder="Brief description of your issue"
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
              placeholder="Please describe your question or issue in detail..."
              className="form-control"
              rows={5}
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
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Open Email
            </button>
          </div>
        </form>
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
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .support-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #eee;
        }

        .support-header h2 {
          margin: 0;
          color: #2c3e50;
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

        .support-form {
          padding: 1.5rem;
        }

        .support-form .form-group {
          margin-bottom: 1rem;
        }

        .support-form label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #2c3e50;
        }

        .support-form .form-control {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }

        .support-form .form-control:focus {
          border-color: #3498db;
          outline: none;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .support-form textarea {
          resize: vertical;
          min-height: 100px;
        }

        .support-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

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
      `}</style>
    </div>
  );
}
