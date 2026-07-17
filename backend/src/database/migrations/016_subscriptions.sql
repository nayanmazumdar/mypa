-- Migration 015: Subscription system for shops
-- Tables: subscription_plans (plan catalog) + shop_subscriptions (active subscriptions per shop)

CREATE TABLE IF NOT EXISTS subscription_plans (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,              -- e.g. free, starter, pro, enterprise
  display_name VARCHAR(100) NOT NULL,                    -- e.g. "Starter Plan"
  description TEXT,
  price_monthly   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  price_quarterly DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  price_yearly    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  max_products    INT DEFAULT NULL,                      -- NULL = unlimited
  max_staff       INT DEFAULT NULL,
  max_customers   INT DEFAULT NULL,
  max_monthly_sales INT DEFAULT NULL,
  features        JSON,                                  -- flexible feature flags
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  shop_id         INT NOT NULL,
  plan_id         INT NOT NULL,
  billing_cycle   ENUM('monthly','quarterly','yearly') NOT NULL DEFAULT 'monthly',
  status          ENUM('active','expired','cancelled','trial') NOT NULL DEFAULT 'trial',
  amount_paid     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  starts_at       DATETIME NOT NULL,
  expires_at      DATETIME NOT NULL,
  cancelled_at    DATETIME DEFAULT NULL,
  payment_reference VARCHAR(255) DEFAULT NULL,           -- razorpay/upi reference
  notes           TEXT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  INDEX idx_shop_status (shop_id, status),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default plans
INSERT IGNORE INTO subscription_plans (name, display_name, description, price_monthly, price_quarterly, price_yearly, max_products, max_staff, max_customers, max_monthly_sales, features, sort_order) VALUES
('free', 'Free', 'Basic plan for getting started', 0.00, 0.00, 0.00, 50, 1, 100, 200, '{"pos":true,"reports":false,"offers":false,"invoice_branding":false,"priority_support":false}', 1),
('starter', 'Starter', 'For small shops just getting started', 199.00, 499.00, 1799.00, 200, 3, 500, 1000, '{"pos":true,"reports":true,"offers":false,"invoice_branding":false,"priority_support":false}', 2),
('pro', 'Pro', 'For growing businesses that need more', 499.00, 1299.00, 4799.00, NULL, 10, NULL, NULL, '{"pos":true,"reports":true,"offers":true,"invoice_branding":true,"priority_support":false}', 3),
('enterprise', 'Enterprise', 'Unlimited everything with priority support', 999.00, 2499.00, 8999.00, NULL, NULL, NULL, NULL, '{"pos":true,"reports":true,"offers":true,"invoice_branding":true,"priority_support":true}', 4);
