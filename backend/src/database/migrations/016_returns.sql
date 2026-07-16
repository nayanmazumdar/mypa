-- Migration 016: Returns and exchanges table
CREATE TABLE IF NOT EXISTS pos_returns (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  uuid            VARCHAR(36) NOT NULL,
  shop_id         INT NOT NULL,
  user_id         INT NOT NULL,
  transaction_id  INT NOT NULL,
  receipt_number  VARCHAR(50),
  type            ENUM('return','exchange') NOT NULL DEFAULT 'return',
  reason          TEXT,
  total_refund    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  items_json      JSON,
  status          ENUM('completed','cancelled') NOT NULL DEFAULT 'completed',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id),
  INDEX idx_shop_date (shop_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
