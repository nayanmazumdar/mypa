# MyPA — Implementation Tasks

## Task 1: Backend — Database Schema Extension
Extend `shopkeeper-backend/src/config/db.js` to add all new tables required by spec1.

Add the following tables inside the existing `db.exec(...)` block in `initDatabase()`:
- `businesses` (id, uuid, user_id FK, name, type, gst_number, logo_url, address, description, website, is_active INTEGER DEFAULT 1, active_until TEXT, created_at, updated_at)
- `credit_transactions` (id, uuid, business_id FK, customer_id FK, type TEXT, amount REAL, note TEXT, bill_photo TEXT, date TEXT, created_at)
- `subscriptions` (id, business_id FK, plan TEXT DEFAULT 'free', active_until TEXT, amount_paid REAL DEFAULT 0, activated_by TEXT, created_at)
- `notifications` (id, user_id FK, title TEXT, message TEXT, type TEXT DEFAULT 'info', is_read INTEGER DEFAULT 0, created_at)
- `audit_logs` (id, user_id TEXT, action TEXT, entity_type TEXT, entity_id TEXT, old_data TEXT, new_data TEXT, ip_address TEXT, created_at)
- `refresh_tokens` (id, user_id FK, token TEXT UNIQUE, expires_at TEXT, created_at)

Also add `business_id` column to `users` table via try/catch ALTER TABLE (same pattern as existing migrations).
Also add `business_id` column to `customers` table if not already present (customers already have user_id; add business_id to link to businesses table via ALTER).
Also add `business_id` column to `products`, `sales`, `purchases`, `inventory`, `stock_movements` tables via ALTER TABLE try/catch.

After schema changes, run `npm run dev` in shopkeeper-backend to verify no startup errors.

### Sub-tasks
- [x] Add `businesses` table to db.exec in db.js
- [x] Add `credit_transactions` table to db.exec in db.js  
- [x] Add `subscriptions` table to db.exec in db.js
- [x] Add `notifications` table to db.exec in db.js
- [x] Add `audit_logs` table to db.exec in db.js
- [x] Add `refresh_tokens` table to db.exec in db.js
- [x] Add ALTER TABLE try/catch blocks for new columns on existing tables (business_id on users, customers, products, sales, purchases, inventory, stock_movements)
- [x] Verify server starts without errors

## Task 2: Backend — Auth Service & Controller Enhancement
Extend the existing auth system in `shopkeeper-backend/src/` to support refresh tokens, forgot-password, and full RBAC roles.

Files to update/create:
- `src/services/auth.service.js` — add `refreshToken()`, `forgotPassword()`, `verifyOtp()`, `resetPassword()`, `logout()` methods
- `src/controllers/auth.controller.js` — add handlers for `refresh`, `forgotPassword`, `verifyOtp`, `resetPassword`, `logout`
- `src/routes/auth.routes.js` — wire up `POST /refresh`, `POST /logout`, `POST /forgot-password`, `POST /verify-otp`, `POST /reset-password`
- `src/validators/auth.validator.js` — add validation rules for new endpoints
- `src/middlewares/auth.middleware.js` — ensure `authenticateJWT` middleware reads Bearer token and attaches `req.user`; add `authorizeRoles(...roles)` middleware factory

Implementation details:
- Refresh token: store in `refresh_tokens` table with expiry; on POST /refresh, validate token, check expiry, issue new access token
- Forgot password: generate 6-digit OTP, store hashed OTP + expiry in `users` table (add otp_code, otp_expires columns via ALTER), log to console in dev (no email service needed yet)
- Role constants in `src/utils/constants.js`: ROLES = { SUPER_ADMIN, ADMIN, BUSINESS_OWNER, STAFF, CUSTOMER }

### Sub-tasks
- [x] Add `otp_code` and `otp_expires` columns to users table via ALTER in db.js
- [x] Implement `refreshToken(token)` in auth.service.js
- [x] Implement `logout(userId, token)` in auth.service.js  
- [x] Implement `forgotPassword(email)` in auth.service.js (generate + store OTP, log to console)
- [x] Implement `verifyOtp(email, otp)` in auth.service.js
- [x] Implement `resetPassword(email, otp, newPassword)` in auth.service.js
- [x] Add all new handlers to auth.controller.js
- [x] Update auth.routes.js with new route registrations
- [x] Create/update auth.middleware.js with `authenticateJWT` and `authorizeRoles`
- [x] Add ROLES constants to utils/constants.js

