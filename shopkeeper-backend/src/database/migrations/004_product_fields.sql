-- Add advanced product fields
ALTER TABLE products ADD COLUMN brand VARCHAR(100) DEFAULT NULL AFTER description;
ALTER TABLE products ADD COLUMN hsn_code VARCHAR(20) DEFAULT NULL AFTER brand;
ALTER TABLE products ADD COLUMN mrp DECIMAL(10,2) DEFAULT 0 AFTER selling_price;
ALTER TABLE products ADD COLUMN weight VARCHAR(50) DEFAULT NULL AFTER unit;
ALTER TABLE products ADD COLUMN min_stock_level DECIMAL(10,2) DEFAULT 0 AFTER weight;
ALTER TABLE products ADD COLUMN max_stock_level DECIMAL(10,2) DEFAULT 0 AFTER min_stock_level;
ALTER TABLE products ADD COLUMN expiry_date DATE DEFAULT NULL AFTER max_stock_level;
ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE AFTER expiry_date;
