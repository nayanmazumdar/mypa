/**
 * Migration 011 — Add paid_amount and due_amount columns to purchases table
 * paid_amount : how much was paid at time of purchase (cash/upi/card)
 * due_amount  : remaining balance owed to supplier (udhaar)
 * Safe to run multiple times.
 *
 * Usage: node src/database/apply-011.js
 */
const mysql = require('mysql2/promise');
const path  = require('path');
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

    // Add paid_amount
    try {
      await conn.execute(`ALTER TABLE purchases ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT 0 AFTER net_amount`);
      console.log('OK: Added paid_amount column');
    } catch (err) {
      if (err.message.includes('Duplicate column')) console.log('SKIP: paid_amount already exists');
      else throw err;
    }

    // Add due_amount
    try {
      await conn.execute(`ALTER TABLE purchases ADD COLUMN due_amount DECIMAL(10,2) DEFAULT 0 AFTER paid_amount`);
      console.log('OK: Added due_amount column');
    } catch (err) {
      if (err.message.includes('Duplicate column')) console.log('SKIP: due_amount already exists');
      else throw err;
    }

    // Back-fill existing rows: paid = net_amount where status=paid, else 0
    await conn.execute(`
      UPDATE purchases
      SET paid_amount = CASE WHEN payment_status = 'paid' THEN net_amount ELSE 0 END,
          due_amount  = CASE WHEN payment_status = 'paid' THEN 0
                             WHEN payment_status = 'unpaid' THEN net_amount
                             ELSE net_amount END
      WHERE paid_amount = 0 AND due_amount = 0
    `);
    console.log('OK: Back-filled existing rows');

    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchases'
       AND COLUMN_NAME IN ('paid_amount','due_amount')`
    );
    rows.forEach(r => console.log(`purchases.${r.COLUMN_NAME} → ${r.COLUMN_TYPE}`));
    console.log('\nMigration 011 applied successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
