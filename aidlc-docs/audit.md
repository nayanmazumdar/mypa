# AIDLC Audit Log

## Code Change — Individual Header Profile Picture
**Timestamp**: 2026-07-05T00:00:00Z
**User Input**: "in individual dashboard page, the profile pic should be displayed in login area"
**AI Response**: Updated `IndividualHeader.jsx` to display the user's actual profile picture (avatar) in the top-right login area when available, falling back to the initials avatar when no profile picture is set. The `avatarUrl()` helper was added to resolve relative backend paths to full URLs, matching the same pattern already used in `IndividualSettings.jsx`.
**Context**: Brownfield code change — no new components, no design phase needed. Direct implementation.

---

## Code Change — Fix Profile Picture Display in Settings and Header
**Timestamp**: 2026-07-05T00:01:00Z
**User Input**: "in settings pic is not properly added. it should come from there"
**AI Response**: Diagnosed and fixed three root causes:
1. `vite.config.js` — added `/uploads` proxy so avatar images load in dev (was only proxying `/api`)
2. `avatarUrl()` in both `IndividualSettings.jsx` and `IndividualHeader.jsx` — removed broken `VITE_API_URL.replace('/api', '')` logic (produced empty string); relative `/uploads/...` paths now used directly
3. `auth.service.js` login query — added `avatar` to SELECT and return payload so `user.avatar` is populated in Redux from login, not just after visiting Settings
**Context**: Brownfield bug fix — no new components needed.

---

## Code Change — Customers Page POS Data Population
**Timestamp**: 2026-07-07T00:00:00Z
**User Input**: "the customers page should populate customer details from POS table."
**AI Response**: Diagnosed and fixed a syntax error in `backend/src/routes/customer.routes.js`. The `GET /customers` route already had the correct LEFT JOIN on `pos_transactions` (aggregating `total_spent`, `visit_count`, `last_visit` per customer), and the frontend `Customers.jsx` already had columns for those fields. However, the route handler had a duplicate orphaned block of code (`const [countResult]...`) that appeared outside the closing `});` of the route handler, causing a JavaScript parse error that prevented the server from loading the route. Removed the duplicate block — the route now correctly joins POS data into the customer list response.
**Context**: Brownfield bug fix — no new components or schema changes needed.

---

## Code Change — Fix Customers Not Populating (Root Cause)
**Timestamp**: 2026-07-07T00:01:00Z
**User Input**: "still customers are not populated in the customers table."
**AI Response**: Found two root causes:

1. **POST /api/customers was missing `user_id`** — the `customers` table has `user_id INT NOT NULL` (from migration 001, never relaxed). The INSERT statement only had `uuid, shop_id, name, ...` — omitting `user_id` caused a MySQL error on every customer creation attempt, meaning no customers could ever be saved. Fixed: added `user_id: req.user.id` to the INSERT.

2. **GET /api/customers filtered only by `shop_id`** — existing customers (created via the old system before multi-tenant migration 003) have `shop_id = NULL`. The query `WHERE c.shop_id = ?` returns 0 rows for them. Fixed: changed to `WHERE (c.shop_id = ? OR (c.shop_id IS NULL AND c.user_id = ?))` for backwards compatibility, using both `req.user.shop_id` and `req.user.id` as fallback.

3. Applied the same dual-scope fix to GET /:id, PUT /:id, and DELETE /:id routes.

Note: POS checkout also has a persistent `user_id` error (see error logs) but that's a separate issue — the `pos_transactions` table may have `user_id NOT NULL` with a NOT NULL constraint that the INSERT is violating due to a schema mismatch.
**Context**: Brownfield bug fix — no new components or schema changes needed.

---

