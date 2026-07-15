-- Migration 012: Monthly budgets for individual users
-- Stores a monthly spending limit per expense category per user
CREATE TABLE IF NOT EXISTS personal_budgets (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  category      VARCHAR(100) NOT NULL,
  monthly_limit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_category (user_id, category),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
