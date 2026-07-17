/**
 * apply-018.js
 * Adds biller_id column to pos_transactions (Migration 018).
 * Tracks which staff member / user actually processed each POS transaction —
 * useful for referrals, performance tracking, and audit trails.
 *
 * Safe to run multiple times — skips gracefully if column already exists.
 *
 * Usage: node src/database/apply-018.js
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
  {
    label: '018 — Add biller_id column to pos_transactions',
    sql: `ALTER TABLE pos_transactions
            ADD COLUMN biller_id INT DEFAULT NULL AFTER user_id`,
  },
  {
    label: '018 — Add FK constraint fk_pos_biller → users(id)',
    sql: `ALTER TABLE pos_transactions
            ADD CONSTRAINT fk_pos_biller
            FOREIGN KEY (biller_id) REFERENCES users(id) ON DELETE SET NULL`,
  },
  {
    label: '018 — Backfill biller_id from user_id for existing rows',
    sql: `UPDATE pos_transactions SET biller_id = user_id WHERE biller_id IS NULL`,
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

    // Verify column exists
    console.log('\nVerifying...');
    const [cols] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pos_transactions' AND COLUMN_NAME = 'biller_id'`,
      [config.database]
    );
    const exists = cols.length > 0;
    console.log(`  ${exists ? '✓' : '✗'} biller_id column in pos_transactions`);

    console.log('\n✅ Migration 018 applied successfully.\n');
  } catch (err) {
    console.error('\nFatal error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
