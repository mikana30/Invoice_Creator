#!/usr/bin/env node
/**
 * Bulk License Key Generator for Invoice Creator
 *
 * Generates multiple license keys for the Google Sheets key pool.
 * Output is formatted for easy copy/paste into "Available Keys" sheet.
 *
 * Usage:
 *   node tools/generate-key-pool.js --count 50
 *   node tools/generate-key-pool.js --count 100 --output keys.csv
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Paths for keys
const KEYS_DIR = path.join(__dirname, 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');

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
 * Create a single license key
 */
function createLicenseKey(privateKey) {
  // Build payload
  const payload = {
    v: 1,                          // Version
    p: 'invoice-creator',          // Product ID
    t: 'perpetual',                // License type
    c: Math.floor(Date.now() / 1000), // Created timestamp
    e: null,                       // Expiry (null = never)
  };

  // Convert payload to JSON and then to Base32
  const payloadJson = JSON.stringify(payload);
  const payloadBuffer = Buffer.from(payloadJson, 'utf8');
  const payloadBase32 = base32Encode(payloadBuffer);

  // Pad to 25 characters for consistent key length
  const paddedKey = payloadBase32.padEnd(25, '0').substring(0, 25);
  const formattedKey = formatKey(paddedKey);

  // Sign the key part (Ed25519 uses crypto.sign directly)
  const signature = crypto.sign(null, Buffer.from(formattedKey), privateKey);
  const signatureB64 = signature.toString('base64');

  return `${formattedKey}.${signatureB64}`;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let count = 25; // Default
  let outputFile = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Invoice Creator - Bulk License Key Generator

Usage:
  node tools/generate-key-pool.js [options]

Options:
  --count N     Number of keys to generate (default: 25)
  --output FILE Save keys to a CSV file
  --help        Show this help message

Examples:
  node tools/generate-key-pool.js --count 50
  node tools/generate-key-pool.js --count 100 --output keys.csv

After generating, copy the keys to your Google Sheet "Available Keys" tab.
`);
      process.exit(0);
    }
  }

  // Check for private key
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('Error: No private key found at', PRIVATE_KEY_PATH);
    console.error('Run: node tools/license-generator.js --generate-keys');
    process.exit(1);
  }

  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

  console.log(`\nGenerating ${count} license keys...\n`);

  const keys = [];
  const startTime = Date.now();

  for (let i = 0; i < count; i++) {
    const key = createLicenseKey(privateKey);
    keys.push(key);

    // Small delay to ensure unique timestamps
    if (i < count - 1) {
      // Spin wait for 1ms to ensure timestamp differs
      const waitUntil = Date.now() + 1;
      while (Date.now() < waitUntil) {}
    }
  }

  const elapsed = Date.now() - startTime;

  // Output
  if (outputFile) {
    // Save to CSV file
    const csv = 'License Key,Status\n' + keys.map(k => `"${k}",available`).join('\n');
    const outputPath = path.resolve(outputFile);
    fs.writeFileSync(outputPath, csv);
    console.log(`Saved ${count} keys to: ${outputPath}`);
  } else {
    // Print to console in a format ready for Google Sheets
    console.log('=== LICENSE KEYS (copy to Google Sheet "Available Keys" tab) ===\n');
    console.log('License Key\tStatus');
    console.log('─'.repeat(80));
    keys.forEach(key => {
      console.log(`${key}\tavailable`);
    });
    console.log('─'.repeat(80));
  }

  console.log(`\nGenerated ${count} keys in ${elapsed}ms`);
  console.log('\nNext steps:');
  console.log('1. Copy the keys above (or from the CSV file)');
  console.log('2. Paste into your Google Sheet "Available Keys" tab');
  console.log('3. Column A = License Key, Column B = Status');
}

main();
