-- Migration 011: Personal notes for individual users
CREATE TABLE IF NOT EXISTS personal_notes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(200) NOT NULL DEFAULT 'Untitled',
  content     TEXT,
  color       VARCHAR(20) DEFAULT 'yellow',
  pinned      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
