/**
 * Applies migration 007 manually (safe to run multiple times).
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

const statements = [
  `ALTER TABLE users MODIFY COLUMN role ENUM('admin','shopkeeper','staff','individual') DEFAULT 'shopkeeper'`,

  `CREATE TABLE IF NOT EXISTS personal_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash','card','upi','bank_transfer','other') DEFAULT 'cash',
    expense_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS personal_incomes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    source VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash','card','upi','bank_transfer','other') DEFAULT 'cash',
    income_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS personal_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('low','medium','high') DEFAULT 'medium',
    status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
    due_date DATE DEFAULT NULL,
    completed_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
];

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('Connected to MySQL');

    for (const sql of statements) {
      await conn.execute(sql);
      const preview = sql.trim().substring(0, 70).replace(/\s+/g, ' ');
      console.log('OK:', preview + '...');
    }

    // Verify
    const [rows] = await conn.execute(
      'SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
      ['users', 'role']
    );
    console.log('\nusers.role is now:', rows[0].COLUMN_TYPE);
    console.log('\nMigration 007 applied successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
