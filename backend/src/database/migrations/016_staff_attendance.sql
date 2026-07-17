-- Migration 016: Staff attendance tracking
CREATE TABLE IF NOT EXISTS staff_attendance (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  shop_id     INT NOT NULL,
  date        DATE NOT NULL,
  check_in    DATETIME DEFAULT NULL,
  check_out   DATETIME DEFAULT NULL,
  role        VARCHAR(50) DEFAULT NULL,
  shop_status ENUM('open','closed') DEFAULT 'open',
  notes       TEXT DEFAULT NULL,
  recorded_by INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id)     REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendance (user_id, shop_id, date)
);