## Code Change — Customers Page: List from POS Transaction Data
**Timestamp**: 2026-07-07T00:02:00Z
**User Input**: "in the customers page, the list of customers from the POS transaction data to be listed."
**AI Response**: Redesigned the GET /customers backend query to be POS-first using a UNION:
- Part A: Registered customers (from customers table) LEFT JOINed with their POS aggregates (total_spent, visit_count, last_visit)
- Part B: Walk-in customers (pos_transactions where customer_id IS NULL but customer_name is set), grouped by name, as POS-only rows
Both sets are wrapped in a subquery to allow search filtering, sorted by last_visit DESC then name. Each row carries a `source` field ('registered' or 'walkin').
Frontend Customers.jsx updated to:
- Use `source` field to render walk-in rows with an orange bag icon and "Walk-in" badge instead of Active/Inactive
- Hide edit/delete actions for walk-in customers (they have no customers table record)
- Updated header subtitle and empty state text to reflect the POS-sourced list
**Context**: Brownfield enhancement — backend query + frontend display update only, no schema changes.

---

## Code Change — POS Customer Dropdown: Search from customers table + Add new inline
**Timestamp**: 2026-07-07T00:03:00Z
**User Input**: "in POS page, in billing segment 'Customer (optional)' dropdown, customer should come from customers table, if not there new manual customer to be added."
**AI Response**: 
Backend: Fixed `/search/quick` to use dual-scope WHERE (shop_id OR user_id fallback) and lowered minimum query length to 1 char.
Frontend POS.jsx:
- Dropdown now shows results immediately from customers table on every keystroke
- Added `handleAddNewCustomer()` — when typed name has no exact match in results, an "Add [name] as new customer" option appears at the bottom of the dropdown. Clicking it calls POST /api/customers, creates the record, and auto-selects the new customer (linking the POS transaction via customer_id)
- Selected customer shown in a pill below the input for confirmation
- Clear (×) button works for both selected and unselected-but-typed states
- `customerResults` state is cleaned up on clearCart, post-checkout reset, and clearCustomer
**Context**: Brownfield enhancement — frontend only (plus a small backend quick-search fix), no schema changes.

---

## Code Change — POS Customer Input: Auto-detect name/phone/email
**Timestamp**: 2026-07-07T00:04:00Z
**User Input**: "if text is entered, it should go to name, if phone number is given it should go to phone column, if email is given it should go to email column of customer. do it"
**AI Response**: Added `detectInputType(value)` helper in POS.jsx that classifies the typed input:
- Email pattern (x@x.x) → routes to `email` column, uses local-part (before @) as `name`
- Phone pattern (7-15 digits/spaces/symbols) → routes to `phone` column, uses the number as `name`
- Anything else → routes to `name` column
`handleAddNewCustomer` now builds the correct payload before calling POST /customers.
Updated the "Add new" button label to say "Add new customer with phone/email/name" depending on detected type.
Updated exact-match check in dropdown to also match on phone and email (so searching by phone shows existing customer and suppresses the "Add new" option).
Backend: added `email LIKE ?` to /search/quick query so email search finds existing customers correctly.
**Context**: Brownfield enhancement — frontend logic + backend search fix, no schema changes.

---

## Bug Fix — New customers not reflecting in customers table
**Timestamp**: 2026-07-07T00:05:00Z
**User Input**: "new entries are not reflected in customer table using the above logic"
**AI Response**: Three root causes found and fixed:

1. **handleAddNewCustomer payload bug** — The old code assigned `payload` via a ternary then immediately overwrote `payload.name` again (redundant and confusing). Rewrote cleanly: builds `{ name }` first, then conditionally adds `email` or `phone` and adjusts `name` for email type. Now unambiguous.

2. **POST /customers response missing fields** — The backend only returned `{ id, uuid, name }`. The frontend used `created.phone` and `created.email` which were `undefined`, so the selected customer object had nulls even though data was saved correctly in DB. Fixed: backend now returns `{ id, uuid, name, email, phone }`.

3. **Sort order hides new customers** — GET /customers sorted by `last_visit DESC`. MySQL puts NULLs last in DESC, so customers with no POS history (including newly created ones) appeared at the very end of the list — invisible on page 1 when there are many POS customers. Fixed: `ORDER BY last_visit IS NULL DESC, last_visit DESC, created_at DESC, name ASC` — NULLs (new customers) float to top, then most-recently-visited, then most-recently-created.
**Context**: Brownfield bug fix — frontend logic + backend response + query sort order.

---

