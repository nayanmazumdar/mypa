# MyPA — Requirements

## Project Overview
MyPA (My Personal Accounts) is a credit management SaaS platform connecting businesses (shopkeepers) with their customers. Businesses manage credit ledgers, products, sales, payments and subscriptions. Customers log in to view their own account history, statements and invoices.

## Roles
- **SUPER_ADMIN** — platform owner, manages all businesses, subscriptions, revenue
- **ADMIN** — manages users, approvals, system logs
- **BUSINESS_OWNER** — creates/owns a business, full CRUD on all business data
- **STAFF** — scoped access within one business (sales entry, customer view)
- **CUSTOMER** — read-only access to their own ledger at one or more businesses

---

## R1 — Authentication & Session Management
- R1.1 Users register with name, email, mobile, password, and role (BUSINESS_OWNER or CUSTOMER)
- R1.2 Login returns JWT access token + refresh token; token payload includes id, role, business_id (if applicable)
- R1.3 Refresh token endpoint issues new access tokens without re-login
- R1.4 Logout invalidates refresh token (server-side blacklist or short expiry)
- R1.5 Forgot-password flow sends OTP via email; OTP expires in 10 minutes
- R1.6 Reset-password validates OTP then updates hashed password
- R1.7 Profile GET/PUT for authenticated user

## R2 — Business Management
- R2.1 A BUSINESS_OWNER can register one business (name, type, GST, logo, address)
- R2.2 SUPER_ADMIN can list, approve, block, and delete businesses
- R2.3 Business dashboard returns: today's sales total, today's collections, outstanding total, customer count, subscription status
- R2.4 Business statistics return: monthly sales chart data, top 5 customers by outstanding balance
- R2.5 Each business record has `is_active` flag managed by admin

## R3 — Customer Management (within a business)
- R3.1 BUSINESS_OWNER/STAFF can create customers (name, mobile, alternate_mobile, address, occupation, credit_limit)
- R3.2 Customers can be searched by name or mobile
- R3.3 Customer detail returns: profile, current balance, credit limit, transaction history
- R3.4 Outstanding balance computed live from credit_transactions
- R3.5 Customer account can be activated / deactivated
- R3.6 Customer can set a portal password to access their own ledger (CUSTOMER role)

## R4 — Product Management
- R4.1 Products belong to a business; fields: name, SKU, barcode, category, purchase_price, selling_price, unit, tax_rate, image
- R4.2 Categories can be created, listed, updated, deleted per business
- R4.3 Products can be searched by name or SKU
- R4.4 Low-stock alerts when inventory quantity falls below min_stock_level

## R5 — Sales
- R5.1 Sales entry: customer (optional for cash), list of items (product, qty, unit_price, discount), payment_method, sale_date
- R5.2 Invoice number auto-generated (INV-YYYYMMDD-XXXX)
- R5.3 On sale creation, inventory stock is decremented for each item
- R5.4 Credit sales create a credit_transaction record of type `sale_credit`
- R5.5 List/filter sales by date range, customer, status
- R5.6 Today's sales and monthly sales summary available as separate endpoints

## R6 — Purchases
- R6.1 Purchase entry: supplier (optional), items, payment_method, purchase_date
- R6.2 On purchase creation, inventory stock is incremented for each item
- R6.3 List/filter purchases by date range, supplier, status

## R7 — Payments & Credit Transactions
- R7.1 Record a payment against a customer (type: `payment_cash`)
- R7.2 List all payments or filter by customer
- R7.3 Credit transaction history per customer with running balance
- R7.4 Outstanding balance = sum(sale_credit) − sum(payment_cash) per customer

## R8 — Inventory
- R8.1 Inventory is per product per business (quantity, min_stock_level, max_stock_level)
- R8.2 Stock movements are logged (type: sale, purchase, adjustment, return)
- R8.3 Inventory list supports low-stock filter
- R8.4 Manual stock adjustment endpoint

## R9 — Subscriptions
- R9.1 Businesses have a subscription (plan, active_until date)
- R9.2 ADMIN/SUPER_ADMIN can activate, extend, or revoke subscriptions
- R9.3 A middleware check blocks business API access if subscription is expired
- R9.4 Subscription history log per business

## R10 — Reports
- R10.1 Sales report: total revenue, units sold, by product/category, date range
- R10.2 Customer report: outstanding amounts, payment history, credit utilisation
- R10.3 Payment report: collections by date, method, customer
- R10.4 Profit report: revenue − purchase cost over date range
- R10.5 Admin-level: all-businesses revenue summary, subscription revenue
- R10.6 PDF and Excel export for each report

## R11 — Notifications
- R11.1 System can create notifications per user (in-app)
- R11.2 User can list unread/all notifications
- R11.3 Mark notification(s) as read
- R11.4 Delete notification

## R12 — Admin Panel (SUPER_ADMIN / ADMIN)
- R12.1 Admin dashboard: total businesses, users, subscriptions, revenue
- R12.2 User management: list, activate/deactivate users
- R12.3 Business management: list, approve, block businesses
- R12.4 Audit log: every create/update/delete/login event recorded
- R12.5 System logs accessible to admin

## R13 — File Uploads
- R13.1 Profile photo, product image, business logo uploadable via multipart form
- R13.2 Files stored in `uploads/` with UUID filenames
- R13.3 Delete upload by id

## R14 — Frontend — Authentication Pages
- R14.1 Login page with email/password, JWT stored in localStorage/redux-persist
- R14.2 Register page for BUSINESS_OWNER and CUSTOMER
- R14.3 Forgot-password OTP flow (3-step: email entry → OTP verify → new password)
- R14.4 Auto-redirect to role-based dashboard after login

## R15 — Frontend — Business Dashboard
- R15.1 Dashboard cards: today's sales, today's collections, outstanding total, customer count
- R15.2 Quick action buttons: new sale, record payment, add customer
- R15.3 Charts: monthly sales bar chart, top customers pie/bar
- R15.4 Subscription status badge (active / expired / days remaining)

## R16 — Frontend — Business Modules
- R16.1 Customers page: list with search, add/edit/deactivate, view detail with transaction history
- R16.2 Products page: list with search, add/edit/delete, image upload
- R16.3 Sales page: list with filters, new sale form with line items, invoice view
- R16.4 Purchases page: list with filters, new purchase form
- R16.5 Inventory page: list with low-stock highlight, stock adjustment
- R16.6 Payments page: record payment, list by customer/date

## R17 — Frontend — Customer Portal
- R17.1 Customer dashboard: outstanding balance, last payment date
- R17.2 Transaction history table with running balance
- R17.3 Download PDF statement

## R18 — Frontend — Admin Panel
- R18.1 Admin dashboard with all-business statistics
- R18.2 Business list with approve/block actions
- R18.3 User list with activate/deactivate actions
- R18.4 Subscription management
- R18.5 Audit log viewer

## R19 — Frontend — Settings
- R19.1 Profile update (name, phone, address, photo)
- R19.2 Password change
- R19.3 Business settings (business info, logo)

## R20 — Cross-cutting
- R20.1 All API responses follow `{ success, message, data, pagination? }` envelope
- R20.2 Input validation on all endpoints (express-validator)
- R20.3 RBAC middleware checks role + business ownership on every protected route
- R20.4 Pagination on all list endpoints (page, limit, total)
- R20.5 CORS configured for frontend origin
- R20.6 Helmet, compression, Morgan logging on all requests
- R20.7 Swagger/OpenAPI documentation on `/api-docs`
