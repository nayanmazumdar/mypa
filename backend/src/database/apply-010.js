/**
 * Migration 010 — Add avatar column to users table
 * Stores the relative path of the uploaded profile picture.
 * Safe to run multiple times.
 *
 * Usage: node src/database/apply-010.js
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
    try {
      await conn.execute(`ALTER TABLE users ADD COLUMN avatar VARCHAR(500) DEFAULT NULL AFTER phone`);
      console.log('OK: Added avatar column to users');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('SKIP: avatar column already exists');
      } else throw err;
    }
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'`
    );
    if (rows.length) console.log('\nusers.avatar →', rows[0].COLUMN_TYPE, '| nullable:', rows[0].IS_NULLABLE);
    console.log('\nMigration 010 applied successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
