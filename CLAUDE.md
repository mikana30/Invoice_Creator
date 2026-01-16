# Invoice Creator

A full-stack invoice management application for small businesses/freelancers.

## Current Goals

- [x] **Goal #1:** Add stats pane in navbar, LEFT of Help button, showing: invoices created, total $ billed
- [x] **Goal #2:** Rename Help button to "Feature Request/Support Development" (or similar)
- [x] **Goal #3:** Use frontend-design skill to make UI more engaging, add animations to Support Dev button
- [x] **Goal #4:** New DB table `item_components` (item_id, inventory_product_id, quantity_needed) for Bill of Materials
- [x] **Goal #5:** UI to define "recipe" when creating/editing items (select inventory products + quantities)
- [x] **Goal #6:** Invoice creation decrements all component inventories when item with recipe is sold
- [x] **Goal #7:** Low stock alerts based on what you can actually build (min of components)
- [x] **Goal #8:** Inline "quick add" modals from Invoice form - when typing a name that doesn't exist for Client, Item, or Inventory Product, offer to create it on the spot (skippable, full form including recipe for items)
- [x] **Goal #9:** Report Templates - Pre-built exportable reports (Profit Analysis, Inventory Value, Client Revenue Summary, Tax Report, Sales by Item) with date range selection

## Architecture

| Layer    | Technology        | Port |
|----------|-------------------|------|
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
│   ├── support.js        # Mailto feedback handler
│   └── license/
│       ├── validator.js  # License key verification
│       └── fingerprint.js # Machine ID generation
├── backend/
│   ├── index.js          # Express server & API routes
│   ├── database.js       # SQLite connection (userData path aware)
│   ├── init-db.js        # Schema initialization & migrations
│   └── database.db       # SQLite database file
├── frontend/
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
│   │       ├── LicenseActivation.jsx # License key entry UI
│   │       ├── UpdateNotification.jsx # Update available banner
│   │       └── SupportForm.jsx       # Help/feedback form
│   └── vite.config.js
├── tools/
│   └── license-generator.js  # Generate license keys (seller only!)
├── package.json          # Root Electron package
└── Start Invoice Creator.bat  # Development launcher
```

## Running the App

Execute `Start Invoice Creator.bat` which:
1. Starts the backend server on port 3001
2. Opens browser to http://localhost:5173
3. Launches Vite dev server

Or manually:
```bash
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
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

### Item & Inventory
- Item cost tracking for profit calculations
- Inventory count with reorder level alerts
- Profit margin display in item list
- Archive/unarchive items (hidden from invoice autocomplete)
- Shared inventory products (one base inventory linked to multiple sell items)

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

### Mobile Responsive
- Responsive design for tablet (768px) and mobile (480px)
- Touch-friendly controls (44px minimum)

## Database Schema

### Tables
- **clients**: id, name, street, street2, city, state, zip, phone, email
- **items**: id, name (unique), price, cost, inventory, reorderLevel, baseInventoryId, active
- **inventory_products**: id, name (unique), quantity, reorderLevel
- **invoices**: id, invoiceNumber, clientId, invoiceDate, dueDate, paymentStatus, amountPaid, paymentDate, notes, createdAt, total
- **invoice_items**: id, invoiceId, itemId, quantity, price, taxExempt
- **settings**: singleton row with business info, taxRate, invoiceNumberPrefix, invoiceNumberNextSequence, defaultPaymentTerms, sellingFeePercent, sellingFeeFixed, bannerImage

### Migrations
The `init-db.js` file handles both new database creation and migrations for existing databases via the `columnsToAdd` array.

## API Endpoints

### Settings
- `GET /settings` - Get all settings
- `PUT /settings` - Update settings (includes invoice numbering, payment terms, fees)

### Clients
- `GET /clients` - List all clients
- `GET /clients/search?q=` - Search clients by name
- `POST /clients` - Create client
- `PUT /clients/:id` - Update client
- `DELETE /clients/:id` - Delete (fails if client has invoices)