## Bug Fix — New entries not reflected in customers table (root cause diagnosis)
**Timestamp**: 2026-07-07T00:06:00Z
**User Input**: "not resolved"
**AI Response**: Ran DB inspection to find actual root causes:

1. **Phone regex too strict** — `detectInputType` required 7-15 chars but short numbers like "7867" (4 digits) failed the check and fell to `name`. Fixed: new regex `/^[+\d][\d\s\-()+]*$/` + at least 4 digit characters extracted.

2. **Customers page stale on navigation** — `useEffect(() => load(1,''), [])` only fires on first mount. Navigating to Customers after adding from POS showed old data. Fixed: added `visibilitychange` listener so the list auto-reloads when the tab/window becomes visible again, plus a manual refresh (⟳) button in the header.

3. **DB data fix** — Customer id:7 had phone "7867" stored as `name` with `phone=null`. Corrected in DB: `phone="7867"`.
**Context**: Brownfield bug fix — frontend logic + page reload behavior + DB data correction.

---

## Bug Fix — Auto-insert customer on Enter/blur in POS Customer field
**Timestamp**: 2026-07-07T00:07:00Z
**User Input**: "when entered a new customer in 'Customer (optional)' section, it should automatically inserted in the customer table."
**AI Response**: Previously, a new customer was only created if the user explicitly clicked the "Add new customer" option in the dropdown. If they typed a name and moved on (blur) or pressed Enter, no record was created — the name just floated as a plain string.

Changes to `frontend/src/pages/POS.jsx`:
1. `handleAddNewCustomer(rawOverride?)` — accepts an optional override so it can be called with the current input value from blur/keydown handlers without relying solely on state.
2. `handleCustomerInputKeyDown(e)` — on Enter key: if typed value exactly matches an existing result, selects it; otherwise calls `handleAddNewCustomer()`.
3. `handleCustomerInputBlur()` — on blur (200ms delay so dropdown clicks still register): if there's typed text and no customer selected, same exact-match-or-create logic as above.
4. Input element: replaced inline `onBlur` arrow function with `onBlur={handleCustomerInputBlur}` and added `onKeyDown={handleCustomerInputKeyDown}`.

No backend changes needed — `POST /customers` already handles this correctly.
**Context**: Brownfield bug fix — frontend only.

---

## Feature — Sales button in POS page
**Timestamp**: 2026-07-08T00:00:00Z
**User Input**: "in pos page add a button to go to the sales page"
**AI Response**: Added a "Sales" button in the cart panel header (top-right of the bill panel), next to the "Clear All" button. Clicking it navigates to `/sales`.
Changes to `frontend/src/pages/POS.jsx`: imported `useNavigate` from react-router-dom, imported `HiOutlineClipboardDocumentList` icon, added `const navigate = useNavigate()`, restructured cart header to hold both the Sales button and Clear All button in a flex group.
**Context**: Brownfield enhancement — frontend only, no backend changes.

---

## Feature — Sales History modal in POS (last 3 transactions + print)
**Timestamp**: 2026-07-08T00:01:00Z
**User Input**: "while clicking on Sales History only last three pos transactions to be shown in a modal and provision for printing the receipt."
**AI Response**: Replaced the navigate-to-/sales behavior with an inline modal. Changes to `frontend/src/pages/POS.jsx`:
- Added state: `showSalesHistory`, `salesHistory`, `salesHistoryLoading`, `printingHistoryId`.
- `loadSalesHistory()` — calls `posApi.getTransactions({ limit: 3, page: 1 })`, stores results.
- `handlePrintHistoryReceipt(txn)` — fetches full transaction detail via `posApi.getTransaction(id)` then calls existing `printReceipt()`.
- Modal: backdrop overlay, shows last 3 transactions as cards (receipt number, date/time, customer name if any, amount, payment method badge). Each card has a Print button with spinner while loading. Footer has "View all sales →" link (navigates to /sales and closes modal) and a Close button.
- "Sales History" button now opens modal instead of navigating directly.
**Context**: Brownfield enhancement — frontend only, no backend changes.

---

