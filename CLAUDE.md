# Invoice Creator

A full-stack invoice management application for small businesses/freelancers.

**Current Version:** 1.3.3
**Platform:** Windows 10+ (browser-based)
**GitHub:** https://github.com/mikana30/Invoice_Creator
**Support:** bluelinescannables@gmail.com

## Architecture

| Layer    | Technology        | Port |
|----------|-------------------|------|
| Frontend | React 19 + Vite   | -    |
| Backend  | Express.js        | 3001 |
| Database | SQLite            | -    |
| Launch   | Batch + Node.js   | -    |

The app runs as a local web server and opens in your default browser.

## Project Structure

```
Invoice Creator/
├── portable-node/
│   └── node/                 # Bundled Node.js runtime
├── backend/
│   ├── index.js              # Express server & API routes
│   ├── database.js           # SQLite connection (handles AppData path)
│   ├── init-db.js            # Schema initialization
│   └── database.db           # SQLite database file
├── frontend/
│   ├── index.html            # Main HTML
│   ├── dist/                 # Production build output
│   └── src/
│       ├── App.jsx           # Main app with navigation
│       ├── api.js            # API client wrapper
│       └── components/
│           ├── Dashboard.jsx         # Financial metrics & alerts
│           ├── InvoiceForm.jsx       # Create/edit invoices
│           ├── InvoiceList.jsx       # View & manage invoices
│           ├── InvoicePrint.jsx      # Print/PDF preview
│           ├── ClientManager.jsx     # Client CRUD
│           ├── ItemManager.jsx       # Unified item/component management
│           ├── InventoryManager.jsx  # Stock overview & quick adjust
│           ├── Settings.jsx          # Business settings & auto-backup
│           ├── ExportData.jsx        # CSV export & report templates
│           ├── AboutDialog.jsx       # Copyright & version info
│           ├── UpdateNotification.jsx # GitHub release checker
│           └── SupportForm.jsx       # Help/feedback form
├── installer/
│   ├── setup.iss             # Inno Setup installer script
│   └── Invoice Creator.bat   # App launcher (single source of truth)
├── tools/
│   └── generate-etsy-pdf.js  # Generate Etsy download PDF
├── etsy-assets/              # Etsy listing images
│   ├── etsy-listing-main.png # Main 2000x2000 listing image
│   └── create-listing-image-v2.py  # Image generator script
├── assets/                   # App icons (optional)
├── LICENSE                   # Proprietary license
├── build.bat                 # Build frontend + create installer
├── package.json              # Root package
└── CLAUDE.md                 # This file
```

## Workflow

**Always test the installed version, not a dev build.**

1. Make code changes
2. Build: `build.bat` (builds frontend + creates installer)
3. Install: Run `dist/Invoice Creator Setup X.X.X.exe`
4. Test the installed app from Start Menu or Desktop shortcut
5. Close the console window to stop the app

## Key Features

### Dashboard
- Total collected vs total billed
- Collected this month (by payment date)
- Unpaid and overdue totals
- Low stock alerts for items at/below reorder level

### Invoice Management
- Custom invoice numbering (PREFIX-YEAR-SEQUENCE format, e.g., INV-2025-001)
- Payment status tracking (Unpaid, Partial, Paid, Voided)
- Payment date tracking (auto-set when marked paid)
- Due dates with configurable payment terms (Due on Receipt, Net 15/30/60)
- Past-due alerts with visual highlighting
- Invoice notes field
- **Shipping field** - optional per-invoice shipping cost (added after tax, not taxed)
- Void invoices (restores inventory, keeps record)
- Print/PDF generation via react-to-print (optimized for 8.5x11 letter paper)
- Auto-opens PDF preview after creating invoice
- Form state persists in localStorage (draft recovery)

### Item & Inventory (Unified System - v1.3.0)
- **Single unified items table** - everything is an item (no separate "component" type)
- **Dual-purpose items** - any item can be **both sellable AND a component** of other items
  - Example: "Blank Knife" ($15) can be sold directly OR used as a component
  - Example: "Engraved Knife" ($35) uses "Blank Knife" as a component