## Task 3: Backend — Business Controller & Routes
Create business management API in `shopkeeper-backend/src/`.

Create/update:
- `src/services/business.service.js` — CRUD for businesses, dashboard stats, statistics
- `src/controllers/business.controller.js` — request handlers
- `src/routes/business.routes.js` — Express router
- Wire route in `src/app.js` as `app.use('/api/business', businessRoutes)`

Endpoints:
- `GET /api/business` — list (admin: all, business_owner: own)
- `POST /api/business` — create business for logged-in BUSINESS_OWNER
- `GET /api/business/dashboard` — today's sales, collections, outstanding, customer count, subscription status
- `GET /api/business/statistics` — monthly sales chart array, top 5 customers
- `PUT /api/business/:id` — update (owner or admin)
- `DELETE /api/business/:id` — admin only
- `POST /api/admin/approve-business` — set is_active=1
- `POST /api/admin/block-business` — set is_active=0

All routes protected with `authenticateJWT`. Business CRUD requires `authorizeRoles(BUSINESS_OWNER, ADMIN, SUPER_ADMIN)`.

### Sub-tasks
- [x] Create src/services/business.service.js with create, getById, getAll, update, delete, getDashboard, getStatistics
- [x] Create src/controllers/business.controller.js
- [x] Create src/routes/business.routes.js
- [x] Register route in app.js
- [x] Add business ownership check middleware `requireBusinessAccess` in auth.middleware.js

## Task 4: Backend — Customer, Product, Inventory Controllers
Complete the stub controllers and services for customers, products, and inventory.

### Customers (`/api/customers`)
- `src/services/customer.service.js` — create, list (with search), getById, update, delete, getOutstanding, getHistory
- `src/controllers/customer.controller.js`  
- `src/routes/customer.routes.js` — already exists, fill in handlers
- Endpoints: GET, POST, GET/:id, PUT/:id, DELETE/:id, GET/search?q=, GET/:id/history, GET/outstanding

### Products (`/api/products`)
- `src/services/product.service.js` — create, list, getById, update, delete, search
- `src/controllers/product.controller.js` — already exists, complete it
- Categories: GET /api/categories, POST, PUT/:id, DELETE/:id

### Inventory (`/api/inventory`)
- `src/services/inventory.service.js` — getAll (with low-stock filter), adjust, getMovements
- `src/controllers/inventory.controller.js` — already exists, complete it
- Endpoints: GET (with ?low_stock=true), POST /adjust, GET /movements

All routes require `authenticateJWT` + business ownership scoping (filter by req.user business_id).

### Sub-tasks
- [x] Create src/services/customer.service.js with full CRUD + outstanding + history
- [x] Complete src/controllers/customer.controller.js
- [x] Complete src/routes/customer.routes.js
- [x] Create src/services/product.service.js with full CRUD + search
- [x] Complete src/controllers/product.controller.js
- [x] Create src/controllers/category.controller.js
- [x] Complete src/routes/product.routes.js and category.routes.js
- [x] Create src/services/inventory.service.js
- [x] Complete src/controllers/inventory.controller.js
- [x] Complete src/routes/inventory.routes.js

## Task 5: Backend — Sales, Purchases, Payments Controllers
Complete sales, purchases, credit transactions, and payments APIs.

### Sales (`/api/sales`)
- `src/services/sales.service.js` — create (with line items + stock decrement + credit_transaction if credit), list, getById, update status, delete, getToday, getMonthly, getByCustomer
- `src/controllers/sales.controller.js` — already exists, complete
- Sale creation: validate items, insert into `sales` + `sale_items`, decrement `inventory`, if payment_method=credit → insert `credit_transactions` record type=`sale_credit`
- Endpoints: POST, GET, GET/:id, PUT/:id, DELETE/:id, GET/today, GET/monthly, GET/customer/:id

