/**
 * apply-014.js
 * Adds area and pincode columns to users table for individual profile settings.
 * Safe to run multiple times — each statement is idempotent.
 *
 * Usage: node src/database/apply-014.js
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
    label: '014 — Add area column to users',
    sql: `ALTER TABLE users ADD COLUMN area VARCHAR(255) DEFAULT NULL`,
  },
  {
    label: '014 — Add pincode column to users',
    sql: `ALTER TABLE users ADD COLUMN pincode VARCHAR(10) DEFAULT NULL`,
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
          msg.includes('Duplicate key name');
        if (safe) {
          console.log(`  ↩ ${label} — already applied, skipped`);
        } else {
          console.error(`  ✗ ${label}\n    ${msg}`);
          process.exit(1);
        }
      }
    }

    // Verify
    console.log('\nVerifying columns exist...');
    const [areaCols]    = await conn.execute(`SHOW COLUMNS FROM users LIKE 'area'`);
    const [pincodeCols] = await conn.execute(`SHOW COLUMNS FROM users LIKE 'pincode'`);
    console.log(areaCols.length    ? '  ✓ area column present'    : '  ✗ area column MISSING');
    console.log(pincodeCols.length ? '  ✓ pincode column present' : '  ✗ pincode column MISSING');

    console.log('\n✅ Migration 014 applied successfully.\n');
  } catch (err) {
    console.error('\nFatal error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