- **Nested components** - items can contain items that contain items (unlimited depth)
  - Example: "Gift Set" contains "Engraved Knife" which contains "Blank Knife"
- **Recursive cost calculation** - cost auto-calculates by summing component costs
- **Recursive inventory** - selling a product decrements all nested component inventory
- Quick-add modals from invoice form for new clients/items
- **Inline item creation** - create new items with price/cost directly in component dropdown (v1.3.2)
  - When creating a new component inline, you can set its price and cost
  - **"Include in cost" checkbox** - choose whether component cost is added to parent item's total cost
  - Toggle include/exclude for each component in the list with checkbox
- Archive/unarchive items (hidden from invoice autocomplete)
- **Inventory tab enhancements** (v1.3.3+):
  - Direct inline editing of stock quantities (just click and type)
  - Sortable columns (Item, In Stock, Reorder At, Status)
  - Quick adjust buttons (+1, -1, +10)

**Key Principle:** There is NO distinction between "items" and "components" - they are all items in the same table. The `item_components` table simply links parent items to child items with a quantity and an `includeInCost` flag.

### Financial Tracking
- Configurable selling fees (percentage + fixed)
- Internal profit calculation per invoice (not shown on printed invoices)
- Tax rate with per-item exemption

### Business Customization
- Invoice number prefix and sequence control
- Business branding (banner image upload, displays at 8.5in width on printed invoices)
- Full business contact info

### Data Export & Backup
- CSV export for Clients, Items, Invoices
- Financial summary by month
- Full JSON backup (all data including invoice items and components)
- Restore from backup (replaces all data)
- **Auto-backup** - saves to browser localStorage every 5 minutes (optional)
- Report templates:
  - Profit Analysis
  - Annual Summary
  - Client Revenue Summary
  - Tax Report (Monthly)
  - Quarterly Tax Summary
  - Inventory Value
  - Sales by Item
- **All Time checkbox** - easy toggle for full-history reports

### Update Notification
- Automatically checks GitHub for new releases
- Shows banner when update is available
- "Later" dismisses for 24 hours
- "Skip" permanently ignores that version

## Database Schema

### Tables
- **clients**: id, name, street, street2, city, state, zip, phone, email
- **items**: id, name (unique), price, cost, inventory, reorderLevel, active
- **item_components**: id, parentItemId, componentItemId, quantityNeeded, includeInCost (self-referencing for recipes)
- **invoices**: id, invoiceNumber, clientId, invoiceDate, dueDate, paymentStatus, amountPaid, paymentDate, notes, createdAt, total, shipping
- **invoice_items**: id, invoiceId, itemId, quantity, price, taxExempt
- **settings**: singleton row with business info, taxRate, invoiceNumberPrefix, invoiceNumberNextSequence, defaultPaymentTerms, sellingFeePercent, sellingFeeFixed, bannerImage

### Database Location
- **Installed (Program Files)**: `%APPDATA%/invoice-creator/database.db`
- **Development**: `backend/database.db`

## API Endpoints

### Health Check
- `GET /api/health` - Returns `{ status: 'ok', version: '1.3.3' }`

### Settings
- `GET /settings` - Get all settings
- `PUT /settings` - Update settings

### Clients
- `GET /clients` - List all clients
- `GET /clients/search?q=` - Search clients by name
- `POST /clients` - Create client
- `PUT /clients/:id` - Update client
- `DELETE /clients/:id` - Delete (fails if client has invoices)

### Items (Unified System)
- `GET /items` - List all with cost/inventory/componentCount
- `GET /items/search?q=` - Search active items by name
- `POST /items` - Create with cost, inventory, reorderLevel, components[]
- `PUT /items/:id` - Update all fields including components
- `PATCH /items/:id/active` - Archive/unarchive item
- `DELETE /items/:id` - Delete (fails if used in invoices or as component)
- `GET /items/:id/components` - Get item's components with details
- `PUT /items/:id/components` - Update item's components
- `POST /items/quick-component` - Quick-create item with name, price, cost (for inline creation in dropdowns)