### Purchases (`/api/purchases`)
- `src/services/purchase.service.js` — create (with line items + stock increment), list, getById, update, delete
- `src/controllers/purchase.controller.js` — already exists, complete
- Purchase creation: insert `purchases` + `purchase_items`, increment `inventory`

### Credit & Payments (`/api/credit`, `/api/payments`)
- `src/services/payment.service.js` — recordPayment (insert credit_transaction type=`payment_cash`, update customer balance), listByCustomer, listAll
- Create `src/controllers/payment.controller.js`
- Create `src/routes/payment.routes.js`
- Endpoints: POST /api/payments, GET /api/payments, GET /api/payments/:id, GET /api/payments/customer/:id
- Credit endpoints: GET /api/credit/customer/:id (history), GET /api/credit/outstanding

### Sub-tasks
- [ ] Complete src/services/sales.service.js (create with stock + credit logic)
- [ ] Complete src/controllers/sales.controller.js
- [ ] Complete src/routes/sales.routes.js
- [ ] Create src/services/purchase.service.js (create with stock increment)
- [ ] Complete src/controllers/purchase.controller.js
- [ ] Complete src/routes/purchase.routes.js
- [ ] Create src/services/payment.service.js
- [ ] Create src/controllers/payment.controller.js
- [ ] Create src/routes/payment.routes.js
- [ ] Register payment routes in app.js
- [ ] Add credit routes (GET /api/credit/customer/:id, GET /api/credit/outstanding) to payment.routes.js

## Task 6: Backend — Subscriptions, Notifications, Admin, Reports
Complete the remaining backend modules.

### Subscriptions (`/api/subscriptions`)
- `src/services/subscription.service.js` — getStatus(businessId), activate, extend, revoke, getHistory
- `src/controllers/subscription.controller.js`
- `src/routes/subscription.routes.js`
- Middleware: `checkSubscription` — if business.active_until < now → 403 "Subscription expired"
- Endpoints: GET /status, POST (admin: activate), PUT (admin: extend), GET /history

### Notifications (`/api/notifications`)
- `src/services/notification.service.js` — create, list(userId), markRead, delete
- `src/controllers/notification.controller.js`
- `src/routes/notification.routes.js`
- Endpoints: GET, POST, PUT /read, DELETE /:id

### Reports (`/api/reports`)
- `src/services/report.service.js` — salesReport, customerReport, paymentReport, profitReport, adminReport
- `src/controllers/report.controller.js` — already route file exists, complete it
- Endpoints: GET /sales, GET /customers, GET /payments, GET /outstanding, GET /profit (all accept ?from=&to= date filters)
- Export: GET /export/pdf → JSON data only (actual PDF generation deferred)

### Admin (`/api/admin`)
- `src/services/admin.service.js` — getDashboard, listUsers, listBusinesses, listSubscriptions, getRevenue, getAuditLogs
- `src/controllers/admin.controller.js`
- `src/routes/admin.routes.js`
- Register in app.js: `app.use('/api/admin', adminRoutes)`
- All admin routes require `authorizeRoles(SUPER_ADMIN, ADMIN)`

### Audit Logging
- `src/utils/audit.js` — `logAudit(userId, action, entityType, entityId, oldData, newData, ip)` — inserts into audit_logs table
- Call `logAudit` in create/update/delete handlers for customers, products, sales

### Sub-tasks
- [ ] Create src/services/subscription.service.js and subscription middleware
- [ ] Create src/controllers/subscription.controller.js
- [ ] Create src/routes/subscription.routes.js and register in app.js
- [ ] Create src/services/notification.service.js
- [ ] Create src/controllers/notification.controller.js  
- [ ] Create src/routes/notification.routes.js and register in app.js
- [ ] Complete src/services/report.service.js with all 5 report types
- [ ] Complete src/controllers/report.controller.js
- [ ] Create src/services/admin.service.js
- [ ] Create src/controllers/admin.controller.js
- [ ] Create src/routes/admin.routes.js and register in app.js
- [ ] Create src/utils/audit.js and integrate in key controllers

