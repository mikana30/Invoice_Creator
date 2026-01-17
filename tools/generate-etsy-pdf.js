#!/usr/bin/env node
/**
 * Etsy PDF Generator for Invoice Creator
 *
 * Creates a professional PDF digital download for Etsy.
 * Contains:
 * - Thank you message
 * - Activation URL (with QR code)
 * - Instructions for redeeming
 * - System requirements
 *
 * Usage:
 *   node tools/generate-etsy-pdf.js
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Configuration
const ACTIVATION_URL = 'https://mikana30.github.io/Invoice_Creator/';
const OUTPUT_DIR = path.join(__dirname, '..', 'etsy-products');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'Invoice_Creator_License.pdf');

// Colors (matching the app branding)
const COLORS = {
  primary: '#3498db',
  secondary: '#2c3e50',
  text: '#333333',
  lightGray: '#666666',
  accent: '#27ae60'
};

async function generatePDF() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(ACTIVATION_URL, {
    width: 200,
    margin: 2,
    color: {
      dark: '#2c3e50',
      light: '#ffffff'
    }
  });

  // Create PDF document
  const doc = new PDFDocument({
    size: 'letter',
    margins: { top: 50, bottom: 50, left: 60, right: 60 }
  });

  // Pipe to file
  const writeStream = fs.createWriteStream(OUTPUT_FILE);
  doc.pipe(writeStream);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const centerX = doc.page.margins.left + pageWidth / 2;

  // Header
  doc.fontSize(32)
     .font('Helvetica-Bold')
     .fillColor(COLORS.primary)
     .text('Invoice Creator', { align: 'center' });

  doc.moveDown(0.5);

  doc.fontSize(14)
     .font('Helvetica')
     .fillColor(COLORS.lightGray)
     .text('Professional Invoice Management Software', { align: 'center' });

  doc.moveDown(2);

  // Thank you message
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor(COLORS.secondary)
     .text('Thank You for Your Purchase!', { align: 'center' });

  doc.moveDown(1);

  doc.fontSize(12)
     .font('Helvetica')
     .fillColor(COLORS.text)
     .text(
       'Your license key is ready to be activated. Follow the simple steps below to ' +
       'download and activate your copy of Invoice Creator.',
       { align: 'center', lineGap: 4 }
     );

  doc.moveDown(2);

  // Activation box
  const boxTop = doc.y;
  const boxHeight = 180;

  doc.roundedRect(doc.page.margins.left, boxTop, pageWidth, boxHeight, 10)
     .fillAndStroke('#f8f9fa', '#e0e0e0');

  doc.y = boxTop + 20;

  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor(COLORS.secondary)
     .text('Activation URL:', { align: 'center' });

  doc.moveDown(0.5);

  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor(COLORS.primary)
     .text(ACTIVATION_URL, { align: 'center', link: ACTIVATION_URL });

  doc.moveDown(1);

  // QR Code
  const qrSize = 100;
  const qrX = centerX - qrSize / 2;
  doc.image(qrDataUrl, qrX, doc.y, { width: qrSize, height: qrSize });

  doc.y = boxTop + boxHeight + 30;

  // Important notice
  doc.roundedRect(doc.page.margins.left, doc.y, pageWidth, 50, 8)
     .fill('#fff3cd');

  doc.y += 15;

  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor('#856404')
     .text('Important: Have your Etsy order number ready!', { align: 'center' });

  doc.fontSize(10)
     .font('Helvetica')
     .text('You\'ll need it to activate your license. Find it in your Etsy purchase confirmation.', { align: 'center' });

  doc.y += 30;

  // Steps
  doc.moveDown(1);

  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor(COLORS.secondary)
     .text('How to Activate', { align: 'center' });

  doc.moveDown(1);

  const steps = [
    { num: '1', text: 'Visit the activation URL above (or scan the QR code)' },
    { num: '2', text: 'Enter your Etsy order number when prompted' },
    { num: '3', text: 'Your unique license key will be displayed' },
    { num: '4', text: 'Download Invoice Creator for Windows or Mac' },
    { num: '5', text: 'Enter your license key when you first open the app' }
  ];

  doc.fontSize(11)
     .font('Helvetica');

  steps.forEach(step => {
    const stepY = doc.y;

    // Circle with number
    doc.circle(doc.page.margins.left + 15, stepY + 8, 12)
       .fill(COLORS.primary);

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text(step.num, doc.page.margins.left + 10, stepY + 3, { width: 10, align: 'center' });

    // Step text
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor(COLORS.text)
       .text(step.text, doc.page.margins.left + 40, stepY + 2);

    doc.moveDown(1.2);
  });

  doc.moveDown(1);

  // System Requirements
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor(COLORS.secondary)
     .text('System Requirements:', { continued: true });

  doc.font('Helvetica')
     .fillColor(COLORS.lightGray)
     .text('  Windows 10+ or macOS 10.15+');

  doc.moveDown(2);

  // Footer
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(COLORS.lightGray)
     .text('Need help? Contact us at bluelinescannables@gmail.com', { align: 'center' });

  doc.moveDown(0.5);

  doc.fontSize(9)
     .text('© Blue Line Scannables - Invoice Creator', { align: 'center' });

  // Finalize PDF
  doc.end();

  // Wait for write to complete
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log('\n✓ PDF generated successfully!');
      console.log('\nOutput file:', OUTPUT_FILE);
      console.log('\nNext steps:');
      console.log('1. Open the PDF and verify it looks correct');
      console.log('2. Upload it to your Etsy listing as a digital download');
      console.log('3. Done! The same PDF works for unlimited sales.');
      resolve();
    });
    writeStream.on('error', reject);
  });
}

// Run
generatePDF().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