### Invoices
- `GET /invoices` - List all with status, due date, invoice number, client name
- `GET /invoices/:id` - Get with items (includes item costs)
- `POST /invoices` - Create (auto-generates invoice number, due date; decrements inventory recursively)
- `PUT /invoices/:id` - Update (handles inventory adjustments)
- `PATCH /invoices/:id/payment` - Update payment status/amount
- `PATCH /invoices/:id/void` - Void invoice (restores inventory recursively)
- `DELETE /invoices/:id` - Delete (restores inventory unless voided)

### Data Restore
- `POST /restore` - Full data restore from JSON backup

## Building & Distribution

### Build Frontend for Production
```bash
npm run build    # Builds frontend to frontend/dist/
```

### Create Installer
```bash
build.bat    # Builds frontend + creates Inno Setup installer
```

Or manually:
```bash
npm run build
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\setup.iss
```

Output: `dist/Invoice Creator Setup X.X.X.exe`

### Version Update Checklist
Update version in these files:
1. `package.json`
2. `frontend/src/components/AboutDialog.jsx`
3. `frontend/src/components/UpdateNotification.jsx`
4. `launcher/launch.bat`
5. `Start Invoice Creator.bat` (dev launcher in root)
6. `backend/index.js` (health check)
7. `installer/setup.iss`
8. `build.bat` (echo message)

### Create GitHub Release
```bash
git add -A && git commit -m "v1.x.x - description"
git tag v1.x.x
git push origin main && git push origin v1.x.x
gh release create v1.x.x --title "Invoice Creator v1.x.x" --notes "Release notes"
gh release upload v1.x.x "dist/Invoice Creator Setup 1.x.x.exe"
```

### Update Etsy PDF
```bash
node tools/generate-etsy-pdf.js
# Upload etsy-products/Invoice_Creator_Download.pdf to Etsy
```
**NOTE:** The PDF link (`/releases/latest`) never changes - it always points to the newest release automatically. Only regenerate the PDF if you change its branding/content, NOT for new releases.

## Etsy Distribution

**Model:** Free app, sold via Etsy digital download
1. Customer buys on Etsy -> receives PDF with download link
2. PDF links to: https://github.com/mikana30/Invoice_Creator/releases/latest
3. Customer downloads installer and runs it

### Etsy Listing Assets
- Main listing image: `etsy-assets/etsy-listing-main.png` (2000x2000px)
- Regenerate with: `python etsy-assets/create-listing-image-v2.py`
- Image shows actual app interface in monitor mockup with feature highlights

## Installer Behavior
- **Upgrade**: Auto-closes running app, auto-uninstalls previous version, preserves database in AppData
- **Uninstall**: Auto-closes running app (kills node.exe by path/window title), removes app files, keeps database in AppData
- **Fresh install**: Creates database on first app launch (not during install)
- Uses `CloseApplications=force` for seamless upgrades without manual app closing

## Copyright Protection

**LICENSE file**: Proprietary license prohibiting redistribution, modification, reverse engineering.

Hidden ownership signatures embedded throughout codebase:
- `backend/index.js` - Hex-encoded signature
- `frontend/src/App.jsx` - Base64 encoded ownership string, visible copyright header
- `frontend/src/api.js` - Copyright header
- `frontend/src/components/AboutDialog.jsx` - Build ID, hex integrity check
- `frontend/src/components/InvoicePrint.jsx` - Zero-width character watermark in printed invoices

**Copyright:** (c) 2025 Blue Line Scannables. All rights reserved.

---

## Rules for Claude (MUST FOLLOW)

### Task Tracking (MANDATORY)
1. **Create a checklist for EVERY task** using TaskCreate - no exceptions
2. **Check off each item immediately** when complete - never batch completions
3. **Update CLAUDE.md after every response** - keep documentation current

