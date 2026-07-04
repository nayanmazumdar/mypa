# MyPA — Design

## Architecture

```
React Frontend (Vite + Redux Toolkit)
       │  Axios + JWT Bearer token
       ▼
Express REST API  (shopkeeper-backend/)
       │
  RBAC Middleware
       │
  Service Layer
       │
Repository Layer
       │
SQLite (better-sqlite3)   ← primary for now, MySQL-ready
```

Both projects live in the same monorepo root:
- `shopkeeper-backend/` — Node/Express REST API
- `frontend/` — React 19 Vite SPA

---

## Backend Design

### Technology
- Node.js + Express 4
- better-sqlite3 (SQLite, WAL mode) — already wired in `config/db.js`
- bcryptjs, jsonwebtoken, express-validator, multer, swagger-jsdoc, winston

### Folder Structure (existing — extend, not replace)
```
shopkeeper-backend/src/
  config/          db.js, env.js, logger.js, swagger.js
  controllers/     one class per domain
  services/        business logic
  repositories/    sqlite/ queries
  models/          schema constants (no ORM)
  routes/          Express routers
  middlewares/     auth, rbac, validate, error, upload
  validators/      express-validator rule arrays
  utils/           response.js, pagination.js, jwt.js, hash.js, helper.js
  database/
    migrations/    001_init.sql (expand with new tables)
    sqlite/        shop.db
```

### New tables to add (via migration / db.exec in db.js)
- `businesses` — business profile per user
- `credit_transactions` — customer ledger entries
- `subscriptions` — per-business plan + active_until
- `notifications` — in-app notifications
- `audit_logs` — every create/update/delete event
- `refresh_tokens` — token blacklist / management

### RBAC
Roles stored in `users.role`: `super_admin`, `admin`, `business_owner`, `staff`, `customer`

Middleware chain per route:
1. `authenticateJWT` — decode + attach `req.user`
2. `authorizeRoles(...roles)` — check `req.user.role`
3. `authorizeBusinessAccess` — for business-scoped routes, check `req.user.business_id === resource.business_id`

### API Response Envelope
```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

---

## Frontend Design

### Technology
- React 19, Vite, TypeScript (already configured)
- Redux Toolkit + redux-persist (localStorage)
- React Router DOM v7
- Axios with JWT interceptors (auto-attach Bearer, auto-refresh on 401)
- Tailwind CSS v4
- react-hot-toast, react-icons

### Folder Structure (extend existing)
```
frontend/src/
  api/             one file per domain (axios instance + typed calls)
  store/           Redux slices (auth, business, customers, products, sales, ...)
  components/
    common/        Modal, LoadingSpinner, Pagination, Badge, EmptyState
    forms/         FormInput, FormSelect, FormTextarea
    tables/        DataTable
    charts/        SalesChart, OutstandingChart
    layout/        Header, Sidebar
  layouts/         DashboardLayout, AuthLayout
  pages/
    Login, Register, ForgotPassword
    Dashboard, Customers, Products, Sales, Purchase, Inventory, Payments
    CustomerPortal
    admin/         AdminDashboard, Businesses, Users, Subscriptions, AuditLog
    Settings
    NotFound
  router/          index.jsx, ProtectedRoute.jsx, RoleGuard.jsx
  hooks/           useAuth, useDebounce, usePagination
  utils/           formatCurrency, formatDate, downloadFile
  constants/       roles, apiPaths
```

### Auth Flow
1. Login → POST /api/auth/login → store `{ token, user }` in Redux (persisted)
2. Axios interceptor adds `Authorization: Bearer <token>` to every request
3. On 401 → call POST /api/auth/refresh → retry; if refresh fails → logout
4. ProtectedRoute checks `store.auth.isAuthenticated`
5. RoleGuard checks `store.auth.user.role` against allowed roles

### Role-based Routing
| Path | Allowed Roles |
|------|--------------|
| /dashboard | business_owner, staff |
| /customers | business_owner, staff |
| /products | business_owner, staff |
| /sales | business_owner, staff |
| /purchases | business_owner, staff |
| /inventory | business_owner, staff |
| /payments | business_owner, staff |
| /portal/* | customer |
| /admin/* | super_admin, admin |
| /settings | all authenticated |

---

## Key Data Models

### users
```
id, uuid, name, email, phone, password, role,
business_id (FK), is_active, created_at, updated_at
```

### businesses
```
id, uuid, user_id (FK), name, type, gst_number,
logo_url, address, is_active, active_until, created_at
```

### products
```
id, uuid, user_id, business_id, category_id,
name, sku, barcode, purchase_price, selling_price,
unit, tax_rate, image_url, is_active
```

### sales + sale_items
```
sales: id, uuid, business_id, customer_id, invoice_number,
       total_amount, discount, tax_amount, net_amount,
       payment_status, payment_method, status, sale_date

sale_items: id, sale_id, product_id, quantity, unit_price, discount, total
```

### credit_transactions
```
id, uuid, business_id, customer_id, type (sale_credit|payment_cash),
amount, note, bill_photo, date, created_at
```

### subscriptions
```
id, business_id, plan (free|basic|premium),
active_until, amount_paid, activated_by, created_at
```

### notifications
```
id, user_id, title, message, type, is_read, created_at
```

### audit_logs
```
id, user_id, action, entity_type, entity_id,
old_data (JSON), new_data (JSON), ip_address, created_at
```
