import { useState, useEffect } from 'react';

export default function UpdateNotification() {
  const [update, setUpdate] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen for update notifications from main process
    window.electronAPI.onUpdateAvailable((data) => {
      setUpdate(data);
    });

    // Also check manually on mount
    window.electronAPI.checkForUpdates().then((result) => {
      if (result.available) {
        setUpdate(result);
      }
    });
  }, []);

  const handleDownload = () => {
    if (update?.downloadUrl && window.electronAPI) {
      window.electronAPI.openExternal(update.downloadUrl);
    }
  };

  const handleRemindLater = () => {
    setDismissed(true);
    // Will show again in 24 hours (handled by main process)
  };

  const handleSkipVersion = () => {
    setDismissed(true);
    // Won't show again for this version
  };

  if (!update || dismissed) {
    return null;
  }

  return (
    <div className="update-notification">
      <div className="update-content">
        <div className="update-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="update-text">
          <strong>Update Available!</strong>
          <span>Version {update.latestVersion} is ready to download.</span>
        </div>
        <div className="update-actions">
          <button onClick={handleDownload} className="btn btn-primary btn-sm">
            Download
          </button>
          <button onClick={handleRemindLater} className="btn btn-secondary btn-sm">
            Later
          </button>
          <button onClick={handleSkipVersion} className="update-dismiss" title="Skip this version">
            &times;
          </button>
        </div>
      </div>

      <style>{`
        .update-notification {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.75rem 1rem;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .update-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .update-icon {
          flex-shrink: 0;
        }

        .update-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .update-text strong {
          font-size: 1rem;
        }

        .update-text span {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .update-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .update-actions .btn-sm {
          padding: 0.4rem 1rem;
          font-size: 0.875rem;
        }

        .update-dismiss {
          background: transparent;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .update-dismiss:hover {
          opacity: 1;
        }

        @media (max-width: 600px) {
          .update-content {
            flex-wrap: wrap;
          }

          .update-text {
            flex: 100%;
            order: 1;
          }

          .update-icon {
            order: 0;
          }

          .update-actions {
            order: 2;
            margin-left: auto;
          }
        }
      `}</style>
    </div>
  );
}
