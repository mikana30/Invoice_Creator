import { useState, useEffect } from 'react';

// Current version - keep in sync with package.json
const CURRENT_VERSION = '1.3.3';
const GITHUB_REPO = 'mikana30/Invoice_Creator';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Compare semantic versions: returns 1 if a > b, -1 if a < b, 0 if equal
function compareVersions(a, b) {
  const partsA = a.replace(/^v/, '').split('.').map(Number);
  const partsB = b.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

export default function UpdateNotification() {
  const [update, setUpdate] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      // Check if we should skip this check (remind later)
      const remindAfter = localStorage.getItem('updateRemindAfter');
      if (remindAfter && Date.now() < parseInt(remindAfter, 10)) {
        return;
      }

      // Check if this version was skipped
      const skippedVersions = JSON.parse(localStorage.getItem('skippedVersions') || '[]');

      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!response.ok) return;

      const release = await response.json();
      const latestVersion = release.tag_name.replace(/^v/, '');

      // Check if update is available and not skipped
      if (compareVersions(latestVersion, CURRENT_VERSION) > 0 && !skippedVersions.includes(latestVersion)) {
        setUpdate({
          latestVersion,
          downloadUrl: release.html_url,
          releaseNotes: release.body
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  const handleDownload = () => {
    if (update?.downloadUrl) {
      window.open(update.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRemindLater = () => {
    // Remind in 24 hours
    localStorage.setItem('updateRemindAfter', String(Date.now() + CHECK_INTERVAL));
    setDismissed(true);
  };

  const handleSkipVersion = () => {
    if (update?.latestVersion) {
      const skippedVersions = JSON.parse(localStorage.getItem('skippedVersions') || '[]');
      if (!skippedVersions.includes(update.latestVersion)) {
        skippedVersions.push(update.latestVersion);
        localStorage.setItem('skippedVersions', JSON.stringify(skippedVersions));
      }
    }
    setDismissed(true);
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
