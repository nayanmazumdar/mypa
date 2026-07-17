-- Migration 017: Multi-payment split + Shift management (end-of-day settlement)

-- Add payments_json column to pos_transactions for split payment details
ALTER TABLE pos_transactions ADD COLUMN payments_json JSON DEFAULT NULL;

-- Shift/settlement table for end-of-day cash management
CREATE TABLE IF NOT EXISTS shifts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  uuid            VARCHAR(36) NOT NULL,
  shop_id         INT NOT NULL,
  user_id         INT NOT NULL,
  status          ENUM('open','closed') NOT NULL DEFAULT 'open',
  opened_at       DATETIME NOT NULL,
  closed_at       DATETIME DEFAULT NULL,
  opening_cash    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  closing_cash    DECIMAL(10,2) DEFAULT NULL,
  expected_cash   DECIMAL(10,2) DEFAULT NULL,
  cash_difference DECIMAL(10,2) DEFAULT NULL,
  total_sales     DECIMAL(10,2) DEFAULT 0.00,
  total_transactions INT DEFAULT 0,
  cash_sales      DECIMAL(10,2) DEFAULT 0.00,
  upi_sales       DECIMAL(10,2) DEFAULT 0.00,
  card_sales      DECIMAL(10,2) DEFAULT 0.00,
  credit_sales    DECIMAL(10,2) DEFAULT 0.00,
  total_returns   DECIMAL(10,2) DEFAULT 0.00,
  notes           TEXT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_shop_status (shop_id, status),
  INDEX idx_shop_date (shop_id, opened_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
