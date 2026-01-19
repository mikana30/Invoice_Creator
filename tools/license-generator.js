#!/usr/bin/env node
/**
 * License Key Generator for Invoice Creator
 *
 * IMPORTANT: This tool is for YOUR use only!
 * NEVER include this file in the distributed application.
 *
 * Usage:
 *   node license-generator.js --generate-keys     Generate new Ed25519 keypair
 *   node license-generator.js --create            Create a new license key
 *   node license-generator.js --create --machine-id=XXXX  Create machine-bound key
 *   node license-generator.js --verify KEY        Verify a license key
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Paths for keys
const KEYS_DIR = path.join(__dirname, 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');

// Base32 alphabet (Crockford's variant)
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Encode buffer to Base32
 */
function base32Encode(buffer) {
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, '0');
    result += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return result;
}

/**
 * Format key with dashes
 */
function formatKey(str) {
  const chunks = [];
  for (let i = 0; i < str.length; i += 5) {
    chunks.push(str.substring(i, i + 5));
  }
  return chunks.join('-');
}

/**
 * Generate a new Ed25519 keypair
 */
function generateKeyPair() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

  console.log('\n=== Keys Generated Successfully ===\n');
  console.log('Private key saved to:', PRIVATE_KEY_PATH);
  console.log('Public key saved to:', PUBLIC_KEY_PATH);
  console.log('\nIMPORTANT:');
  console.log('1. Keep private.pem SECRET and secure!');
  console.log('2. Copy the public key below into electron/license/validator.js\n');
  console.log('=== PUBLIC KEY (copy this to validator.js) ===\n');
  console.log(publicKey);
}

/**
 * Create a new license key
 */
function createLicenseKey(options = {}) {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('Error: No private key found. Run with --generate-keys first.');
    process.exit(1);
  }

  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

  // Generate unique random bytes for the key (makes each key visually unique)
  const randomBytes = crypto.randomBytes(12);
  const timestamp = Math.floor(Date.now() / 1000);

  // Build payload buffer: 1 byte version + 4 bytes timestamp + 12 bytes random
  const payloadBuffer = Buffer.alloc(17);
  payloadBuffer.writeUInt8(1, 0);  // Version
  payloadBuffer.writeUInt32BE(timestamp, 1);  // Timestamp
  randomBytes.copy(payloadBuffer, 5);  // Random bytes

  // Legacy payload for logging only
  const payload = {
    v: 1,                          // Version
    p: 'invoice-creator',          // Product ID
    t: options.type || 'perpetual', // License type
    c: timestamp,                  // Created timestamp
    e: options.expiry || null,     // Expiry (null = never)
  };

  // Add machine binding if specified
  if (options.machineId) {
    payload.m = options.machineId;
  }

  // Encode the unique payload buffer to Base32
  const payloadBase32 = base32Encode(payloadBuffer);

  // Use 25 characters for the key (covers all 17 bytes = 28 base32 chars, we use 25)
  const paddedKey = payloadBase32.substring(0, 25);
  const formattedKey = formatKey(paddedKey);

  // Sign the key part (Ed25519 uses crypto.sign directly)
  const signature = crypto.sign(null, Buffer.from(formattedKey), privateKey);
  const signatureB64 = signature.toString('base64');

  const fullKey = `${formattedKey}.${signatureB64}`;

  console.log('\n=== License Key Generated ===\n');
  console.log('Key:', fullKey);
  console.log('\nPayload:', JSON.stringify(payload, null, 2));
  console.log('\nGive this key to your customer.');

  return fullKey;
}

/**
 * Verify a license key
 */
function verifyLicenseKey(key) {
  if (!fs.existsSync(PUBLIC_KEY_PATH)) {
    console.error('Error: No public key found. Run with --generate-keys first.');
    process.exit(1);
  }

  const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');

  const parts = key.split('.');
  if (parts.length !== 2) {
    console.log('Invalid key format');
    return false;
  }

  const [keyPart, signatureB64] = parts;
  const signature = Buffer.from(signatureB64, 'base64');

  try {
    // Ed25519 uses crypto.verify directly
    const isValid = crypto.verify(null, Buffer.from(keyPart), publicKey, signature);

    console.log('\n=== License Key Verification ===\n');
    console.log('Key:', key);
    console.log('Valid:', isValid ? 'YES' : 'NO');

    return isValid;
  } catch (error) {
    console.error('Verification error:', error.message);
    return false;
  }
}

/**
 * Quick generate - no prompts
 */
function quickGenerate() {
  createLicenseKey({ type: 'perpetual' });
}

/**
 * Interactive mode to create a key
 */
async function interactiveCreate() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log('\n=== Create New License Key ===\n');

  const type = await question('License type (perpetual/subscription) [perpetual]: ') || 'perpetual';

  let expiry = null;
  if (type === 'subscription') {
    const days = await question('Validity in days [365]: ') || '365';
    expiry = Math.floor(Date.now() / 1000) + (parseInt(days) * 24 * 60 * 60);
  }

  const machineId = await question('Machine ID (leave empty for any machine): ') || null;

  rl.close();

  createLicenseKey({ type, expiry, machineId });
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--generate-keys')) {
  generateKeyPair();
} else if (args.includes('--quick')) {
  // Quick generate - no prompts, perpetual license
  quickGenerate();
} else if (args.includes('--create')) {
  const machineIdArg = args.find(a => a.startsWith('--machine-id='));
  const machineId = machineIdArg ? machineIdArg.split('=')[1] : null;

  if (args.includes('--interactive') || args.length === 1) {
    interactiveCreate();
  } else {
    createLicenseKey({ machineId });
  }
} else if (args.includes('--verify')) {
  const keyIndex = args.indexOf('--verify') + 1;
  if (keyIndex < args.length) {
    verifyLicenseKey(args[keyIndex]);
  } else {
    console.error('Usage: node license-generator.js --verify LICENSE_KEY');
  }
} else {
  console.log(`
Invoice Creator License Key Generator

Usage:
  node license-generator.js --generate-keys     Generate new Ed25519 keypair (do this first!)
  node license-generator.js --create            Create a new license key (interactive)
  node license-generator.js --create --machine-id=XXX  Create machine-bound key
  node license-generator.js --verify KEY        Verify a license key

First time setup:
  1. Run: node license-generator.js --generate-keys
  2. Copy the public key output into electron/license/validator.js
  3. Keep tools/keys/private.pem SECRET!

To generate a key for a customer:
  1. Run: node license-generator.js --create
  2. Give the generated key to your customer
`);
}