## Task 7: Frontend — Axios Setup & Redux Store
Set up the frontend API layer and Redux store with all slices.

### Axios (`frontend/src/api/axios.js`)
- Create Axios instance with `baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000'`
- Request interceptor: attach `Authorization: Bearer <token>` from Redux store / localStorage
- Response interceptor: on 401, call `/api/auth/refresh`, update token in store, retry original request; on second 401, dispatch logout

### API files — create/complete all:
- `auth.api.js` — login, register, logout, forgotPassword, verifyOtp, resetPassword, getProfile, updateProfile
- `business.api.js` — getBusiness, createBusiness, updateBusiness, getDashboard, getStatistics
- `customer.api.js` — list, create, getById, update, delete, getHistory, getOutstanding
- `product.api.js` — list, create, getById, update, delete, search; category CRUD
- `inventory.api.js` — list, adjust
- `sales.api.js` — list, create, getById, getToday, getMonthly
- `purchase.api.js` — list, create, getById
- `payment.api.js` — list, create, getByCustomer; credit history
- `subscription.api.js` — getStatus, activate, extend
- `reports.api.js` — sales, customers, payments, outstanding, profit
- `admin.api.js` — dashboard, users, businesses, subscriptions, auditLogs

### Redux Slices (`frontend/src/store/`)
- `authSlice.js` — state: { user, token, refreshToken, isAuthenticated, loading }; actions: login, logout, updateProfile, loadUser; async thunks for login/logout
- `businessSlice.js` — state: { business, dashboard, statistics, loading }; thunks for fetchDashboard, fetchStatistics
- `customerSlice.js` — state: { list, selected, pagination, loading }; CRUD thunks
- `productSlice.js` — state: { list, categories, selected, pagination, loading }; CRUD thunks
- `salesSlice.js` — state: { list, today, monthly, selected, pagination, loading }; CRUD thunks
- `purchaseSlice.js` — state: { list, selected, pagination, loading }; CRUD thunks
- `inventorySlice.js` — state: { list, lowStock, loading }
- `paymentSlice.js` — state: { list, pagination, loading }; CRUD thunks
- `notificationSlice.js` — state: { list, unreadCount, loading }
- `store/index.js` — combine all slices, add redux-persist for auth slice

### Sub-tasks
- [ ] Create/update frontend/src/api/axios.js with interceptors
- [ ] Create/update all 10 API files
- [ ] Create/update authSlice.js with async login/logout thunks + loadUser
- [ ] Create businessSlice.js
- [ ] Create/update customerSlice.js
- [ ] Create/update productSlice.js
- [ ] Create/update salesSlice.js
- [ ] Create/update purchaseSlice.js
- [ ] Create/update inventorySlice.js
- [ ] Create paymentSlice.js
- [ ] Create notificationSlice.js
- [ ] Update store/index.js to combine all slices with redux-persist
- [ ] Create frontend/.env with VITE_API_URL=http://localhost:5000

## Task 8: Frontend — Auth Pages
Build the authentication pages.

### Login (`frontend/src/pages/Login.jsx`)
- Form: email, password inputs with validation
- Submit calls `authSlice` login thunk → on success, redirect to `/dashboard` or `/portal` or `/admin` based on role
- "Forgot password?" link → `/forgot-password`
- Tailwind styled card layout, react-hot-toast for errors

### Register (`frontend/src/pages/Register.jsx`) — new file
- Form: name, email, mobile, password, confirm password, role selector (Business Owner / Customer)
- If BUSINESS_OWNER selected: show extra fields business_name, business_type
- Submit calls register API → auto-login → redirect to dashboard
- Link back to login

### ForgotPassword (`frontend/src/pages/ForgotPassword.jsx`) — new file
- Step 1: email input → POST /api/auth/forgot-password
- Step 2: OTP input (6 digits) → POST /api/auth/verify-otp
- Step 3: new password + confirm → POST /api/auth/reset-password
- Progress indicator showing step 1/2/3

### AuthLayout (`frontend/src/layouts/AuthLayout.jsx`)
- Centered card with MyPA logo/branding
- Outlet for auth pages

