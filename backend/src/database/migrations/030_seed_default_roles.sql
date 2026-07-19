-- 030_seed_default_roles.sql
-- Seed sensible default RBAC roles with proper permissions.
-- These give admins a ready-to-use starting point they can customize.

-- ─────────────────────────────────────────────
-- 1. Create default roles
-- ─────────────────────────────────────────────
INSERT IGNORE INTO rbac_roles (name, slug, description) VALUES
  ('Cashier',          'cashier',          'Handles billing, POS, and basic sales operations'),
  ('Store Manager',    'store_manager',    'Full day-to-day store operations including inventory and staff'),
  ('Inventory Clerk',  'inventory_clerk',  'Manages products, stock levels, and purchase orders'),
  ('Sales Executive',  'sales_executive',  'Creates sales, manages customers, and tracks payments'),
  ('Accountant',       'accountant',       'Manages expenses, payments, reports, and customer ledger');

-- ─────────────────────────────────────────────
-- 2. Assign permissions to each role
--    Using subqueries to reference feature IDs by slug.
--    can_read / can_write / can_execute
-- ─────────────────────────────────────────────

-- ═══ CASHIER ═══
-- Focus: POS, Sales, Payments, Invoices (full access)
--        Dashboard, Products, Categories, Inventory, Customers, Offers, Customer Ledger (read)
--        Can create customers on the fly and process payments
INSERT IGNORE INTO rbac_role_permissions (role_id, feature_id, can_read, can_write, can_execute)
SELECT
  (SELECT id FROM rbac_roles WHERE slug = 'cashier'),
  f.id,
  1,  -- can_read: yes for all features assigned to cashier
  CASE
    WHEN f.slug IN ('pos', 'sales', 'payments', 'invoices') THEN 1
    WHEN f.slug IN ('customers')                             THEN 1
    ELSE 0
  END,
  CASE
    WHEN f.slug IN ('pos', 'sales', 'payments')             THEN 1
    ELSE 0
  END
FROM rbac_features f
WHERE f.is_active = 1 AND f.is_admin_only = 0
  AND f.slug IN ('dashboard', 'products', 'categories', 'inventory', 'pos', 'sales', 'invoices', 'payments', 'customers', 'customer_ledger', 'offers');

-- ═══ STORE MANAGER ═══
-- Full access to all non-admin features (read + write + execute)
INSERT IGNORE INTO rbac_role_permissions (role_id, feature_id, can_read, can_write, can_execute)
SELECT
  (SELECT id FROM rbac_roles WHERE slug = 'store_manager'),
  f.id,
  1,  -- can_read: everything
  1,  -- can_write: everything
  1   -- can_execute: everything
FROM rbac_features f
WHERE f.is_active = 1 AND f.is_admin_only = 0;

-- ═══ INVENTORY CLERK ═══
-- Focus: Products, Categories, Inventory, Purchases, Suppliers
INSERT IGNORE INTO rbac_role_permissions (role_id, feature_id, can_read, can_write, can_execute)
SELECT
  (SELECT id FROM rbac_roles WHERE slug = 'inventory_clerk'),
  f.id,
  CASE
    WHEN f.slug IN ('products', 'categories', 'inventory', 'purchases', 'suppliers') THEN 1
    WHEN f.slug IN ('dashboard', 'sales', 'invoices')                                 THEN 1
    ELSE 0
  END,
  CASE
    WHEN f.slug IN ('products', 'categories', 'inventory', 'purchases', 'suppliers') THEN 1
    ELSE 0
  END,
  CASE
    WHEN f.slug IN ('products', 'inventory', 'purchases')                             THEN 1
    ELSE 0
  END
FROM rbac_features f
WHERE f.is_active = 1 AND f.is_admin_only = 0
  AND f.slug IN ('dashboard', 'products', 'categories', 'inventory', 'purchases', 'suppliers', 'sales', 'invoices');

-- ═══ SALES EXECUTIVE ═══
-- Focus: Sales, Customers, POS, Payments, Offers, Customer Ledger
INSERT IGNORE INTO rbac_role_permissions (role_id, feature_id, can_read, can_write, can_execute)
SELECT
  (SELECT id FROM rbac_roles WHERE slug = 'sales_executive'),
  f.id,
  CASE
    WHEN f.slug IN ('sales', 'customers', 'pos', 'payments', 'offers', 'customer_ledger', 'invoices') THEN 1
    WHEN f.slug IN ('dashboard', 'products', 'categories', 'inventory')                                THEN 1
    ELSE 0
  END,
  CASE
    WHEN f.slug IN ('sales', 'customers', 'pos', 'payments', 'customer_ledger')                       THEN 1
    WHEN f.slug IN ('offers')                                                                          THEN 1
    ELSE 0
  END,
  CASE
    WHEN f.slug IN ('sales', 'pos', 'payments')                                                        THEN 1
    ELSE 0
  END
FROM rbac_features f
WHERE f.is_active = 1 AND f.is_admin_only = 0
  AND f.slug IN ('dashboard', 'products', 'categories', 'inventory', 'sales', 'customers', 'pos', 'payments', 'offers', 'customer_ledger', 'invoices');

-- ═══ ACCOUNTANT ═══
-- Focus: Expenses, Reports, Payments, Customer Ledger, Invoices
INSERT IGNORE INTO rbac_role_permissions (role_id, feature_id, can_read, can_write, can_execute)
SELECT
  (SELECT id FROM rbac_roles WHERE slug = 'accountant'),
  f.id,
  CASE
    WHEN f.slug IN ('expenses', 'reports', 'payments', 'customer_ledger', 'invoices') THEN 1
    WHEN f.slug IN ('dashboard', 'sales', 'purchases', 'customers', 'suppliers')      THEN 1
    ELSE 0
  END,
  CASE
    WHEN f.slug IN ('expenses', 'payments', 'customer_ledger')                        THEN 1
    ELSE 0
  END,
  CASE
    WHEN f.slug IN ('expenses', 'payments')                                            THEN 1
    ELSE 0
  END
FROM rbac_features f
WHERE f.is_active = 1 AND f.is_admin_only = 0
  AND f.slug IN ('dashboard', 'expenses', 'reports', 'payments', 'customer_ledger', 'invoices', 'sales', 'purchases', 'customers', 'suppliers');
