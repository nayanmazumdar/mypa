-- Migration 017: Shop staff login/logout activity log
CREATE TABLE IF NOT EXISTS shop_login_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  shop_id     INT NOT NULL,
  role        VARCHAR(50) NOT NULL,
  login_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at   DATETIME DEFAULT NULL,
  date        DATE NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_shop_date (shop_id, date)
);
