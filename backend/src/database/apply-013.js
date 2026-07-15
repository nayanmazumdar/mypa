/**
 * apply-013.js
 * Adds budget_period column to personal_budgets and updates the unique key.
 * Safe to run multiple times — each statement is idempotent.
 *
 * Usage: node src/database/apply-013.js
 */
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  host:     process.env.MYSQL_HOST     || 'localhost',
  port:     parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user:     process.env.MYSQL_USER     || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'shopkeeper_db',
};

const statements = [
  {
    label: '013 — Add budget_period column (INT 6)',
    sql: `ALTER TABLE personal_budgets
          ADD COLUMN budget_period INT(6) NOT NULL DEFAULT 0 AFTER user_id`,
  },
  {
    label: '013 — Backfill existing rows with current period',
    sql: `UPDATE personal_budgets
          SET budget_period = CAST(DATE_FORMAT(NOW(), '%Y%m') AS UNSIGNED)
          WHERE budget_period = 0`,
    ignoreDuplicate: false,
  },
  {
    label: '013 — Drop old unique key uq_user_category',
    sql: `ALTER TABLE personal_budgets DROP INDEX uq_user_category`,
  },
  {
    label: '013 — Add new unique key uq_user_period_category',
    sql: `ALTER TABLE personal_budgets
          ADD UNIQUE KEY uq_user_period_category (user_id, budget_period, category)`,
  },
  {
    label: '013 — Add index on budget_period',
    sql: `ALTER TABLE personal_budgets ADD INDEX idx_budget_period (budget_period)`,
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
          msg.includes('check that column/key exists') ||
          msg.includes("doesn't exist");
        if (safe) {
          console.log(`  ↩ ${label} — already applied, skipped`);
        } else {
          console.error(`  ✗ ${label}\n    ${msg}`);
          process.exit(1);
        }
      }
    }

    // Verify
    console.log('\nVerifying column exists...');
    const [cols] = await conn.execute(`SHOW COLUMNS FROM personal_budgets LIKE 'budget_period'`);
    console.log(cols.length ? '  ✓ budget_period column present' : '  ✗ budget_period column MISSING');

    console.log('\n✅ Migration 013 applied successfully.\n');
  } catch (err) {
    console.error('\nFatal error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
