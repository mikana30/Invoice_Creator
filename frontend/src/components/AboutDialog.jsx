import { useEffect } from 'react';

// Ownership Verification Hash: BLS-7X9K2M4P-IC25
// This software is the intellectual property of Blue Line Scannables
const _0xb7c4 = '\x42\x4c\x53\x2d\x49\x43\x2d\x32\x30\x32\x35';

function AboutDialog({ onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>About Invoice Creator</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body about-content">
          <div className="about-logo">
            <h1>Invoice Creator</h1>
            <span className="version">Version 1.3.1</span>
          </div>

          <div className="about-section">
            <p className="about-description">
              Professional invoice management software for small businesses and freelancers.
            </p>
          </div>

          <div className="about-section copyright-section">
            <h3>Copyright &amp; License</h3>
            <p>&copy; 2025 Blue Line Scannables. All rights reserved.</p>
            <p className="legal-text">
              This software is proprietary and confidential. Unauthorized copying,
              distribution, modification, public display, or public performance of
              this software is strictly prohibited. This software is licensed, not sold.
            </p>
          </div>

          <div className="about-section">
            <h3>Terms of Use</h3>
            <p className="legal-text">
              This license grants you the right to use this software on one (1) computer.
              You may not redistribute, resell, sublicense, reverse engineer, decompile,
              or disassemble this software. Violation of these terms will result in
              immediate license termination and may result in legal action.
            </p>
          </div>

          <div className="about-section contact-section">
            <h3>Contact</h3>
            <p>
              <strong>Blue Line Scannables</strong><br />
              Email: bluelinescannables@gmail.com
            </p>
          </div>

          <div className="about-footer">
            <p className="build-info">Build ID: BLS-IC-7X9K2M4P</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Integrity Check: 0x424C532D4943
export default AboutDialog;
