# Invoice Creator

A full-stack invoice management application for small businesses/freelancers.

**Current Version:** 1.2.4
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
├── launcher/
│   └── launch.bat            # Main app launcher
├── portable-node/
│   └── node/                 # Bundled Node.js runtime
├── backend/
│   ├── index.js              # Express server & API routes
│   ├── database.js           # SQLite connection
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
│           ├── ItemManager.jsx       # Item/product CRUD
│           ├── InventoryManager.jsx  # Shared inventory products
│           ├── Settings.jsx          # Business settings
│           ├── ExportData.jsx        # CSV export & backup/restore
│           ├── AboutDialog.jsx       # Copyright & version info
│           ├── UpdateNotification.jsx # GitHub release checker
│           └── SupportForm.jsx       # Help/feedback form
├── tools/
│   ├── generate-etsy-pdf.js  # Generate Etsy download PDF
│   └── create-shortcuts.ps1  # Desktop/Start Menu shortcuts
├── assets/                   # App icons (optional)
├── Install Shortcuts.bat     # Creates Desktop/Start Menu shortcuts
├── package.json              # Root package
└── CLAUDE.md                 # This file
```

## Running the App

### Production (User Experience)
1. Double-click `Start Invoice Creator.bat`
2. Browser opens automatically to http://localhost:3001
3. Close the console window to stop the app

### Development
```bash
npm run dev    # Starts backend + frontend dev servers
```

Or manually:
```bash
cd backend && node index.js    # Terminal 1 - Backend on port 3001
cd frontend && npm run dev     # Terminal 2 - Vite dev server on port 5173
```

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
- Void invoices (restores inventory, keeps record)
- Print/PDF generation via react-to-print
- Form state persists when switching tabs

### Item & Inventory
- Item cost tracking for profit calculations
- Inventory count with reorder level alerts
- Profit margin display in item list
- Archive/unarchive items (hidden from invoice autocomplete)
- Shared inventory products (one base inventory linked to multiple sell items)
- Recipe/Bill of Materials support (items can have component ingredients)
- Quick-add modals from invoice form for new clients/items

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
- Full JSON backup (all data including invoice items)
- Restore from backup (replaces all data)
- Report templates (Profit Analysis, Tax Report, Sales by Item, etc.)

### Update Notification
- Automatically checks GitHub for new releases
- Shows banner when update is available
- "Later" dismisses for 24 hours
- "Skip" permanently ignores that version

## Database Schema

### Tables
- **clients**: id, name, street, street2, city, state, zip, phone, email
- **items**: id, name (unique), price, cost, inventory, reorderLevel, baseInventoryId, active
- **inventory_products**: id, name (unique), quantity, reorderLevel
- **item_components**: id, itemId, inventoryProductId, quantityNeeded (Bill of Materials)
- **invoices**: id, invoiceNumber, clientId, invoiceDate, dueDate, paymentStatus, amountPaid, paymentDate, notes, createdAt, total
- **invoice_items**: id, invoiceId, itemId, quantity, price, taxExempt
- **settings**: singleton row with business info, taxRate, invoiceNumberPrefix, invoiceNumberNextSequence, defaultPaymentTerms, sellingFeePercent, sellingFeeFixed, bannerImage

## API Endpoints

### Health Check
- `GET /api/health` - Returns `{ status: 'ok', version: '1.2.4' }`

### Settings
- `GET /settings` - Get all settings
- `PUT /settings` - Update settings

### Clients
- `GET /clients` - List all clients
- `GET /clients/search?q=` - Search clients by name
- `POST /clients` - Create client
- `PUT /clients/:id` - Update client
- `DELETE /clients/:id` - Delete (fails if client has invoices)

### Items
- `GET /items` - List all with cost/inventory
- `GET /items/search?q=` - Search active items by name
- `POST /items` - Create with cost, inventory, reorderLevel, baseInventoryId
- `PUT /items/:id` - Update all fields
- `PATCH /items/:id/active` - Archive/unarchive item
- `DELETE /items/:id` - Delete (fails if used in invoices)

### Inventory Products
- `GET /inventory-products` - List all base inventory products
- `POST /inventory-products` - Create shared inventory product
- `PUT /inventory-products/:id` - Update quantity/reorderLevel
- `DELETE /inventory-products/:id` - Delete (fails if items linked)

### Invoices
- `GET /invoices` - List all with status, due date, invoice number, client name
- `GET /invoices/:id` - Get with items (includes item costs)
- `POST /invoices` - Create (auto-generates invoice number, due date; decrements inventory)
- `PUT /invoices/:id` - Update (handles inventory adjustments)
- `PATCH /invoices/:id/payment` - Update payment status/amount
- `PATCH /invoices/:id/void` - Void invoice (restores inventory)
- `DELETE /invoices/:id` - Delete (restores inventory unless voided)

### Data Restore
- `POST /restore` - Full data restore from JSON backup

## Building & Distribution

### Build Frontend for Production
```bash
npm run build    # Builds frontend to frontend/dist/
```

### Create Distribution Package
1. Update version in: package.json, AboutDialog.jsx, UpdateNotification.jsx, launcher/launch.bat
2. Build frontend: `npm run build`
3. Package the following folders:
   - `launcher/` - App launcher
   - `portable-node/` - Node.js runtime
   - `backend/` - Server code + node_modules
   - `frontend/dist/` - Built frontend
   - `Install Shortcuts.bat` - Shortcut installer

### Create GitHub Release
```bash
git add -A && git commit -m "v1.x.x - description"
git tag v1.x.x
git push origin main && git push origin v1.x.x
gh release create v1.x.x --title "Invoice Creator v1.x.x" --notes "Release notes"
```

### Update Etsy PDF
```bash
node tools/generate-etsy-pdf.js
# Upload etsy-products/Invoice_Creator_Download.pdf to Etsy
```

## Etsy Distribution

**Model:** Free app, sold via Etsy digital download
1. Customer buys on Etsy -> receives PDF with download link
2. PDF links to: https://github.com/mikana30/Invoice_Creator/releases/latest
3. Customer downloads and extracts - no license key needed

## Copyright Protection

Hidden ownership signatures embedded throughout codebase:
- `backend/index.js` - Hex-encoded signature
- `frontend/src/App.jsx` - Base64 encoded ownership string
- `frontend/src/components/AboutDialog.jsx` - Build ID, hex integrity check
- `frontend/src/components/InvoicePrint.jsx` - Zero-width character watermark in printed invoices

**Copyright:** (c) 2025 Blue Line Scannables. All rights reserved.

---

## Rules for Claude (MUST FOLLOW)

### Task Tracking (MANDATORY)
1. **Create a checklist for EVERY task** using TodoWrite - no exceptions
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

### Documentation (MANDATORY)
19. **Log every failed fix** in the "Failed Fixes" section below with:
    - What was tried
    - Why it failed
    - What to avoid next time

---

## Current Bug Fixes (In Progress)

### [ ] 1. Invoice Form Data Lost on Refresh
- **Issue:** Refreshing the invoice creation page loses all entered data
- **Cause:** Form state only exists in React state, not persisted
- **Fix:** Auto-save form state to localStorage, restore on page load

### [ ] 2. Profit Not Updating When Prices Entered
- **Issue:** Profit calculation doesn't update in real-time
- **Cause:** Under investigation
- **Fix:** Ensure profit recalculates on price/cost changes

### [ ] 3. Recipe/Shared Inventory Too Complicated
- **Issue:** Adding recipe items and shared inventory is confusing
- **Cause:** Too many concepts (Items vs Inventory Products vs Components)
- **Fix:** Simplify the workflow - clearer labels, better UX flow

---

## Fixed Bugs

### [x] Data Path Mismatch (FIXED v1.2.4)
- Old Electron app: `AppData/Roaming/invoice-creator/`
- New browser app was looking in: `AppData/Roaming/Invoice Creator/`
- Fixed to use old path to preserve customer data

### [x] Items Dropdown Shows "None" (FIXED v1.2.4)
- Added "No matching items found" feedback message

---

## Failed Fixes (Do Not Repeat)

(None currently - section preserved for future reference)