## Feature — POS Billing: Apply Offers from Offers Page
**Timestamp**: 2026-07-08T02:00:00Z
**User Input**: "in pos page billing section provision for giving Offers from the offer page should reflect"
**AI Response**: Adding an "Apply Offer" section in the POS billing/checkout panel. Active offers from the Offers page will load when checkout opens. A banner/selector shows available offers; selecting one auto-fills the discount amount. Applied offer is shown as a badge and can be cleared. Per-product offer prices continue to apply automatically via the existing backend logic.
**Context**: Brownfield enhancement — frontend only (POS.jsx), no schema or backend changes.

---

## Feature — Lazy Load Recent POS Transactions on Accounts Page
**Timestamp**: 2026-07-09T00:00:00Z
**User Input**: "in accounts page lazy laod for Recent POS Transactions"
**AI Response**: Implemented lazy loading for POS transactions in `frontend/src/pages/Accounts.jsx`:
1. Added state: `txPage`, `txPagination`, `txLoading`, `txLoaded`
2. Extracted `loadTransactions(pg)` — dedicated function calling `posApi.getTransactions({ page, limit: 20 })`
3. Added `useEffect` that triggers `loadTransactions(1)` only when the Transactions tab is first opened (`txLoaded` guard prevents repeated loads)
4. Overview card now fetches exactly 8 rows (`limit: 8`) instead of 30 — no slice needed
5. Transactions tab shows spinner while loading, full paginated table after, and standard Prev/Next pagination controls when `txPagination.totalPages > 1`
**Context**: Brownfield enhancement — frontend only (`Accounts.jsx`), no backend changes needed (backend already supports pagination on `/pos/transactions`).

---

## Feature — Lazy Load "Recent POS Transactions" Overview Card
**Timestamp**: 2026-07-09T00:01:00Z
**User Input**: "in accounts page use lazy load on 'Recent POS Transactions' card also"
**AI Response**: Completed the lazy loading for the overview card in `frontend/src/pages/Accounts.jsx`:
1. Added `overviewTxLoading` / `overviewTxLoaded` state for the card
2. Added `loadOverviewTransactions()` — fetches `posApi.getTransactions({ page: 1, limit: 8 })` independently
3. Removed the transactions fetch from `loadData()` entirely — the initial page load no longer fires the POS transactions request at all
4. Added `useEffect` that triggers `loadOverviewTransactions()` when `activeTab === 'overview'` and not yet loaded
5. Overview card now shows a spinner while loading, then rows once ready
**Context**: Brownfield enhancement — frontend only (`Accounts.jsx`), no backend changes.

---

## Feature — Date Selector on Accounts Page (all data date-driven)
**Timestamp**: 2026-07-09T00:02:00Z
**User Input**: "add a date selector near the Accounts (Thursday, 09 July 2026) and all data should come based on this date"
**AI Response**: Added a date selector to the Accounts page header. All data now fetches for the selected date.

Frontend changes (`frontend/src/pages/Accounts.jsx`):
- Added `selectedDate` state (defaults to today's ISO string)
- `shiftDate(delta)` helper for ‹/› prev/next day buttons
- Header: replaced static date label with a date `<input type="date">` + Prev/Next buttons + "Today" shortcut (shown only when not on today)
- Full human-readable date shown below the picker as a subtitle
- `loadData(date)` now accepts a `date` param and passes it to all 5 API calls (no more `todayISO` hardcoding, no more client-side purchase date filtering)
- `loadOverviewTransactions(date)` and `loadTransactions(pg, date)` both accept a `date` param
- Single `useEffect` on `selectedDate` change: calls `loadData`, resets all lazy-load flags, clears transaction state
- Snapshot heading dynamically reads "Today's Snapshot" vs "Snapshot — [date label]"
- Expense Breakdown card heading shows the selected month
- Removed stale `toLocalDate`/`todayExpList`/`todayExpTotal` derived variables

Frontend changes (`frontend/src/api/pos.api.js`):
- `getTodaySummary` now accepts `params` object (passes `{ date }` to backend)

Backend changes (`backend/src/routes/pos.routes.js`):
- `GET /pos/today-summary` now reads `req.query.date` (defaults to `localDateStr()` if not provided), so it can return data for any date
**Context**: Brownfield enhancement — frontend + 1 backend route change.

---
