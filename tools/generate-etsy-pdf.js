#!/usr/bin/env node
/**
 * Etsy PDF Generator for Invoice Creator
 *
 * Creates a professional PDF digital download for Etsy.
 * Contains:
 * - Thank you message
 * - Download links (Windows & Mac)
 * - QR code to download page
 * - Installation instructions
 *
 * Usage:
 *   node tools/generate-etsy-pdf.js
 */

const PDFDocument = require('pdfkit');
// QR code removed - desktop app only
const fs = require('fs');
const path = require('path');

// Configuration
const DOWNLOAD_URL = 'https://github.com/mikana30/Invoice_Creator/releases/latest';
const OUTPUT_DIR = path.join(__dirname, '..', 'etsy-products');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'Invoice_Creator_Download.pdf');

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


  // Create PDF document
  const doc = new PDFDocument({
    size: 'letter',
    margins: { top: 50, bottom: 50, left: 60, right: 60 }
  });

  // Pipe to file
  const writeStream = fs.createWriteStream(OUTPUT_FILE);
  doc.pipe(writeStream);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

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
       'Follow the instructions below to download and install Invoice Creator.',
       { align: 'center', lineGap: 4 }
     );

  doc.moveDown(2);

  // Download box
  const boxTop = doc.y;
  const boxHeight = 80;

  doc.roundedRect(doc.page.margins.left, boxTop, pageWidth, boxHeight, 10)
     .fillAndStroke('#d4edda', '#27ae60');

  doc.y = boxTop + 20;

  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor(COLORS.secondary)
     .text('Download Page:', { align: 'center' });

  doc.moveDown(0.5);

  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor(COLORS.primary)
     .text(DOWNLOAD_URL, { align: 'center', link: DOWNLOAD_URL });

  doc.y = boxTop + boxHeight + 20;

  // Installation Steps
  doc.moveDown(0.5);

  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor(COLORS.primary)
     .text('Installation Steps', { align: 'left' });

  doc.moveDown(0.5);

  const installSteps = [
    'Download "Invoice.Creator.Setup.1.2.3.exe"',
    'Double-click the installer to run it',
    'If Windows shows "Windows protected your PC", click More info → Run anyway',
    'Follow the installation prompts',
    'Launch Invoice Creator from your desktop or Start menu',
    'If Windows Firewall asks to allow access, click "Allow" (this is normal - the app needs local network access to run)'
  ];

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(COLORS.text);

  installSteps.forEach((step, i) => {
    doc.text(`${i + 1}. ${step}`, { indent: 20 });
    doc.moveDown(0.3);
  });

  doc.moveDown(0.8);

  // System Requirements
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor(COLORS.secondary)
     .text('System Requirements: ', { continued: true });

  doc.font('Helvetica')
     .fillColor(COLORS.lightGray)
     .text('Windows 10 or later');

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
      console.log('\nPDF generated successfully!');
      console.log('\nOutput file:', OUTPUT_FILE);
      console.log('\nNext steps:');
      console.log('1. Upload the new installer to GitHub releases');
      console.log('2. Upload this PDF to your Etsy listing');
      console.log('3. Done! Fully passive - no license keys needed.');
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
