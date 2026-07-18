-- 024_rbac.sql
-- Dynamic RBAC: features → roles → role_permissions → user_roles

-- ─────────────────────────────────────────────
-- 1. Features (e.g. products, sales, pos …)
--    Each feature has three boolean access flags.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rbac_features (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,           -- human label, e.g. "Products"
  slug        VARCHAR(100)  NOT NULL UNIQUE,    -- machine key, e.g. "products"
  description VARCHAR(255)  DEFAULT NULL,
  shop_id     INT           DEFAULT NULL,       -- NULL = global / system feature
  can_read    TINYINT(1)    NOT NULL DEFAULT 1,
  can_write   TINYINT(1)    NOT NULL DEFAULT 1,
  can_execute TINYINT(1)    NOT NULL DEFAULT 1,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 2. Roles (custom, per shop)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rbac_roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,           -- e.g. "Cashier"
  slug        VARCHAR(100)  NOT NULL,           -- e.g. "cashier"
  description VARCHAR(255)  DEFAULT NULL,
  shop_id     INT           DEFAULT NULL,       -- NULL = global/system role
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_slug_shop (slug, shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 3. Role ↔ Feature permissions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rbac_role_permissions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id     INT UNSIGNED  NOT NULL,
  feature_id  INT UNSIGNED  NOT NULL,
  can_read    TINYINT(1)    NOT NULL DEFAULT 0,
  can_write   TINYINT(1)    NOT NULL DEFAULT 0,
  can_execute TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_feature (role_id, feature_id),
  CONSTRAINT fk_rp_role    FOREIGN KEY (role_id)    REFERENCES rbac_roles(id)    ON DELETE CASCADE,
  CONSTRAINT fk_rp_feature FOREIGN KEY (feature_id) REFERENCES rbac_features(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 4. User ↔ Role assignment (multiple roles per user per shop)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rbac_user_roles (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT           NOT NULL,
  role_id    INT UNSIGNED  NOT NULL,
  shop_id    INT           DEFAULT NULL,        -- scope: which shop this assignment applies to
  assigned_by INT          DEFAULT NULL,        -- user_id of admin who assigned
  created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_role_shop (user_id, role_id, shop_id),
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES rbac_roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 5. Seed default system features
-- ─────────────────────────────────────────────
INSERT IGNORE INTO rbac_features (name, slug, description, shop_id) VALUES
  ('Dashboard',        'dashboard',        'View shop dashboard',               NULL),
  ('Products',         'products',         'Manage products catalogue',         NULL),
  ('Categories',       'categories',       'Manage product categories',         NULL),
  ('Sales',            'sales',            'Create and manage sales',           NULL),
  ('Purchases',        'purchases',        'Create and manage purchases',       NULL),
  ('Inventory',        'inventory',        'View and adjust inventory',         NULL),
  ('Customers',        'customers',        'Manage customer records',           NULL),
  ('Suppliers',        'suppliers',        'Manage supplier records',           NULL),
  ('POS',              'pos',              'Point-of-sale terminal',            NULL),
  ('Offers',           'offers',           'Create and manage offers',          NULL),
  ('Expenses',         'expenses',         'Track business expenses',           NULL),
  ('Payments',         'payments',         'View and record payments',          NULL),
  ('Reports',          'reports',          'View business reports',             NULL),
  ('Invoices',         'invoices',         'View and print invoices',           NULL),
  ('Shop Settings',    'shop_settings',    'Edit shop details and config',      NULL),
  ('User Management',  'user_management',  'Manage staff and user accounts',    NULL),
  ('Customer Ledger',  'customer_ledger',  'Manage customer credit/debit',      NULL),
  ('Subscriptions',    'subscriptions',    'Manage subscription plans',         NULL),
  ('Export/Import',    'export_import',    'Export and import data',            NULL),
  ('Attendance',       'attendance',       'View and manage staff attendance',  NULL);