### Sub-tasks
- [ ] Update frontend/src/pages/Login.jsx with validation, redux dispatch, role-based redirect
- [ ] Create frontend/src/pages/Register.jsx
- [ ] Create frontend/src/pages/ForgotPassword.jsx (3-step flow)
- [ ] Update frontend/src/layouts/AuthLayout.jsx with proper branding
- [ ] Update frontend/src/router/ProtectedRoute.jsx to check isAuthenticated from redux store
- [ ] Create frontend/src/router/RoleGuard.jsx for role-based route protection

## Task 9: Frontend — Dashboard & Layout Components
Build the shared layout and dashboard page.

### Sidebar (`frontend/src/components/layout/Sidebar.jsx`)
- Role-based navigation:
  - Business roles: Dashboard, Customers, Products, Sales, Purchases, Inventory, Payments, Reports, Subscription, Settings
  - Customer role: Dashboard, Transactions, Statements, Profile
  - Admin roles: Dashboard, Businesses, Users, Subscriptions, Reports, Logs, Settings
- Active route highlighting
- Mobile-responsive (collapsible)
- MyPA logo at top

### Header (`frontend/src/components/layout/Header.jsx`)
- User avatar + name dropdown (Profile, Settings, Logout)
- Notification bell with unread count badge
- Business name display

### DashboardLayout (`frontend/src/layouts/DashboardLayout.jsx`)
- Sidebar + Header + main content Outlet
- Responsive grid layout

### Dashboard (`frontend/src/pages/Dashboard.jsx`)
- For BUSINESS_OWNER/STAFF:
  - Stat cards: Today's Sales (₹), Today's Collections (₹), Outstanding Total (₹), Customer Count
  - Quick Actions: New Sale button, Record Payment button, Add Customer button
  - Sales chart (last 7 days bar chart using CSS/inline SVG or simple div bars — no external chart lib needed)
  - Top 5 customers by outstanding balance table
  - Subscription status badge
- For CUSTOMER role: redirect to `/portal`
- For ADMIN roles: redirect to `/admin`
- Use businessSlice thunks to fetch dashboard data on mount

### Common Components
- `frontend/src/components/common/LoadingSpinner.jsx` — centered spinner
- `frontend/src/components/common/Modal.jsx` — overlay modal with title, children, onClose
- `frontend/src/components/common/Pagination.jsx` — page controls
- `frontend/src/components/common/Badge.jsx` — status badge (active/inactive/expired)
- `frontend/src/components/common/EmptyState.jsx` — empty list placeholder

### Sub-tasks
- [ ] Update frontend/src/components/layout/Sidebar.jsx with role-based nav
- [ ] Update frontend/src/components/layout/Header.jsx with user menu + notifications
- [ ] Update frontend/src/layouts/DashboardLayout.jsx
- [ ] Update frontend/src/pages/Dashboard.jsx with stat cards, chart, quick actions
- [ ] Create frontend/src/components/common/Pagination.jsx
- [ ] Create frontend/src/components/common/Badge.jsx
- [ ] Create frontend/src/components/common/EmptyState.jsx
- [ ] Update frontend/src/router/index.jsx with all routes + role guards

## Task 10: Frontend — Customers, Products, Inventory Pages
Build the business data management pages.

### Customers Page (`frontend/src/pages/Customers.jsx`)
- Table: name, mobile, credit limit, outstanding balance, status, actions
- Search bar (debounced)
- Add Customer modal (form: name, mobile, alternate_mobile, address, occupation, credit_limit)
- Edit Customer modal
- View Customer detail — transaction history table with running balance, Add Transaction modal (type: credit/payment, amount, date, note)
- Activate/Deactivate toggle
- Pagination

### Products Page (`frontend/src/pages/Products.jsx`)
- Table: image thumbnail, name, SKU, category, selling price, stock quantity, status
- Search bar
- Add/Edit Product modal (name, SKU, barcode, category dropdown, purchase_price, selling_price, unit, tax_rate, image upload)
- Delete with confirmation
- Category management tab or modal

### Inventory Page (`frontend/src/pages/Inventory.jsx`)
- Table: product name, SKU, current stock, min level, max level, status (normal/low/critical)
- Filter: all / low stock only
- Stock Adjustment modal: product search, quantity (+/-), reason

