# Passive Etsy License Delivery - Setup Guide

This guide will walk you through setting up the fully automated license key delivery system.

## Overview

After setup, the system works like this:
1. Customer buys on Etsy → gets the PDF automatically
2. Customer visits the URL in the PDF → enters their Etsy order number
3. System verifies the order and gives them a license key
4. **You do nothing!** 🎉

---

## Step 1: Create Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new spreadsheet named: **"Invoice Creator - License Redemptions"**
3. Create two sheets (tabs at the bottom):

### Sheet 1: "Redemptions" (rename "Sheet1" to this)
Add these headers in row 1:
| A | B | C | D |
|---|---|---|---|
| Order Number | License Key | Redeemed At | IP Address |

### Sheet 2: "Available Keys" (click + to add new sheet)
Add these headers in row 1:
| A | B |
|---|---|
| License Key | Status |

4. **Copy your starter keys** from `starter-keys.csv` into the "Available Keys" sheet
   - Open `starter-keys.csv` in Excel or a text editor
   - Copy all the keys (rows 2+) and paste into the Google Sheet starting at row 2

---

## Step 2: Create Google Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Copy the entire contents of `google-apps-script/Code.gs` and paste it
4. **Update the SPREADSHEET_ID:**
   - Look at your Google Sheet URL: `https://docs.google.com/spreadsheets/d/XXXXX/edit`
   - Copy the `XXXXX` part (the long ID)
   - Replace `YOUR_SPREADSHEET_ID_HERE` in the script with this ID

5. Save the script (Ctrl+S or File → Save)

---

## Step 3: Deploy the Web App

1. In Apps Script, click **Deploy → New deployment**
2. Click the gear icon and select **Web app**
3. Settings:
   - **Description:** License Redemption Server
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**
5. Click **Authorize access** and follow the prompts to allow the script
6. **COPY THE WEB APP URL** - you'll need this!

The URL looks like: `https://script.google.com/macros/s/XXXXX/exec`

---

## Step 4: Update the Landing Page

1. Open `docs/index.html` in a text editor
2. Find this line near the bottom:
   ```javascript
   const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
3. Replace `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` with your Web App URL from Step 3
4. Save the file

---

## Step 5: Enable GitHub Pages

1. Go to your GitHub repo: https://github.com/mikana30/Invoice_Creator
2. Go to **Settings → Pages**
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/docs`
4. Click **Save**
5. Wait a few minutes for the page to deploy

Your landing page will be at: `https://mikana30.github.io/Invoice_Creator/`

---

## Step 6: Push Changes to GitHub

```bash
cd "C:\Users\BlueLineScannables\Desktop\Invoice Creator"
git add docs/
git commit -m "Add license activation landing page"
git push
```

---

## Step 7: Upload PDF to Etsy

1. Open `etsy-products/Invoice_Creator_License.pdf` and verify it looks good
2. Go to your Etsy shop and create a new listing
3. Set it as a **Digital download**
4. Upload `Invoice_Creator_License.pdf` as the file
5. Set your price, title, description, etc.
6. Publish!

---

## You're Done! 🎉

From now on:
- Every sale automatically delivers the PDF
- Customers activate themselves
- You never have to touch anything

---

## Maintenance

### When you run low on keys:

You'll get an email alert when keys are low. To add more:

```bash
node tools/generate-key-pool.js --count 50 --output new-keys.csv
```

Then copy the keys from `new-keys.csv` into your "Available Keys" Google Sheet.

### Checking key inventory:

1. Open your Google Sheet
2. Look at the "Available Keys" tab
3. Count rows where Status = "available"

Or in Apps Script, run the `checkRemainingKeys()` function.

---

## Files Reference

| File | Purpose |
|------|---------|
| `docs/index.html` | Landing page (GitHub Pages) |
| `docs/styles.css` | Landing page styles |
| `google-apps-script/Code.gs` | Backend code (paste into Google) |
| `etsy-products/Invoice_Creator_License.pdf` | Upload to Etsy |
| `etsy-products/starter-keys.csv` | Initial 25 keys |
| `tools/generate-key-pool.js` | Generate more keys |
| `tools/generate-etsy-pdf.js` | Regenerate PDF if needed |

---

## Troubleshooting

### "Unable to connect to activation server"
- Check that your Apps Script is deployed as a web app
- Verify the URL in `docs/index.html` is correct
- Make sure you pushed the changes to GitHub

### "No license keys available"
- Check your "Available Keys" sheet
- Generate more keys with `generate-key-pool.js`

### CORS errors in browser console
- This is normal for local testing
- The actual deployed page on GitHub Pages will work fine

---

## Support

Questions? Contact bluelinescannables@gmail.com
