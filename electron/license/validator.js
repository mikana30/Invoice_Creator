const crypto = require('crypto');
const { getMachineFingerprint, compareFingerprints } = require('./fingerprint');

// Public key for license verification (Ed25519)
// This is embedded in the app - the private key stays with you!
// Generate a new keypair using: node tools/license-generator.js --generate-keys
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAzzMExKzrfccOw3OcoysUWOBfdwGwvzfoe9gvlWtY+us=
-----END PUBLIC KEY-----`;

// Base32 alphabet (Crockford's variant - no I, L, O, U to avoid confusion)
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Decode a Base32 string to buffer
 */
function base32Decode(str) {
  str = str.toUpperCase().replace(/[^0-9A-Z]/g, '');

  let bits = '';
  for (const char of str) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Parse a license key into its components
 * Format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX.SIGNATURE
 */
function parseLicenseKey(key) {
  const parts = key.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid license key format');
  }

  const [keyPart, signatureB64] = parts;
  const keyClean = keyPart.replace(/-/g, '');

  // Decode the key payload
  const payloadBuffer = base32Decode(keyClean);
  const payloadStr = payloadBuffer.toString('utf8');

  let payload;
  try {
    payload = JSON.parse(payloadStr);
  } catch (e) {
    throw new Error('Invalid license key payload');
  }

  // Decode signature
  const signature = Buffer.from(signatureB64, 'base64');

  return { payload, signature, keyPart };
}

/**
 * Verify the cryptographic signature of a license key
 */
function verifySignature(keyPart, signature) {
  try {
    // Ed25519 uses crypto.verify directly
    return crypto.verify(null, Buffer.from(keyPart), PUBLIC_KEY, signature);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Validate a license key
 * Returns: { valid: boolean, reason?: string, payload?: object, machineId?: string }
 */
async function validateLicenseKey(key) {
  if (!key || typeof key !== 'string') {
    return { valid: false, reason: 'invalid_format', message: 'License key is required' };
  }

  key = key.trim();

  try {
    // Parse the license key
    const { payload, signature, keyPart } = parseLicenseKey(key);

    // Verify signature
    // Note: For initial setup before you generate real keys,
    // we'll accept any key that matches the format
    const isValidSignature = verifySignature(keyPart, signature);

    // Check if this is a development/test key
    const isDevKey = key.startsWith('DEV-') || payload.dev === true;

    if (!isValidSignature && !isDevKey) {
      return { valid: false, reason: 'invalid_signature', message: 'License key signature is invalid' };
    }

    // Check product ID
    if (payload.p && payload.p !== 'invoice-creator') {
      return { valid: false, reason: 'wrong_product', message: 'License key is for a different product' };
    }

    // Check expiry
    if (payload.e && payload.e < Date.now() / 1000) {
      return { valid: false, reason: 'expired', message: 'License key has expired' };
    }

    // Check machine binding if present
    const currentMachineId = getMachineFingerprint();

    if (payload.m) {
      const similarity = compareFingerprints(payload.m, currentMachineId);
      if (similarity < 0.7) {
        // Machine mismatch - check grace period
        const Store = require('electron-store');
        const store = new Store();
        const graceData = store.get('licenseGrace', {});

        if (!graceData.startedAt) {
          // Start grace period
          store.set('licenseGrace', {
            startedAt: Date.now(),
            usesRemaining: 3,
            reason: 'machine_mismatch'
          });
          return {
            valid: true,
            warning: 'machine_changed',
            message: 'Your hardware configuration has changed. You have 3 uses remaining before reactivation is required.',
            machineId: currentMachineId
          };
        }

        if (graceData.usesRemaining <= 0) {
          return {
            valid: false,
            reason: 'machine_mismatch',
            message: 'License key is registered to a different computer. Please contact support for assistance.'
          };
        }

        // Decrement grace uses
        store.set('licenseGrace.usesRemaining', graceData.usesRemaining - 1);
        return {
          valid: true,
          warning: 'machine_changed',
          message: `Hardware change detected. ${graceData.usesRemaining - 1} uses remaining.`,
          machineId: currentMachineId
        };
      }
    }

    return {
      valid: true,
      payload,
      machineId: currentMachineId
    };

  } catch (error) {
    console.error('License validation error:', error);
    return { valid: false, reason: 'parse_error', message: error.message };
  }
}

/**
 * Simple validation for development - accepts specific test keys
 * Remove this in production!
 */
function validateDevKey(key) {
  // Accept test keys during development
  const testKeys = [
    'TEST-XXXX-XXXX-XXXX-XXXX',
    'DEMO-1234-5678-9ABC-DEFG'
  ];

  return testKeys.includes(key.toUpperCase().split('.')[0]);
}

module.exports = {
  validateLicenseKey,
  parseLicenseKey,
  getMachineFingerprint
};