### Sub-tasks
- [ ] Update frontend/src/pages/Customers.jsx (full CRUD with transaction modal)
- [ ] Update frontend/src/pages/Products.jsx (full CRUD with image upload, categories)
- [ ] Update frontend/src/pages/Inventory.jsx (list + low-stock filter + adjustment modal)
- [ ] Create frontend/src/components/forms/FormInput.jsx — reusable labeled input
- [ ] Create frontend/src/components/forms/FormSelect.jsx — reusable select

## Task 11: Frontend — Sales, Purchases, Payments Pages
Build the transaction pages.

### Sales Page (`frontend/src/pages/Sales.jsx`)
- List view: invoice number, customer, date, amount, payment status, actions
- Date range filter + search by customer
- New Sale form (modal or full page):
  - Customer search/select (optional for cash)
  - Line items: product search, quantity, unit price (auto-filled from product), discount, line total
  - Payment method: cash/credit/card/UPI
  - Sale date
  - Grand total, tax, discount summary
  - Submit → POST /api/sales
- View Invoice modal: formatted invoice layout with print option

### Purchases Page (`frontend/src/pages/Purchase.jsx`)
- List view: invoice/ref number, supplier, date, amount, status
- New Purchase form: supplier select, line items, payment method, date
- View detail

### Payments Page (new: `frontend/src/pages/Payments.jsx`)
- List payments with filter by customer/date
- Record Payment modal: customer search, amount, date, method, note

### Sub-tasks
- [ ] Update frontend/src/pages/Sales.jsx (list + new sale form with line items)
- [ ] Update frontend/src/pages/Purchase.jsx (list + new purchase form)
- [ ] Create frontend/src/pages/Payments.jsx (list + record payment modal)
- [ ] Update frontend/src/router/index.jsx to include /payments route
- [ ] Create frontend/src/components/tables/DataTable.jsx — reusable sortable table wrapper

## Task 12: Frontend — Customer Portal, Admin Panel, Settings
Build the remaining role-based pages.

### Customer Portal (`frontend/src/pages/CustomerPortal.jsx`) — new file
- Dashboard: outstanding balance card, last payment date
- Transaction history table: date, description, debit, credit, running balance
- Date range filter
- Download Statement button (triggers print/PDF)

### Admin Pages
- `frontend/src/pages/admin/AdminDashboard.jsx` — stat cards: total businesses, users, revenue, subscriptions
- `frontend/src/pages/admin/Businesses.jsx` — list with approve/block buttons
- `frontend/src/pages/admin/Users.jsx` — list with activate/deactivate
- `frontend/src/pages/admin/Subscriptions.jsx` — list with extend/revoke actions
- `frontend/src/pages/admin/AuditLog.jsx` — paginated audit log table

### Settings Page (`frontend/src/pages/Settings.jsx`)
- Tab 1: Profile — name, phone, address, profile photo upload
- Tab 2: Password — current password, new password, confirm
- Tab 3 (Business Owner only): Business Info — name, type, GST, address, logo upload

### Reports Page (new: `frontend/src/pages/Reports.jsx`)
- Tabs: Sales / Customers / Payments / Outstanding / Profit
- Date range picker
- Summary numbers + simple table
- Export button (downloads JSON/CSV)

### Sub-tasks
- [ ] Create frontend/src/pages/CustomerPortal.jsx
- [ ] Create frontend/src/pages/admin/AdminDashboard.jsx
- [ ] Create frontend/src/pages/admin/Businesses.jsx
- [ ] Create frontend/src/pages/admin/Users.jsx
- [ ] Create frontend/src/pages/admin/Subscriptions.jsx
- [ ] Create frontend/src/pages/admin/AuditLog.jsx
- [ ] Update frontend/src/pages/Settings.jsx (3-tab layout)
- [ ] Create frontend/src/pages/Reports.jsx
- [ ] Create frontend/src/pages/Suppliers.jsx (list + add/edit supplier modal)
- [ ] Update frontend/src/router/index.jsx to add all new routes with RoleGuard
