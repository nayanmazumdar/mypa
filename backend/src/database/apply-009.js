/**
 * Migration 009 — Add default_module column to users
 * Persists the module the user chose during first-time RBAC setup.
 * Safe to run multiple times.
 *
 * Usage: node src/database/apply-009.js
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
  `ALTER TABLE users ADD COLUMN default_module VARCHAR(50) DEFAULT NULL AFTER role`,
];

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('Connected to MySQL');
    for (const sql of statements) {
      try {
        await conn.execute(sql);
        console.log('OK:', sql.substring(0, 80).replace(/\s+/g, ' '));
      } catch (err) {
        if (err.message.includes('Duplicate column')) {
          console.log('SKIP (already exists):', sql.substring(0, 60));
        } else {
          throw err;
        }
      }
    }
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'default_module'`
    );
    if (rows.length) {
      console.log('\nusers.default_module →', rows[0].COLUMN_TYPE, '| nullable:', rows[0].IS_NULLABLE, '| default:', rows[0].COLUMN_DEFAULT);
    }
    console.log('\nMigration 009 applied successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
