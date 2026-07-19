# MyPA — My Personal Assistant

A full-stack SaaS platform for small business owners (shopkeepers) and individuals. Manage multiple shops with POS billing, inventory, sales, purchases, customers, staff, subscriptions, and a standalone personal finance module — all from one app.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation (Step by Step)](#installation-step-by-step)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Demo Accounts](#demo-accounts)
- [Seeded Demo Data](#seeded-demo-data)
- [Environment Variables](#environment-variables)
- [Authentication & Authorization](#authentication--authorization)
- [Features (Business Module)](#features-business-module)
- [Features (Individual Module)](#features-individual-module)
- [Features (Admin Panel)](#features-admin-panel)
- [API Reference](#api-reference)
- [Frontend Apps](#frontend-apps)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Scripts Reference](#scripts-reference)

---

## Overview

MyPA serves two user personas from a single platform:

1. **Business Owner / Shopkeeper** — Manage one or more shops with POS, inventory, sales, purchases, customers, suppliers, expenses, staff attendance, subscription plans, and reporting.
2. **Individual** — Personal finance management with income/expense tracking, budgets, tasks, notes, and shopping lists.

Users choose their role on first login. Business users are divided into `admin` (owner), `manager`, and `staff` with dynamic RBAC (Role-Based Access Control) permissions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
├───────────────────────┬─────────────────────────────────┤
│   frontend/ (React)   │   individual/ (React standalone) │
│   Shop + Admin Panel  │   Personal finance app           │
└───────────┬───────────┴──────────────┬──────────────────┘
            │         REST API          │
            ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                   backend/ (Express.js)                  │
│                                                         │
│  Auth → RBAC → Multi-Shop → Subscriptions → POS        │
│  Inventory → Sales → Purchases → Reports → Notifs      │
│  Individual → Budgets → Tasks → Notes                   │
│                                                         │
└───────────────────────┬─────────────────────────────────┘
                        │
              ┌─────────▼─────────┐
              │  MySQL (Primary)  │
              │  SQLite (Offline) │
              └───────────────────┘
```

- **Monorepo**: `backend/`, `frontend/`, `individual/`
- In production, backend serves frontend's built static files (single port)
- Real-time updates via Server-Sent Events (SSE)
- Multi-stage Docker build for deployment

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20, Express.js 4.21 |
| Database | MySQL 8 (primary), SQLite (offline fallback) |
| Auth | JWT (7-day tokens), bcryptjs |
| Frontend | React 19, Vite 8, TailwindCSS 4 |
| State | Redux Toolkit, React-Redux |
| Routing | React Router DOM 7 |
| Charts | Highcharts |
| PDF/Export | jsPDF, jspdf-autotable, ExcelJS, xlsx |
| Notifications | Nodemailer (SMTP), WhatsApp API, SMS API |
| Security | Helmet, express-rate-limit, hpp, CORS |
| PWA | vite-plugin-pwa (offline support) |
| API Docs | Swagger UI (swagger-jsdoc) |
| Testing | Jest, Supertest |
| Container | Docker (Node 20 Alpine, multi-stage) |

---

## Project Structure

```
mypa/
├── backend/                    # Express.js REST API
│   ├── src/
│   │   ├── app.js             # Express app (middleware + routes)
│   │   ├── server.js          # Entry point — starts HTTP server
│   │   ├── config/            # DB pools, env, logger, swagger
│   │   ├── controllers/       # Request handlers (12 controllers)
│   │   ├── services/          # Business logic (auth, rbac, subscription, etc.)
│   │   ├── routes/            # 30+ route modules
│   │   ├── middlewares/       # Auth, validation, error, subscription guard
│   │   ├── validators/        # express-validator schemas
│   │   ├── database/
│   │   │   ├── migrations/    # 30 sequential SQL files (001–030)
│   │   │   ├── migrate.js     # Migration runner (changeset tracked)
│   │   │   ├── seed.js        # Seeds 2 users, 1 shop, products, etc.
│   │   │   └── seed-bulk.js   # Bulk data for load testing
│   │   └── utils/             # JWT, pagination, response helpers
│   ├── uploads/               # User-uploaded files
│   ├── logs/                  # Winston logs (combined + error)
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # Main React SPA
│   ├── src/
│   │   ├── api/               # Axios API clients (one per module)
│   │   ├── components/        # Reusable UI (modals, tables, forms)
│   │   ├── hooks/             # usePermission, useSubscription, etc.
│   │   ├── layouts/           # DashboardLayout, AdminLayout, IndividualLayout
│   │   ├── pages/             # All page components
│   │   │   ├── admin/         # AdminUsers, AdminShops, AdminRoles, etc.
│   │   │   └── individual/    # PersonalExpenses, PersonalBudget, etc.
│   │   ├── router/            # Routes + guards (ProtectedRoute, PermissionRoute)
│   │   ├── store/             # Redux slices (auth, products, sales, etc.)
│   │   └── utils/             # permissions.js, formatters
│   └── package.json
│
├── individual/                 # Standalone personal finance app
│   ├── src/
│   └── package.json
│
├── Dockerfile                  # Multi-stage production build
└── .dockerignore
```

---

## Prerequisites

Before you begin, make sure you have:

| Tool | Version | Check |
|------|---------|-------|
| Node.js | >= 20.x | `node --version` |
| npm | >= 9.x | `npm --version` |
| MySQL | >= 8.0 | `mysql --version` |
| Git | any | `git --version` |

Make sure MySQL server is **running** before proceeding:
```bash
# macOS (Homebrew)
brew services start mysql

# Linux (systemd)
sudo systemctl start mysql

# Verify it's running
mysql -u root -p -e "SELECT 1"
```

---

## Installation (Step by Step)

### Step 1: Clone the repository

```bash
git clone <your-repo-url> mypa
cd mypa
```

### Step 2: Install backend dependencies

```bash
cd backend
npm install
```

### Step 3: Configure environment

```bash
cp .env.example .env
```

Now edit `backend/.env` with your MySQL credentials:

```env
PORT=3000
NODE_ENV=development

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=YOUR_MYSQL_PASSWORD
MYSQL_DATABASE=shopkeeper_db

JWT_SECRET=pick_a_long_random_string_here
JWT_EXPIRES_IN=7d
```

### Step 4: Create database and run migrations

```bash
npm run migrate
```

**What this does:**
- Creates the `shopkeeper_db` database if it doesn't exist
- Creates a `migration_history` table to track applied migrations
- Runs all 30 pending migration files in order
- Creates tables: users, shops, products, sales, purchases, inventory, customers, suppliers, POS, expenses, subscriptions, RBAC, notifications, attendance, and more
- Seeds default subscription plans (Free, Starter, Pro, Enterprise)
- Seeds RBAC features (20 features across 5 categories)
- Seeds default RBAC roles (Cashier, Store Manager, Inventory Clerk, Sales Executive, Accountant)

**Output looks like:**
```
✓ Connected to MySQL server
✓ Database "shopkeeper_db" created/verified

Running 30 pending migration(s)...

  ✓ 001_init
  ✓ 002_pos_module
  ✓ 003_multi_tenant
  ... (etc)
  ✓ 030_seed_default_roles

✓ Migration complete: 30 applied
```

### Step 5: Seed demo data

```bash
npm run seed
```

**What this creates:**
- 2 user accounts (admin + shopkeeper)
- 2 shops (Admin Shop + Demo General Store)
- 7 product categories (Groceries, Beverages, Snacks, Personal Care, Dairy, Stationery, Household)
- 20 products with SKUs (Indian FMCG items like Tata Salt, Amul Milk, Lays, etc.)
- Inventory records with stock levels and min-stock alerts
- 5 customers with balances
- 4 suppliers with company details
- 5 sample sales with line items
- 3 sample purchases with line items
- 6 payment records

**Output:**
```
✓ Connected to MySQL
Seeding users...   ✓ 2 users seeded
Seeding shop...    ✓ Shops created
Seeding categories... ✓ 7 categories seeded
Seeding products... ✓ 20 products seeded
Seeding inventory... ✓ 20 inventory records seeded
Seeding customers... ✓ 5 customers seeded
Seeding suppliers... ✓ 4 suppliers seeded
Seeding sales...   ✓ 5 sales seeded
Seeding purchases... ✓ 3 purchases seeded
Seeding payments... ✓ 6 payments seeded

✅ Seeding completed successfully!
```

### Step 6: Install frontend dependencies

```bash
cd ../frontend
npm install
```

### Step 7: Start the application

You need **two terminals**:

**Terminal 1 — Backend (port 3000):**
```bash
cd backend
npm run dev
```

Output:
```
✅ MyPA Backend running on http://localhost:3000
📖 Swagger docs: http://localhost:3000/api-docs
🗄️  Database: MySQL
```

**Terminal 2 — Frontend (port 5173):**
```bash
cd frontend
npm run dev
```

Output:
```
  VITE v8.x.x  ready in 500ms
  ➜  Local:   http://localhost:5173/
```

### Step 8: Open in browser

Go to **http://localhost:5173** — you'll see the landing page. Click "Login" to sign in.

---

## Demo Accounts

After running `npm run seed`, these accounts are available:

| Role | Email | Password | What you can do |
|------|-------|----------|-----------------|
| **Admin** | `admin@shopkeeper.com` | `admin123` | Full access — admin panel, subscription, shops, users, roles, all features |
| **Shopkeeper** | `demo@shopkeeper.com` | `demo1234` | Full access — owns "Demo General Store" with 20 products, customers, sales |

### Login Flow

1. Go to http://localhost:5173/login
2. Enter email and password
3. If first time: choose role (Admin / Individual)
4. Admin → redirects to admin panel (shop management)
5. Select a shop → enters the shop dashboard with POS, products, etc.

### Creating Additional Test Users

From the admin panel (`/admin/users`), you can create staff accounts:
- Go to Admin Panel → Users → Create User
- Set role to "staff"
- Assign RBAC roles (Cashier, Store Manager, etc.)
- Assign to a shop
- They can now log in with restricted access based on their role

---

## Seeded Demo Data

### Products (20 items)

| SKU | Product | Category | Purchase ₹ | Selling ₹ |
|-----|---------|----------|-----------|-----------|
| SKU-001 | Tata Salt 1kg | Groceries | 18 | 25 |
| SKU-002 | Aashirvaad Atta 5kg | Groceries | 210 | 280 |
| SKU-003 | Fortune Sunflower Oil 1L | Groceries | 120 | 155 |
| SKU-004 | Toor Dal 1kg | Groceries | 110 | 140 |
| SKU-005 | Basmati Rice 5kg | Groceries | 350 | 450 |
| SKU-006 | Coca-Cola 2L | Beverages | 72 | 95 |
| SKU-007 | Parle Frooti 600ml | Beverages | 25 | 35 |
| SKU-008 | Red Bull 250ml | Beverages | 95 | 125 |
| SKU-009 | Bisleri Water 1L | Beverages | 15 | 20 |
| SKU-010 | Lays Classic Salted | Snacks | 15 | 20 |
| SKU-011 | Kurkure Masala Munch | Snacks | 15 | 20 |
| SKU-012 | Haldiram Namkeen 200g | Snacks | 40 | 55 |
| SKU-013 | Dove Soap 100g | Personal Care | 42 | 58 |
| SKU-014 | Head & Shoulders 180ml | Personal Care | 155 | 199 |
| SKU-015 | Colgate MaxFresh 150g | Personal Care | 85 | 110 |
| SKU-016 | Amul Milk 500ml | Dairy | 24 | 30 |
| SKU-017 | Amul Butter 100g | Dairy | 48 | 57 |
| SKU-018 | Mother Dairy Curd 400g | Dairy | 35 | 45 |
| SKU-019 | Maggi Noodles (4 pack) | Groceries | 48 | 56 |
| SKU-020 | Sugar 1kg | Groceries | 38 | 48 |

### Subscription Plans

| Plan | Monthly | Quarterly | Yearly | Products | Staff | Sales/mo |
|------|---------|-----------|--------|----------|-------|----------|
| Free | ₹0 | ₹0 | ₹0 | 50 | 1 | 200 |
| Starter | ₹199 | ₹499 | ₹1,799 | 200 | 3 | 1,000 |
| Pro | ₹499 | ₹1,299 | ₹4,799 | ∞ | 10 | ∞ |
| Enterprise | ₹999 | ₹2,499 | ₹8,999 | ∞ | ∞ | ∞ |

### Default RBAC Roles

| Role | Can Use | Access Level |
|------|---------|--------------|
| **Cashier** | POS, Sales, Payments, Invoices, Customers | Full write on POS/Sales. Read-only on products, inventory, offers |
| **Store Manager** | All non-admin features | Full read/write/execute on everything |
| **Inventory Clerk** | Products, Categories, Inventory, Purchases, Suppliers | Full write. Read-only on sales, dashboard |
| **Sales Executive** | Sales, Customers, POS, Payments, Offers, Customer Ledger | Full write. Read-only on products, inventory |
| **Accountant** | Expenses, Payments, Customer Ledger, Reports, Invoices | Full write on finances. Read-only on sales, purchases |

---

## Database Setup

### Migration System (Changeset Tracked)

The project uses a **changeset-tracked migration system**. A `migration_history` table records which migrations have already been applied — only pending ones run.

```bash
# Run pending migrations only (normal usage)
npm run migrate

# Check which migrations are applied vs pending
node src/database/migrate.js --status

# Force re-run all (safe — idempotent statements)
node src/database/migrate.js --force
```

**Migration status output:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Migration Status                                               │
├──────────────────────────────────┬──────────┬───────────────────┤
│  Migration                       │  Status  │  Applied At       │
├──────────────────────────────────┼──────────┼───────────────────┤
│  001_init                        │  ✓ Done  │  2026-07-19 10:00 │
│  002_pos_module                  │  ✓ Done  │  2026-07-19 10:00 │
│  ...                             │          │                   │
│  030_seed_default_roles          │  ○ Pend  │  —                │
└──────────────────────────────────┴──────────┴───────────────────┘
```

**How it works:**
- Each migration file gets an MD5 checksum stored in `migration_history`
- On first run against an existing database (with tables but no history), it auto-backfills — marking all existing migrations as "applied"
- All SQL statements use `CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`, etc. so they're idempotent
- New migrations (e.g., when you `git pull`) are detected and applied automatically

### Migration History Table Schema

```sql
migration_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  filename      VARCHAR(255) UNIQUE,    -- e.g., "030_seed_default_roles.sql"
  checksum      VARCHAR(64),            -- MD5 hash of file content
  executed_at   TIMESTAMP,              -- when it was applied
  execution_ms  INT,                    -- how long it took
  status        ENUM('success','failed'),
  statements    INT,                    -- SQL statements executed
  skipped       INT                     -- statements skipped (duplicate, etc.)
)
```

### Seeding Commands

| Command | What it does |
|---------|-------------|
| `npm run seed` | Creates 2 accounts, 1 shop, 20 products, 5 customers, 4 suppliers, sample sales/purchases |
| `npm run seed:bulk` | Adds bulk data (hundreds of records) for performance testing |
| `npm run db:setup` | Runs `migrate` + `seed` in one command |
| `npm run db:full` | Runs `migrate` + `seed` + `seed:bulk` |

### Resetting the Database

```bash
# Drop and recreate everything
mysql -u root -p -e "DROP DATABASE shopkeeper_db"
npm run db:setup
```

---

## Running the Application

### Development Mode (Recommended for Development)

```bash
# Terminal 1: Backend with auto-reload
cd backend
npm run dev
# → http://localhost:3000 (API)
# → http://localhost:3000/api-docs (Swagger)

# Terminal 2: Frontend with HMR
cd frontend
npm run dev
# → http://localhost:5173 (UI)
```

### Production Mode (Single Port)

```bash
# Build the frontend
cd frontend
npm run build

# Start backend in production (serves frontend from /frontend/dist)
cd ../backend
NODE_ENV=production npm start
# → http://localhost:3000 (everything on one port)
```

### Individual App (Optional)

```bash
cd individual
npm install
npm run dev
# → http://localhost:5174 (standalone personal finance app)
```

### Quick Start (One-liner)

```bash
# From project root — setup + seed + start
cd backend && npm install && npm run db:setup && npm run dev
```

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# ─── Server ────────────────────────────────────────
PORT=3000                              # API port (default 3000)
NODE_ENV=development                   # development | production

# ─── MySQL ─────────────────────────────────────────
MYSQL_HOST=localhost                    # MySQL server host
MYSQL_PORT=3306                        # MySQL port
MYSQL_USER=root                        # MySQL username
MYSQL_PASSWORD=your_password_here      # MySQL password
MYSQL_DATABASE=shopkeeper_db           # Database name (auto-created by migrate)

# ─── JWT ───────────────────────────────────────────
JWT_SECRET=change_this_to_a_secure_random_string   # Token signing secret
JWT_EXPIRES_IN=7d                      # Token expiry (7 days)

# ─── Frontend (production CORS) ────────────────────
FRONTEND_URL=http://localhost:5173     # Allowed CORS origin in production
```

**Note:** In development, CORS allows all origins. In production, only `FRONTEND_URL` is allowed.

---

## Authentication & Authorization

### How Login Works

1. User sends `POST /api/auth/login` with email + password
2. Server verifies credentials, resolves RBAC permissions
3. Returns a JWT token containing: `id`, `uuid`, `email`, `role`, `shop_id`, `rbac_roles`, `rbac_perms`
4. Frontend stores token in localStorage
5. Every API request includes `Authorization: Bearer <token>`
6. Token expires after 7 days → user must re-login

### Role Hierarchy

| Role | Who | Access |
|------|-----|--------|
| `admin` | Business owner | Full access. Admin panel, subscription, all shops, all users |
| `manager` | Shop manager | Day-to-day operations in assigned shops (legacy static role) |
| `staff` | Shop employee | Limited access based on assigned RBAC roles |
| `individual` | Personal user | Only personal finance module (expenses, budgets, tasks) |

### Dynamic RBAC System

The RBAC system has 4 layers:

```
Features (20 capabilities like "products", "pos", "sales")
    ↓
Roles (named bundles like "Cashier", "Store Manager")
    ↓
Role-Permissions (which features each role can read/write/execute)
    ↓
User-Roles (which roles are assigned to each user)
```

**Permission format:** `<feature_slug>:<action>`

| Action | Maps to | Examples |
|--------|---------|----------|
| `read` | `can_read` | `products:read`, `sales:read` |
| `create` | `can_write` | `products:create`, `customers:create` |
| `update` | `can_write` | `sales:update` |
| `delete` | `can_write` | `products:delete` |
| `checkout` | `can_execute` | `pos:checkout` |
| `adjust` | `can_execute` | `inventory:adjust` |

**Resolution order:**
1. Admin role → always has full access (bypasses RBAC)
2. Dynamic RBAC → check `rbac_perms` embedded in JWT
3. Static fallback → legacy hardcoded role→permission map

### RBAC Features (20 total)

| Category | Features |
|----------|----------|
| Sales & Billing | pos, sales, invoices, payments |
| Inventory | products, categories, inventory, purchases, suppliers |
| Customers | customers, customer_ledger |
| Finance | expenses, reports |
| Marketing | offers |
| General | dashboard |
| Admin (hidden) | shop_settings, user_management, subscriptions, export_import, attendance |

---

## Features (Business Module)

### Multi-Shop Management
- Admin can own multiple shops
- Staff assigned per-shop with different roles
- Switch shops without re-login (token refreshed)
- Each shop has its own products, inventory, customers, sales

### POS Terminal
- Full-screen point-of-sale interface
- Product search by name, SKU, or barcode
- Cart management with quantity adjustments
- Split payments (cash + UPI + card + credit)
- Hold/park bills and resume later
- Receipt generation with receipt number
- Real-time stock updates via SSE
- Permission-gated checkout (`pos:checkout`)

### Products & Categories
- Product catalog with name, SKU, description, images
- Purchase price, selling price, tax rate, unit
- Category-based organization (7 default categories)
- Active/inactive status
- Low-stock alerts

### Sales Management
- Create sales orders with line items
- Invoice number auto-generation
- Payment tracking (paid/unpaid)
- Payment methods: cash, UPI, card, bank transfer
- Sale status: completed, pending, cancelled
- Returns/refunds support

### Purchase Orders
- Track purchases from suppliers
- Purchase items with quantity and unit price
- Paid amount vs due amount (supplier credit)
- Payment status tracking

### Inventory
- Real-time stock levels per product per shop
- Auto-deduction on POS sale
- Manual stock adjustments (with reason)
- Min/max stock level alerts
- Stock movement history

### Customers
- Customer directory with contact details
- Credit/debit ledger (customer owes money)
- Payment history
- Balance tracking

### Suppliers
- Supplier directory with company, GST, contact
- Purchase history per supplier
- Balance/credit tracking

### Offers & Discounts
- Create percentage or flat-amount offers
- Date-based validity (start/end)
- Auto-applied in POS when valid
- Pause/resume offers

### Expenses
- Track business expenses by category
- Date, amount, description, payment method

### Reports & Analytics
- Sales reports (daily/weekly/monthly)
- Purchase reports
- Profit margins
- Expense breakdown
- Charts via Highcharts

### Invoices
- Auto-generated from sales
- PDF export
- Custom branding (Pro plan feature)

### Staff Attendance
- Daily check-in / check-out per shop
- Admin view across all shops
- Attendance history

### Export/Import
- Excel export for products, sales, purchases, customers, suppliers
- PDF export for invoices and reports

### Notifications
- Email notifications (SMTP via Nodemailer)
- WhatsApp API integration
- SMS notifications
- Configurable templates per shop
- Notification logs

### Subscription & Billing
- 4 plan tiers: Free, Starter, Pro, Enterprise
- Monthly / quarterly / yearly billing cycles
- Feature gating (reports, offers, invoice branding, priority support)
- Usage limits (products, staff, customers, monthly sales)
- Admin-only plan management

---

## Features (Individual Module)

Accessible at `/individual/*` routes for users who chose the "individual" role.

| Feature | Description |
|---------|-------------|
| **Dashboard** | Monthly income vs expense summary, recent transactions |
| **Expenses** | Track spending by category (Food, Transport, Education, etc.) |
| **Income** | Record income from multiple sources |
| **Budgets** | Set monthly budgets per category, track usage |
| **Tasks** | Personal to-do list with due dates, recurrence, priority |
| **Notes** | Quick notes with categories and visibility |
| **Shopping List** | Lists with item check-off |
| **Reports** | Monthly/yearly financial summaries with charts |

---

## Features (Admin Panel)

Accessible at `/admin/*` routes for admin users only.

| Feature | Route | Description |
|---------|-------|-------------|
| **Overview** | `/admin/overview` | Cross-shop revenue, total sales, performance KPIs |
| **Shops** | `/admin/shops` | Create/edit shops, assign staff, open/close status |
| **Users** | `/admin/users` | Create users, assign roles, enable/disable accounts |
| **Roles** | `/admin/roles` | Create custom RBAC roles, manage permission matrix |
| **Staff Activity** | `/admin/staff-activity` | Login history, actions per staff member |
| **Attendance** | `/admin/attendance` | View attendance across all shops |
| **Logs** | `/admin/logs` | Login/logout audit trail |
| **Notifications** | `/admin/notifications` | Configure email/WhatsApp/SMS settings |
| **Subscription** | `/admin/subscription` | Plan selection, billing, usage meters |
| **Settings** | `/admin/settings` | Business settings |

---

## API Reference

**Base URL:** `http://localhost:3000/api`

**Swagger Docs:** `http://localhost:3000/api-docs`

**Health Check:** `GET /api/health` → `{ status: "ok", timestamp: "...", env: "development" }`

### Endpoints by Module

| Module | Method | Endpoint | Auth | Description |
|--------|--------|----------|------|-------------|
| **Auth** | POST | `/auth/register` | No | Create account |
| | POST | `/auth/login` | No | Get JWT token |
| | GET | `/auth/profile` | Yes | Current user profile + shops |
| | POST | `/auth/switch-shop` | Yes | Switch active shop |
| | GET | `/auth/all-users` | Admin | List all users |
| **Products** | GET | `/products` | Yes | List (paginated, filterable) |
| | POST | `/products` | Yes | Create product |
| | PUT | `/products/:id` | Yes | Update product |
| | DELETE | `/products/:id` | Yes | Delete product |
| **Categories** | GET | `/categories` | Yes | List all |
| | POST | `/categories` | Yes | Create |
| | PUT | `/categories/:id` | Yes | Update |
| | DELETE | `/categories/:id` | Yes | Delete |
| **Sales** | GET | `/sales` | Yes | List (with filters) |
| | POST | `/sales` | Yes | Create sale + items |
| | PUT | `/sales/:id` | Yes | Update |
| | DELETE | `/sales/:id` | Yes | Cancel |
| **Purchases** | GET | `/purchases` | Yes | List |
| | POST | `/purchases` | Yes | Create purchase + items |
| **POS** | GET | `/pos/products` | Yes | Products with stock + offers |
| | POST | `/pos/checkout` | Yes | Process POS transaction |
| | GET | `/pos/transactions` | Yes | Transaction history |
| **Inventory** | GET | `/inventory` | Yes | Stock levels |
| | POST | `/inventory/adjust` | Yes | Manual adjustment |
| **Customers** | GET | `/customers` | Yes | List |
| | POST | `/customers` | Yes | Create |
| **Suppliers** | GET | `/suppliers` | Yes | List |
| | POST | `/suppliers` | Yes | Create |
| **Customer Ledger** | GET | `/customer-ledger/:id` | Yes | Ledger entries |
| | POST | `/customer-ledger` | Yes | Add entry |
| **Expenses** | GET | `/expenses` | Yes | List |
| | POST | `/expenses` | Yes | Create |
| **Payments** | GET | `/payments` | Yes | List |
| | POST | `/payments` | Yes | Record payment |
| **Reports** | GET | `/reports/sales` | Yes | Sales analytics |
| | GET | `/reports/purchases` | Yes | Purchase analytics |
| | GET | `/reports/profit` | Yes | Profit margins |
| **Invoices** | GET | `/invoices/:saleId` | Yes | Get invoice |
| **Offers** | GET | `/offers` | Yes | Active offers |
| | POST | `/offers` | Yes | Create offer |
| **Returns** | POST | `/returns` | Yes | Process return |
| **Shifts** | POST | `/shifts/open` | Yes | Open cash shift |
| | POST | `/shifts/close` | Yes | Close shift |
| **Attendance** | POST | `/attendance/check-in` | Yes | Clock in |
| | POST | `/attendance/check-out` | Yes | Clock out |
| | GET | `/attendance/today` | Yes | Today's status |
| **Subscriptions** | GET | `/subscriptions/plans` | Yes | All plans |
| | GET | `/subscriptions/current` | Yes | Current sub |
| | GET | `/subscriptions/limits` | Yes | Usage vs limits |
| | POST | `/subscriptions/subscribe` | Admin | Activate plan |
| | POST | `/subscriptions/cancel` | Admin | Cancel sub |
| **RBAC** | GET | `/rbac/features` | Yes | All features |
| | GET | `/rbac/roles` | Yes | All roles |
| | GET | `/rbac/roles/:id` | Yes | Role with permissions |
| | POST | `/rbac/roles` | Admin | Create role |
| | PUT | `/rbac/roles/:id/permissions` | Admin | Set permissions |
| | PUT | `/rbac/users/:userId/roles` | Admin | Assign roles |
| | GET | `/rbac/my-permissions` | Yes | Current user's permissions |
| **Individual** | GET | `/individual/dashboard` | Individual | Summary |
| | GET/POST | `/individual/expenses` | Individual | Personal expenses |
| | GET/POST | `/individual/incomes` | Individual | Personal income |
| | GET/POST | `/individual/tasks` | Individual | Personal tasks |
| | GET/POST | `/individual/budgets` | Individual | Budget management |
| | GET | `/individual/report` | Individual | Financial report |
| **Admin** | GET | `/admin/users` | Admin | All users |
| | POST | `/admin/users` | Admin | Create user |
| | PATCH | `/admin/users/:id` | Admin | Edit user |
| **Notifications** | GET | `/notifications` | Yes | List |
| | POST | `/notifications/send` | Admin | Send notification |
| **Export** | GET | `/export/:module` | Yes | Excel/CSV export |
| **SSE** | GET | `/events` | Yes | Real-time events stream |

---

## Frontend Apps

### Main App (`frontend/`)

The primary SPA serving shop management + admin panel:

- **Design**: Neumorphic UI with TailwindCSS 4 utility classes
- **State**: Redux Toolkit with async thunks per module
- **Routing**: Multi-layered guards:
  - `ProtectedRoute` — requires authentication
  - `RoleRequired` — requires role selection
  - `ModuleRequired` — requires module choice
  - `ShopRequired` — requires active shop
  - `PermissionRoute` — checks RBAC permission
  - `AdminRoute` — admin role only
  - `IndividualRoute` — individual role only
- **Offline**: PWA with service worker, IndexedDB via `idb`
- **Export**: Client-side PDF (jsPDF) and Excel (xlsx) generation
- **Real-time**: SSE connection for stock/sale updates

### Individual App (`individual/`)

A standalone lightweight React app for personal finance users:
- Shares the same backend API (`/api/individual/*`)
- Independent build and deployment
- Simpler routing (no shop/RBAC guards)

---

## Deployment

### Docker (Recommended)

```bash
# Build the image (builds frontend + backend in one image)
docker build -t mypa .

# Run with environment variables
docker run -d \
  --name mypa \
  -p 3000:3000 \
  -e MYSQL_HOST=host.docker.internal \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=root \
  -e MYSQL_PASSWORD=your_password \
  -e MYSQL_DATABASE=shopkeeper_db \
  -e JWT_SECRET=your_production_secret \
  -e NODE_ENV=production \
  mypa

# Check logs
docker logs mypa
```

**What the Dockerfile does:**
1. Stage 1 (frontend-build): Installs frontend deps → runs `vite build`
2. Stage 2 (production): Installs backend deps (production only) → copies frontend dist → exposes port 3000

### Manual Deployment

```bash
# 1. Build frontend
cd frontend && npm ci && npm run build

# 2. Install backend production deps
cd ../backend && npm ci --omit=dev

# 3. Start
NODE_ENV=production node src/server.js
```

In production mode, Express serves `frontend/dist/` and handles client-side routing with a catch-all.

---

## Troubleshooting

### "ER_ACCESS_DENIED_ERROR" on migrate

Your MySQL credentials in `.env` are wrong. Verify:
```bash
mysql -u root -p -e "SELECT 1"
```

### "ECONNREFUSED" — MySQL not running

```bash
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

### Port 3000 already in use

```bash
# Find what's using it
lsof -i :3000

# Kill it, or change PORT in .env
PORT=3001
```

### Frontend can't reach backend (CORS error)

In development this shouldn't happen (CORS allows all). If it does:
- Make sure backend is running on port 3000
- Frontend Vite config proxies `/api` to backend

### Migrations won't run (already applied)

```bash
# Check status
node src/database/migrate.js --status

# Force re-run (safe — all statements are idempotent)
node src/database/migrate.js --force
```

### "Cannot find module" errors

```bash
cd backend && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install
```

---

## Scripts Reference

### Backend (`backend/package.json`)

| Command | Description |
|---------|-------------|
| `npm start` | Start production server (`node src/server.js`) |
| `npm run dev` | Start with nodemon (auto-reload on file changes) |
| `npm run migrate` | Run pending database migrations |
| `npm run seed` | Seed demo data (users, shop, products, etc.) |
| `npm run seed:bulk` | Seed bulk data for performance testing |
| `npm run db:setup` | `migrate` + `seed` in one command |
| `npm run db:full` | `migrate` + `seed` + `seed:bulk` |
| `npm test` | Run Jest test suite |

### Frontend (`frontend/package.json`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR (port 5173) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

### Individual (`individual/package.json`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview build |

### Database Utilities

| Command | Description |
|---------|-------------|
| `node src/database/migrate.js` | Run pending migrations |
| `node src/database/migrate.js --status` | Show migration status table |
| `node src/database/migrate.js --force` | Re-run all (idempotent) |
| `node src/database/apply-030.js` | Apply a specific migration manually |

---

## Security

| Measure | Details |
|---------|---------|
| Helmet | HTTP security headers (CSP, HSTS, etc.) |
| Rate Limiting | 1000 req/15min (general), 30 req/15min (auth) |
| HPP | HTTP parameter pollution protection |
| CORS | Restricted origins in production |
| JWT | Stateless auth, 7-day expiry, role+permissions embedded |
| bcrypt | Password hashing (10 salt rounds) |
| Input Validation | express-validator on all write endpoints |
| Subscription Guard | Feature/limit enforcement per plan |
| Body Size Limit | 10MB max request body |
| File Upload | Multer with size limits |

---

## License

ISC
