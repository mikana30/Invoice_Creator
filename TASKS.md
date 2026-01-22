# Invoice Creator - Task List

## Active Issues

### [x] 1. Client Creation Blank Screen Bug - FIXED
**Priority:** High
**Status:** Complete

**Issue:** When creating a client without filling in all fields, clicking save causes the screen to go blank instead of refreshing the client list.

**Root Cause:** Backend POST /clients had no error handling. When errors occurred, Express returned HTML error page, and frontend couldn't parse it as JSON causing unhandled exception.

**Fix Applied:**
- Added try/catch and validation in `backend/index.js` POST /clients
- Backend now returns full client object (not just ID)
- Added client-side validation in `ClientManager.jsx` and `QuickAddModals.jsx`
- Made `api.createClient()` robust to non-JSON error responses

**Files Changed:**
- `backend/index.js`
- `frontend/src/api.js`
- `frontend/src/components/ClientManager.jsx`
- `frontend/src/components/QuickAddModals.jsx`

---

### [ ] 2. Simplify Inventory/Recipe System
**Priority:** High
**Status:** Ready to Implement

**Issue:** Current system has three concepts that are confusing:
- Items (sellable products)
- Inventory Products (shared raw materials)
- Item Components (recipe/BOM linking items to inventory products)

**Approved Solution:**
- **Single unified Items table** - items can be both sellable AND components
- Add `isComponent` flag to items (component-only vs sellable)
- Sub-items link to the same `items` table (self-referencing)
- **Cost auto-calculated** from component costs (for profit tracking)
- **Sell price stays manual** (user sets the selling price)
- Remove or migrate `inventory_products` table into `items`

**Migration Plan:**
1. Add `isComponent` column to `items` table
2. Migrate existing `inventory_products` to `items` with `isComponent = 1`
3. Update `item_components` to reference `items` table (componentItemId instead of inventoryProductId)
4. Update UI to show unified item list with type filter
5. Auto-calculate item cost from sum of component costs

**Files Affected:**
- `backend/init-db.js` (schema changes)
- `backend/index.js` (API changes)
- `frontend/src/components/QuickAddModals.jsx`
- `frontend/src/components/ItemManager.jsx`
- `frontend/src/components/InventoryManager.jsx`

---

### [x] 3. Auto-Open PDF on Invoice Creation - FIXED
**Priority:** Medium
**Status:** Complete

**Issue:** When clicking "Create Invoice", it should also open a PDF/print preview of the newly created invoice.

**Fix Applied:**
- Modified `InvoiceForm.jsx` to return the saved invoice ID via `onSave(invoiceId)`
- Updated `App.jsx` `handleInvoiceSaved()` to navigate to print view for new invoices
- Only triggers for new invoices, not for edits or duplicates

**Files Changed:**
- `frontend/src/components/InvoiceForm.jsx`
- `frontend/src/App.jsx`

---

### [ ] 4. Inline Sub-Item Creation in Item Manager
**Priority:** Medium
**Status:** Not Started

**Issue:** When adding a new item with recipe/sub-items, user should be able to type a new sub-item name directly in the dropdown (similar to how "Create new client" works).

**Implementation:**
- Add "Create new..." option to component dropdown
- Open quick-add modal for new inventory product
- Auto-select the newly created product

**Files Affected:**
- `frontend/src/components/ItemManager.jsx`
- `frontend/src/components/QuickAddModals.jsx`

---

### [ ] 5. Show Sub-Items in Inventory Tab
**Priority:** Medium
**Status:** Not Started

**Issue:** The Inventory tab should display sub-items/components, not just top-level inventory products.

**Implementation:**
- Show hierarchical view of items and their components
- Or flat list with component indicator

**Files Affected:**
- `frontend/src/components/InventoryManager.jsx`

---

### [ ] 6. Auto-Backup on Close Option
**Priority:** Medium
**Status:** Not Started

**Issue:** Add setting to automatically backup data when closing the app.

**Implementation Options:**
- Add checkbox in Settings: "Auto-backup on close"
- Create backup file to user-selected folder
- Or backup to AppData with date-stamped filename

**Technical Considerations:**
- Browser-based app can't detect window close reliably
- Could use beforeunload event (limited)
- Alternative: Auto-backup on interval (e.g., daily)
- Alternative: Prompt on close

**Files Affected:**
- `frontend/src/components/Settings.jsx`
- `frontend/src/components/ExportData.jsx`
- `backend/index.js` (new backup endpoint?)

---

### [ ] 7. Report Enhancements
**Priority:** Medium
**Status:** Not Started

**Issue:** Add "All Time" checkbox and custom report template builder to the reports section.

**Features Requested:**
- [ ] All-time date range checkbox
- [ ] Custom report builder with checkbox selections
- [ ] Tax-focused report templates

**Suggested Tax Reports:**
- Sales Tax Summary (total tax collected by period)
- Income Summary (for Schedule C / 1099 reporting)
- Expense Summary (if costs tracked)
- Profit & Loss by Period
- Quarterly Tax Estimate Helper

**Files Affected:**
- `frontend/src/components/ExportData.jsx`

---

## Completed Issues

(Move items here when done)

---

## Notes

- Always test after each change
- Commit working state before risky changes
- Update CLAUDE.md after completing tasks
