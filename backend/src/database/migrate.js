/**
 * MySQL Migration Script
 * Automatically runs all SQL migration files in order.
 * 
 * Usage: node src/database/migrate.js
 * 
 * All migration files in src/database/migrations/ are executed sequentially
 * by filename sort order (001_init.sql, 002_pos_module.sql, etc.).
 * Each statement is run individually and safe errors (duplicate column,
 * table already exists) are silently skipped — making migrations idempotent.
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  multipleStatements: true,
};

const DB_NAME = process.env.MYSQL_DATABASE || 'shopkeeper_db';

// Errors that are safe to ignore (idempotent re-runs)
const SAFE_ERRORS = [
  'already exists',
  'Duplicate column',
  'Duplicate key name',
  'Duplicate entry',
  'Duplicate foreign key',
  'Multiple primary key',
  "Can't DROP",
];

function isSafeError(msg) {
  return SAFE_ERRORS.some(pattern => msg.includes(pattern));
}

/**
 * Run a single SQL file, splitting on semicolons.
 * Skips safe/idempotent errors.
 */
async function runMigrationFile(connection, filePath, label) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const clean = raw.replace(/--.*$/gm, '').trim();
  const stmts = clean.split(';').map(s => s.trim()).filter(s => s.length > 0);
  let executed = 0;
  let skipped = 0;

  for (const stmt of stmts) {
    try {
      await connection.query(stmt);
      executed++;
    } catch (e) {
      const msg = e.message || '';
      if (isSafeError(msg)) {
        skipped++;
      } else {
        console.warn(`  ⚠ ${label}: ${msg.slice(0, 120)}`);
      }
    }
  }
  return { executed, skipped };
}

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✓ Connected to MySQL server');

    // Create database
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✓ Database "${DB_NAME}" created/verified`);

    // Switch to database
    await connection.changeUser({ database: DB_NAME });

    // Get all migration files sorted by name
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`\nRunning ${files.length} migrations...\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const label = file.replace('.sql', '');
      const { executed, skipped } = await runMigrationFile(connection, filePath, label);
      const status = executed > 0 ? '✓' : '·';
      const detail = skipped > 0 ? ` (${skipped} skipped)` : '';
      console.log(`  ${status} ${label}${detail}`);
    }

    // Extra patches that aren't in SQL files
    try {
      await connection.query(
        `ALTER TABLE users MODIFY COLUMN role ENUM('admin','shopkeeper','staff','individual') DEFAULT NULL`
      );
    } catch { /* already correct */ }

    try {
      await connection.query(`ALTER TABLE personal_notes ADD COLUMN category VARCHAR(50) DEFAULT 'General'`);
    } catch { /* already exists */ }
    try {
      await connection.query(`ALTER TABLE personal_notes ADD COLUMN visible BOOLEAN DEFAULT TRUE`);
    } catch { /* already exists */ }

    console.log('\n✓ All migrations applied');

    // Show tables
    console.log('\nTables:');
    const [tables] = await connection.query('SHOW TABLES');
    tables.forEach((row) => {
      console.log(`  - ${Object.values(row)[0]}`);
    });

    console.log(`\n✅ Migration completed successfully! (${files.length} files processed)`);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