### Items
- `GET /items` - List all with cost/inventory (joins with inventory_products)
- `GET /items/search?q=` - Search active items by name
- `POST /items` - Create with cost, inventory, reorderLevel, baseInventoryId
- `PUT /items/:id` - Update all fields
- `PATCH /items/:id/active` - Archive/unarchive item
- `DELETE /items/:id` - Delete (fails if used in invoices)

### Inventory Products (Shared Inventory)
- `GET /inventory-products` - List all base inventory products
- `POST /inventory-products` - Create shared inventory product
- `PUT /inventory-products/:id` - Update quantity/reorderLevel
- `DELETE /inventory-products/:id` - Delete (fails if items linked)
- `GET /inventory-products/:id/items` - Get items linked to this inventory

### Invoices
- `GET /invoices` - List all with status, due date, invoice number, client name
- `GET /invoices/:id` - Get with items (includes item costs)
- `POST /invoices` - Create (auto-generates invoice number, due date; decrements inventory)
- `PUT /invoices/:id` - Update (handles inventory adjustments; can't edit voided)
- `PATCH /invoices/:id/payment` - Update payment status/amount (auto-sets paymentDate)
- `PATCH /invoices/:id/void` - Void invoice (restores inventory, marks as voided)
- `DELETE /invoices/:id` - Delete (restores inventory unless voided)

### Data Restore
- `POST /restore` - Full data restore from JSON backup (replaces all data)

## State Management Pattern

React component state with props. Key patterns:
- Parent holds `refreshKey` state that increments on data changes
- Child lists watch `refreshKey` in useEffect to trigger reload
- Example: `App.jsx` passes `refreshKey` to `InvoiceList`

## CSS Classes

### Status Badges
- `.status-badge` - Base badge styling
- `.status-paid`, `.status-unpaid`, `.status-partial`, `.status-overdue`, `.status-voided`

### Past Due
- `.past-due` - Red left border, light red background
- `.past-due-summary` - Alert box for count

### Internal Summary
- `.internal-summary` - Hidden on print via @media print

## Electron Distribution

**GitHub Repository:** https://github.com/mikana30/Invoice_Creator
**Latest Release:** https://github.com/mikana30/Invoice_Creator/releases/tag/v1.0.0
**Support Email:** bluelinescannables@gmail.com

### Building the Installer
```bash
npm install           # Install Electron dependencies
npm run build         # Build frontend and create Windows installer
```
Output: `dist/Invoice Creator Setup.exe` (~85MB)

### License System
- Uses Ed25519 cryptographic signatures
- Machine fingerprinting ties licenses to specific computers
- 3-use grace period when hardware changes
- Keys are generated and public key is configured in `electron/license/validator.js`

**First-time setup (already done):**
```bash
node tools/license-generator.js --generate-keys
# Public key is now in electron/license/validator.js
# Private key is in tools/keys/private.pem - NEVER commit this!
```

**Generate customer license:**
```bash
node tools/license-generator.js --create       # Interactive mode
node tools/license-generator.js --quick        # Quick mode (90-day license)
```

### Update Checker
- Checks GitHub Releases API on app launch
- Compares semantic versions
- Shows banner notification with download link
- Configured for: `mikana30/Invoice_Creator`

### Support System
- Help button in nav opens SupportForm
- Uses mailto: links to bluelinescannables@gmail.com
- Auto-includes app version and OS info

### Etsy Distribution
1. Installer hosted at: https://github.com/mikana30/Invoice_Creator/releases
2. Sell license keys on Etsy: https://www.etsy.com/shop/BlueLineScannables
3. Customer receives: License key + download link
4. Generate keys with: `node tools/license-generator.js --quick`

### Creating a New Release
```bash
git tag v1.x.x
git push origin v1.x.x
gh release create v1.x.x "dist/Invoice Creator Setup.exe" --title "v1.x.x" --notes "Release notes here"
```
