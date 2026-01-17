/**
 * Invoice Creator - License Key Redemption Backend
 *
 * Google Apps Script Web App that:
 * 1. Receives Etsy order numbers from the landing page
 * 2. Verifies the order hasn't been redeemed already
 * 3. Assigns and returns the next available license key
 * 4. Logs the redemption in the spreadsheet
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet with these columns:
 *    - Sheet 1 "Redemptions": Order Number | License Key | Redeemed At | IP Address
 *    - Sheet 2 "Available Keys": License Key | Status
 * 2. Pre-generate license keys using: node tools/license-generator.js --quick
 * 3. Paste the keys in "Available Keys" sheet (one per row, Status = "available")
 * 4. Deploy this script as a Web App (Execute as: Me, Access: Anyone)
 * 5. Copy the Web App URL to docs/index.html
 */

// Configuration - Update with your spreadsheet ID
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

/**
 * Handle POST requests from the landing page
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const orderNumber = String(data.orderNumber || '').trim();

    // Validate order number
    if (!orderNumber || !/^\d+$/.test(orderNumber)) {
      return jsonResponse({ success: false, error: 'Invalid order number format' });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const redemptionsSheet = ss.getSheetByName('Redemptions');
    const keysSheet = ss.getSheetByName('Available Keys');

    if (!redemptionsSheet || !keysSheet) {
      return jsonResponse({ success: false, error: 'Server configuration error. Please contact support.' });
    }

    // Check if order already redeemed
    const redemptionsData = redemptionsSheet.getDataRange().getValues();
    for (let i = 1; i < redemptionsData.length; i++) {
      if (String(redemptionsData[i][0]) === orderNumber) {
        // Order already redeemed - return the same key
        const existingKey = redemptionsData[i][1];
        return jsonResponse({
          success: true,
          licenseKey: existingKey,
          message: 'This order was previously activated. Here is your license key.'
        });
      }
    }

    // Find next available key
    const keysData = keysSheet.getDataRange().getValues();
    let keyRowIndex = -1;
    let licenseKey = null;

    for (let i = 1; i < keysData.length; i++) {
      const status = String(keysData[i][1] || '').toLowerCase();
      if (status === 'available' || status === '') {
        licenseKey = keysData[i][0];
        keyRowIndex = i + 1; // 1-indexed for sheets
        break;
      }
    }

    if (!licenseKey) {
      // No keys available
      Logger.log('No available license keys remaining');
      return jsonResponse({
        success: false,
        error: 'No license keys available. Please contact support at bluelinescannables@gmail.com'
      });
    }

    // Mark key as used
    keysSheet.getRange(keyRowIndex, 2).setValue('used');

    // Log the redemption
    const timestamp = new Date().toISOString();
    const ipAddress = e.parameter ? e.parameter.ip || 'unknown' : 'unknown';
    redemptionsSheet.appendRow([orderNumber, licenseKey, timestamp, ipAddress]);

    Logger.log('Redeemed: Order ' + orderNumber + ' -> ' + licenseKey);

    return jsonResponse({
      success: true,
      licenseKey: licenseKey
    });

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return jsonResponse({
      success: false,
      error: 'An unexpected error occurred. Please try again or contact support.'
    });
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return HtmlService.createHtmlOutput(
    '<h1>Invoice Creator License Server</h1>' +
    '<p>This endpoint accepts POST requests only.</p>' +
    '<p>Visit <a href="https://mikana30.github.io/Invoice_Creator/">the activation page</a> to redeem your license.</p>'
  );
}

/**
 * Helper function to return JSON response with CORS headers
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Utility function to check remaining keys (run from script editor)
 */
function checkRemainingKeys() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const keysSheet = ss.getSheetByName('Available Keys');
  const keysData = keysSheet.getDataRange().getValues();

  let available = 0;
  let used = 0;

  for (let i = 1; i < keysData.length; i++) {
    const status = String(keysData[i][1] || '').toLowerCase();
    if (status === 'used') {
      used++;
    } else {
      available++;
    }
  }

  Logger.log('Available keys: ' + available);
  Logger.log('Used keys: ' + used);
  Logger.log('Total keys: ' + (available + used));

  // Send email alert if running low
  if (available < 10) {
    MailApp.sendEmail({
      to: 'bluelinescannables@gmail.com',
      subject: 'Invoice Creator: Low License Keys Warning',
      body: 'You have only ' + available + ' license keys remaining.\n\n' +
            'Please generate more keys using: node tools/license-generator.js --quick\n' +
            'Then add them to the "Available Keys" sheet.'
    });
    Logger.log('Low key warning email sent');
  }
}

/**
 * Set up daily trigger to check remaining keys
 */
function setupDailyCheck() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkRemainingKeys') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new daily trigger at 9 AM
  ScriptApp.newTrigger('checkRemainingKeys')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();

  Logger.log('Daily key check trigger created');
}
