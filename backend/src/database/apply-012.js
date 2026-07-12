/**
 * Migration 012 — Add original_due_amount to purchases
 * Stores the due amount at the time of purchase so it can be shown
 * as faded/strikethrough after it's been cleared.
 * Safe to run multiple times.
 *
 * Usage: node src/database/apply-012.js
 */
const mysql  = require('mysql2/promise');
const path   = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  host:     process.env.MYSQL_HOST     || 'localhost',
  port:     parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user:     process.env.MYSQL_USER     || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'shopkeeper_db',
};

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('Connected to MySQL');

    try {
      await conn.execute(
        `ALTER TABLE purchases ADD COLUMN original_due_amount DECIMAL(10,2) DEFAULT 0 AFTER due_amount`
      );
      console.log('OK: Added original_due_amount column');
    } catch (err) {
      if (err.message.includes('Duplicate column')) console.log('SKIP: original_due_amount already exists');
      else throw err;
    }

    // Back-fill: for already-cleared rows (paid, due=0) set original_due to net_amount
    // For partial/unpaid, set to current due_amount
    await conn.execute(`
      UPDATE purchases
      SET original_due_amount = CASE
        WHEN payment_status = 'paid' AND due_amount = 0 THEN net_amount
        ELSE due_amount
      END
      WHERE original_due_amount = 0
    `);
    console.log('OK: Back-filled existing rows');

    console.log('\nMigration 012 applied successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
