-- Add passcode column to users
ALTER TABLE users ADD COLUMN passcode VARCHAR(255) DEFAULT NULL AFTER password;

-- User-Shop junction table (multi-shop support)
CREATE TABLE IF NOT EXISTS user_shops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  shop_id INT NOT NULL,
  role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_shop (user_id, shop_id)
);

-- Customer ledger for credit/payment tracking
CREATE TABLE IF NOT EXISTS customer_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  shop_id INT NOT NULL,
  type ENUM('credit', 'payment') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT NULL,
  reference VARCHAR(100) DEFAULT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- Backfill user_shops from existing users that have a shop_id
INSERT IGNORE INTO user_shops (user_id, shop_id, role)
SELECT id, shop_id, role FROM users WHERE shop_id IS NOT NULL;

-- Add customer_id FK to pos_transactions for linking sales to customers
ALTER TABLE pos_transactions ADD COLUMN customer_id INT DEFAULT NULL AFTER customer_name;
ALTER TABLE pos_transactions ADD CONSTRAINT fk_pos_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- Expand payment_method enum to include 'credit' for udhar sales
ALTER TABLE pos_transactions MODIFY COLUMN payment_method VARCHAR(20) DEFAULT 'cash';
