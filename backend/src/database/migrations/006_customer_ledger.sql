-- Customer credit/payment ledger
CREATE TABLE IF NOT EXISTS customer_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  shop_id INT NOT NULL,
  type ENUM('credit', 'payment') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference VARCHAR(100) DEFAULT NULL,
  payment_method ENUM('cash', 'card', 'upi', 'bank_transfer') DEFAULT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);
