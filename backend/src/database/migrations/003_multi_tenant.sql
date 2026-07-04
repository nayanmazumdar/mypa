-- Shops table (tenant)
CREATE TABLE IF NOT EXISTS shops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(15),
  email VARCHAR(150),
  gst_number VARCHAR(20),
  logo_url VARCHAR(500),
  owner_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add shop_id to users
ALTER TABLE users ADD COLUMN shop_id INT DEFAULT NULL AFTER role;
ALTER TABLE users ADD CONSTRAINT fk_users_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL;

-- Add shop_id to all entity tables
ALTER TABLE categories ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE products ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE customers ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE suppliers ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE inventory ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE stock_movements ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE sales ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE purchases ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE payments ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE pos_transactions ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE expenses ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE daily_summary ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id;

-- Backfill: set shop_id from user's shop for existing data
-- This will be handled by the migration script
