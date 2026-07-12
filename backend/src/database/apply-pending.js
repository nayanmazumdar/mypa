/**
 * apply-pending.js
 * Applies all pending migrations (007, 008) to an existing database.
 * Safe to run multiple times — all statements are idempotent.
 *
 * Usage: node src/database/apply-pending.js
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
  // ── Migration 007: Individual role tables ──────────────────────────────────
  {
    label: '007 — Extend users.role ENUM to include individual',
    sql: `ALTER TABLE users MODIFY COLUMN role ENUM('admin','shopkeeper','staff','individual') DEFAULT NULL`,
  },
  {
    label: '007 — Create personal_expenses table',
    sql: `CREATE TABLE IF NOT EXISTS personal_expenses (
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
  },
  {
    label: '007 — Create personal_incomes table',
    sql: `CREATE TABLE IF NOT EXISTS personal_incomes (
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
  },
  {
    label: '007 — Create personal_tasks table',
    sql: `CREATE TABLE IF NOT EXISTS personal_tasks (
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
  },
  // ── Migration 008: default_module column ──────────────────────────────────
  {
    label: '008 — Add default_module column to users',
    sql: `ALTER TABLE users ADD COLUMN default_module VARCHAR(50) DEFAULT NULL AFTER role`,
  },
  // ── Migration 008b: avatar column (if missing) ────────────────────────────
  {
    label: '008b — Add avatar column to users',
    sql: `ALTER TABLE users ADD COLUMN avatar VARCHAR(500) DEFAULT NULL AFTER phone`,
  },
];

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log(`\nConnected to MySQL → ${config.database}\n`);

    for (const { label, sql } of statements) {
      try {
        await conn.execute(sql);
        console.log(`  ✓ ${label}`);
      } catch (err) {
        const msg = err.message || '';
        const safe =
          msg.includes('already exists') ||
          msg.includes('Duplicate column') ||
          msg.includes('Duplicate key name') ||
          msg.includes("Can't DROP") ||
          msg.includes('check that column/key exists');
        if (safe) {
          console.log(`  ↩ ${label} — already applied, skipped`);
        } else {
          console.error(`  ✗ ${label}\n    ${msg}`);
          process.exit(1);
        }
      }
    }

    // Verify tables exist
    console.log('\nVerifying tables...');
    const [tables] = await conn.execute('SHOW TABLES');
    const tableNames = tables.map((r) => Object.values(r)[0]);
    ['personal_expenses', 'personal_incomes', 'personal_tasks'].forEach((t) => {
      const exists = tableNames.includes(t);
      console.log(`  ${exists ? '✓' : '✗'} ${t}`);
    });

    console.log('\n✅ All pending migrations applied successfully.\n');
  } catch (err) {
    console.error('\nFatal error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
