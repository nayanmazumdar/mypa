/**
 * Migration 008 — Role nullable for new accounts (role chosen after first login)
 * Safe to run multiple times.
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
  // Allow role to be NULL so new self-registered accounts start without a role
  `ALTER TABLE users MODIFY COLUMN role ENUM('admin','shopkeeper','staff','individual') DEFAULT NULL`,
];

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('Connected to MySQL');
    for (const sql of statements) {
      await conn.execute(sql);
      console.log('OK:', sql.substring(0, 80).replace(/\s+/g, ' '));
    }
    const [rows] = await conn.execute(
      'SELECT COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
      ['users', 'role']
    );
    console.log('\nusers.role →', rows[0].COLUMN_TYPE, '| nullable:', rows[0].IS_NULLABLE);
    console.log('\nMigration 008 applied.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
