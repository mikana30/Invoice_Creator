/**
 * Support/Feedback Module for Invoice Creator
 * Handles sending feedback via mailto links
 */

const { shell } = require('electron');
const os = require('os');

// Configure your support email
const SUPPORT_EMAIL = 'bluelinescannables@gmail.com';

/**
 * Open email client with pre-filled feedback
 * @param {object} data - Feedback data
 * @param {string} data.type - Type of feedback (bug, feature, question)
 * @param {string} data.subject - Subject line
 * @param {string} data.message - Feedback message
 * @param {string} data.email - User's email for follow-up (optional)
 * @param {string} appVersion - Current app version
 */
function openFeedbackEmail(data, appVersion) {
  const { type, subject, message, email } = data;

  // Build subject line
  const typeLabel = {
    bug: 'Bug Report',
    feature: 'Feature Request',
    question: 'Question'
  }[type] || 'Feedback';

  const emailSubject = `[Invoice Creator ${typeLabel}] ${subject || 'Feedback'}`;

  // Build email body with system info
  const systemInfo = [
    `App Version: ${appVersion}`,
    `OS: ${os.platform()} ${os.release()}`,
    `Architecture: ${os.arch()}`,
    email ? `Reply-to: ${email}` : null
  ].filter(Boolean).join('\n');

  const emailBody = `
${message || ''}

---
System Information:
${systemInfo}
`.trim();

  // Create mailto URL
  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  // Open default email client
  shell.openExternal(mailtoUrl);

  return { success: true };
}

/**
 * Get system information for support
 */
function getSystemInfo(appVersion) {
  return {
    appVersion,
    platform: os.platform(),
    osRelease: os.release(),
    arch: os.arch(),
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
    freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
    cpus: os.cpus().length + ' cores'
  };
}

module.exports = {
  openFeedbackEmail,
  getSystemInfo,
  SUPPORT_EMAIL
};
