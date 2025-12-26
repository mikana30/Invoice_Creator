const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

/**
 * Generate a unique machine fingerprint based on hardware identifiers
 * This is used to tie license keys to specific machines
 */
function getMachineFingerprint() {
  const components = [];

  // Computer hostname
  components.push(os.hostname());

  // Platform
  components.push(os.platform());

  // CPU model (first CPU)
  const cpus = os.cpus();
  if (cpus && cpus.length > 0) {
    components.push(cpus[0].model);
  }

  // Primary MAC address
  const networkInterfaces = os.networkInterfaces();
  let primaryMAC = null;
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    for (const iface of interfaces) {
      // Skip loopback and internal interfaces
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        primaryMAC = iface.mac;
        break;
      }
    }
    if (primaryMAC) break;
  }
  if (primaryMAC) {
    components.push(primaryMAC);
  }

  // Windows: Try to get disk serial number
  if (os.platform() === 'win32') {
    try {
      const result = execSync('wmic diskdrive get serialnumber', { encoding: 'utf8' });
      const lines = result.trim().split('\n');
      if (lines.length > 1) {
        const serial = lines[1].trim();
        if (serial) {
          components.push(serial);
        }
      }
    } catch (error) {
      // Ignore errors - disk serial is optional
    }
  }

  // Create hash of components
  const fingerprint = crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .substring(0, 32);

  return fingerprint;
}

/**
 * Compare two fingerprints with tolerance for minor changes
 * Returns similarity score (0-1)
 */
function compareFingerprints(fp1, fp2) {
  if (fp1 === fp2) return 1.0;

  // Simple character-by-character comparison
  let matches = 0;
  const len = Math.min(fp1.length, fp2.length);
  for (let i = 0; i < len; i++) {
    if (fp1[i] === fp2[i]) matches++;
  }

  return matches / len;
}

module.exports = {
  getMachineFingerprint,
  compareFingerprints
};
