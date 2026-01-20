# Invoice Creator

A full-stack invoice management application for small businesses/freelancers.

**Current Version:** 1.2.3
**Platform:** Windows 10+ only
**GitHub:** https://github.com/mikana30/Invoice_Creator
**Support:** bluelinescannables@gmail.com

## Architecture

| Layer    | Technology        | Port |
|----------|-------------------|------|
| Desktop  | Electron          | -    |
| Frontend | React 19 + Vite   | 5173 |
| Backend  | Express.js        | 3001 |
| Database | SQLite            | -    |

## Project Structure

```
Invoice Creator/
├── electron/
│   ├── main.js           # Electron main process
│   ├── preload.js        # IPC bridge (contextBridge)
│   ├── updater.js        # GitHub release update checker
│   └── support.js        # Mailto feedback handler
├── backend/
│   ├── index.js          # Express server & API routes
│   ├── database.js       # SQLite connection (userData path aware)
│   ├── init-db.js        # Schema initialization & migrations
│   └── database.db       # SQLite database file
├── frontend/
│   ├── index.html        # Main HTML (title: Invoice Creator)
│   ├── src/
│   │   ├── App.jsx       # Main app with navigation
│   │   ├── api.js        # API client wrapper (dynamic port)
│   │   └── components/
│   │       ├── Dashboard.jsx         # Financial metrics & alerts
│   │       ├── InvoiceForm.jsx       # Create/edit invoices
│   │       ├── InvoiceList.jsx       # View & manage invoices
│   │       ├── InvoicePrint.jsx      # Print/PDF preview
│   │       ├── ClientManager.jsx     # Client CRUD
│   │       ├── ItemManager.jsx       # Item/product CRUD
│   │       ├── InventoryManager.jsx  # Shared inventory products
│   │       ├── Settings.jsx          # Business settings
│   │       ├── ExportData.jsx        # CSV export & backup/restore
│   │       ├── AboutDialog.jsx       # Copyright & version info
│   │       ├── UpdateNotification.jsx # Update available banner
│   │       └── SupportForm.jsx       # Help/feedback form
│   └── vite.config.js
├── tools/
│   └── generate-etsy-pdf.js  # Generate Etsy download PDF
├── etsy-products/
│   └── Invoice_Creator_Download.pdf  # PDF for Etsy listing
├── dist/
│   └── Invoice Creator Setup 1.2.3.exe  # Windows installer
├── package.json          # Root Electron package
└── Start Invoice Creator.bat  # Launches installed app
```

## Running the App

### Production (Customer Experience)
Double-click `Start Invoice Creator.bat` - launches the installed app from `%LOCALAPPDATA%\Programs\Invoice Creator\`

### Development
```bash
npm run dev    # Starts backend + frontend + Electron together
```

Or manually:
```bash
cd backend && node index.js    # Terminal 1
cd frontend && npm run dev     # Terminal 2
npm run dev:electron           # Terminal 3
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

## Building & Releasing

### Build Windows Installer
```bash
npm install           # Install dependencies
npm run build         # Build frontend and create installer
```
Output: `dist/Invoice Creator Setup 1.2.3.exe`

### Create GitHub Release
```bash
# Update version in: package.json, AboutDialog.jsx, electron/main.js, generate-etsy-pdf.js
npm run build
git add -A && git commit -m "v1.x.x - description"
git tag v1.x.x
git push origin main && git push origin v1.x.x
gh release create v1.x.x "dist/Invoice Creator Setup 1.x.x.exe" --title "Invoice Creator v1.x.x" --notes "Release notes"
```

### Update Etsy PDF
```bash
node tools/generate-etsy-pdf.js
# Upload etsy-products/Invoice_Creator_Download.pdf to Etsy
```

## Etsy Distribution

**Model:** Free app, sold via Etsy digital download
1. Customer buys on Etsy → receives PDF with download link
2. PDF links to: https://github.com/mikana30/Invoice_Creator/releases/latest
3. Customer downloads and installs - no license key needed

## Copyright Protection

Hidden ownership signatures embedded throughout codebase:
- `electron/main.js` - Hex-encoded app ID, build fingerprint
- `frontend/src/App.jsx` - Base64 encoded ownership string
- `frontend/src/components/AboutDialog.jsx` - Build ID, hex integrity check
- `frontend/src/components/InvoicePrint.jsx` - Zero-width character watermark in printed invoices

**Copyright:** © 2025 Blue Line Scannables. All rights reserved.
