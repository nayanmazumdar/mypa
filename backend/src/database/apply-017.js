/**
 * apply-017.js
 * Creates the shop_login_logs table (Migration 017).
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.
 *
 * Usage: node src/database/apply-017.js
 */
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'shopkeeper_db',
};

const sql = `
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
)`;

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log(`\nConnected to MySQL → ${config.database}\n`);
    await conn.execute(sql);
    console.log('  ✓ shop_login_logs table created (or already exists)\n');
    console.log('✅ Migration 017 applied successfully.\n');
  } catch (err) {
    console.error('✗ Migration 017 failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