### Before Making Changes
4. **ALWAYS enter plan mode** for anything beyond trivial fixes
5. **ALWAYS commit working state first** before risky changes - ask user to confirm
6. **Explain what you will change and why** before doing it
7. **One change at a time** - test after EACH modification, not after 5

### While Working
8. **Test immediately** after every single file change
9. **Stop and ask** if something doesn't work as expected - don't chain more fixes
10. **Never modify multiple core files** (package.json, main.js, vite.config.js) in one go
11. **If you break something, STOP** - don't try to fix the fix the fix

### What NOT To Do
12. **Never remove critical dependencies** without explicit approval
13. **Never batch delete dependencies** from package.json
14. **Never assume** - if unsure, ASK
15. **Don't be clever** - simple and working beats elegant and broken
16. **DO NOT CREATE DEV RUNS** - We use git for version control

### Recovery
17. When things go wrong: `git checkout .` to reset, then start smaller
18. Always know the rollback plan BEFORE making changes

### After Code Changes (MANDATORY)
19. **Always rebuild and install locally** after pushing changes:
    - Build frontend: `npm run build`
    - Build installer: Run Inno Setup on `installer/setup.iss`
    - Install locally: Run the installer with `/SILENT` flag
    - User tests the INSTALLED version, not dev version

### Documentation (MANDATORY)
20. **Log every failed fix** in the "Failed Fixes" section below with:
    - What was tried
    - Why it failed
    - What to avoid next time

---

## Fixed Bugs

### [x] Client Creation Blank Screen (FIXED v1.3.0)
- **Issue:** Creating a client with missing fields caused blank screen
- **Fix:** Added validation and proper error handling in POST /clients

### [x] PDF Not Auto-Opening (FIXED v1.3.0)
- **Issue:** After creating invoice, user had to manually navigate to print
- **Fix:** Auto-navigate to print view after invoice creation

### [x] Recipe/Shared Inventory Too Complicated (FIXED v1.3.0)
- **Issue:** Three separate concepts (Items, Inventory Products, Components) were confusing
- **Fix:** Unified into single Items table with self-referencing components

### [x] Data Path Mismatch (FIXED v1.2.4)
- Old Electron app: `AppData/Roaming/invoice-creator/`
- New browser app was looking in: `AppData/Roaming/Invoice Creator/`
- Fixed to use old path to preserve customer data

### [x] Items Dropdown Shows "None" (FIXED v1.2.4)
- Added "No matching items found" feedback message

### [x] Invoice PDF Not Fitting 8.5x11 Paper (FIXED v1.3.3)
- **Issue:** Printed invoices didn't format well for standard letter paper
- **Fix:** Added `@page` rule for letter size, proper margins, adjusted fonts/spacing for print

### [x] Installer Not Auto-Closing App (FIXED v1.3.3)
- **Issue:** Installer complained about not being able to close applications during upgrade
- **Fix:** Added `CloseApplications=force`, multiple fallback methods to kill app by window title and path

---

## Failed Fixes (Do Not Repeat)

### [x] Linux timeout command on Windows (NEVER DO THIS)
- **What happened:** Used `timeout /t 15` (Linux syntax) instead of Windows `powershell Start-Sleep`
- **Result:** Infinite error loop spamming "timeout: invalid time interval '/t'"
- **Fix:** NEVER use `timeout` command. Use `powershell -Command "Start-Sleep -Seconds X"` instead
- **Also avoid:** Any Linux-style commands in bash on Windows (use PowerShell or cmd equivalents)

### [x] PowerShell $_ variable escaping in Bash (NEVER DO THIS)
- **What happened:** Used `$_.Path` in PowerShell command run through Bash tool
- **Result:** Bash interprets `$_` as a variable, mangles it to `\extglob.Path` or similar garbage
- **Fix:** NEVER use `$_` or `$variable` in PowerShell when running through Bash
- **Correct approach:** For killing processes, use SIMPLE commands:
  ```
  powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
  ```
- **DO NOT use:** Complex Where-Object filters with `$_.Path` - they WILL break
- **Alternative:** Use `taskkill /F /IM node.exe` for simple process killing (no path filtering)
