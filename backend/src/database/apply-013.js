/**
 * Migration 013 — Ensure pos_transactions has user_id and shop_id columns
 * Fixes "Field 'user_id' doesn't have a default value" error on POS checkout.
 * Safe to run multiple times.
 *
 * Usage: node src/database/apply-013.js
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

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('Connected to MySQL');

    // 1. Check existing columns
    const [cols] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pos_transactions'`
    );
    const existing = new Set(cols.map(c => c.COLUMN_NAME));
    console.log('Existing columns:', [...existing].join(', '));

    // 2. Add user_id if missing (nullable so old rows are not broken)
    if (!existing.has('user_id')) {
      await conn.execute(
        `ALTER TABLE pos_transactions ADD COLUMN user_id INT DEFAULT NULL AFTER uuid`
      );
      console.log('OK: Added user_id column');
    } else {
      // Make user_id nullable so INSERT without it doesn't fail
      await conn.execute(
        `ALTER TABLE pos_transactions MODIFY COLUMN user_id INT DEFAULT NULL`
      );
      console.log('OK: user_id made nullable (no-default safe)');
    }

    // 3. Add shop_id if missing
    if (!existing.has('shop_id')) {
      await conn.execute(
        `ALTER TABLE pos_transactions ADD COLUMN shop_id INT DEFAULT NULL AFTER user_id`
      );
      console.log('OK: Added shop_id column');
    } else {
      console.log('SKIP: shop_id already exists');
    }

    // 4. Add status if missing
    if (!existing.has('status')) {
      await conn.execute(
        `ALTER TABLE pos_transactions ADD COLUMN status ENUM('completed','cancelled') DEFAULT 'completed'`
      );
      console.log('OK: Added status column with default completed');
    } else {
      // Ensure default is 'completed' so rows without explicit status are counted
      await conn.execute(
        `ALTER TABLE pos_transactions MODIFY COLUMN status ENUM('completed','cancelled') DEFAULT 'completed'`
      );
      // Backfill any NULL status rows
      const [updated] = await conn.execute(
        `UPDATE pos_transactions SET status = 'completed' WHERE status IS NULL`
      );
      console.log(`OK: status column verified; backfilled ${updated.affectedRows} NULL rows`);
    }

    // 5. Verify final schema
    const [finalCols] = await conn.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pos_transactions'
       ORDER BY ORDINAL_POSITION`
    );
    console.log('\nFinal pos_transactions schema:');
    finalCols.forEach(c =>
      console.log(`  ${c.COLUMN_NAME} | ${c.COLUMN_TYPE} | default: ${c.COLUMN_DEFAULT} | nullable: ${c.IS_NULLABLE}`)
    );

    // 6. Row counts
    const [[counts]] = await conn.execute(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status IS NULL THEN 1 ELSE 0 END) as null_status
       FROM pos_transactions`
    );
    console.log('\nRow counts:', counts);

    console.log('\nMigration 013 applied successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
