/**
 * MySQL Migration Script with Changeset History
 * 
 * Tracks which migrations have already been applied in a `migration_history`
 * table. Only pending migrations are executed — already-applied ones are skipped.
 * 
 * Usage: node src/database/migrate.js [--force] [--status]
 * 
 * Flags:
 *   --force   Re-run all migrations regardless of history (legacy behavior)
 *   --status  Show migration status without running anything
 * 
 * All migration files in src/database/migrations/ are executed sequentially
 * by filename sort order (001_init.sql, 002_pos_module.sql, etc.).
 * Each statement is run individually and safe errors (duplicate column,
 * table already exists) are silently skipped — making migrations idempotent.
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
const args = process.argv.slice(2);
const FORCE_MODE = args.includes('--force');
const STATUS_ONLY = args.includes('--status');

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
 * Compute checksum of a migration file for change detection.
 */
function fileChecksum(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Create the migration_history table if it doesn't exist.
 */
async function ensureHistoryTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS migration_history (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      filename      VARCHAR(255) NOT NULL UNIQUE,
      checksum      VARCHAR(64)  NOT NULL,
      executed_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      execution_ms  INT UNSIGNED DEFAULT 0,
      status        ENUM('success', 'failed') NOT NULL DEFAULT 'success',
      statements    INT UNSIGNED DEFAULT 0,
      skipped       INT UNSIGNED DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

/**
 * Get set of already-applied migration filenames.
 */
async function getAppliedMigrations(connection) {
  const [rows] = await connection.query(
    'SELECT filename, checksum FROM migration_history WHERE status = ?',
    ['success']
  );
  const map = new Map();
  rows.forEach(r => map.set(r.filename, r.checksum));
  return map;
}

/**
 * Record a migration execution in history.
 */
async function recordMigration(connection, filename, checksum, executionMs, stmtCount, skipCount, status) {
  await connection.query(
    `INSERT INTO migration_history (filename, checksum, execution_ms, statements, skipped, status)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE checksum=VALUES(checksum), executed_at=CURRENT_TIMESTAMP,
       execution_ms=VALUES(execution_ms), statements=VALUES(statements),
       skipped=VALUES(skipped), status=VALUES(status)`,
    [filename, checksum, executionMs, stmtCount, skipCount, status]
  );
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

/**
 * Show migration status table.
 */
async function showStatus(connection, files, migrationsDir, applied) {
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  Migration Status                                               │');
  console.log('├──────────────────────────────────┬──────────┬───────────────────┤');
  console.log('│  Migration                       │  Status  │  Applied At       │');
  console.log('├──────────────────────────────────┼──────────┼───────────────────┤');

  const [history] = await connection.query(
    'SELECT filename, executed_at, status FROM migration_history ORDER BY filename'
  );
  const historyMap = new Map(history.map(h => [h.filename, h]));

  let pending = 0;
  for (const file of files) {
    const record = historyMap.get(file);
    const label = file.replace('.sql', '').padEnd(32);
    if (record && record.status === 'success') {
      const date = new Date(record.executed_at).toISOString().slice(0, 16).replace('T', ' ');
      console.log(`│  ${label}│  ✓ Done  │  ${date}  │`);
    } else if (record && record.status === 'failed') {
      console.log(`│  ${label}│  ✗ Fail  │  —                │`);
      pending++;
    } else {
      console.log(`│  ${label}│  ○ Pend  │  —                │`);
      pending++;
    }
  }

  console.log('└──────────────────────────────────┴──────────┴───────────────────┘');
  console.log(`\n  Total: ${files.length} | Applied: ${files.length - pending} | Pending: ${pending}\n`);
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

    // Ensure migration_history table exists
    await ensureHistoryTable(connection);

    // Get all migration files sorted by name
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Get already-applied migrations
    let applied = await getAppliedMigrations(connection);

    // First-time setup: if history is empty but tables already exist,
    // backfill history so we don't re-run old migrations
    if (applied.size === 0 && !FORCE_MODE) {
      const [tables] = await connection.query('SHOW TABLES');
      const tableNames = tables.map(r => Object.values(r)[0]);
      if (tableNames.includes('users') && tableNames.includes('shops')) {
        console.log('  ℹ Existing database detected — backfilling migration history...');
        for (const file of files) {
          const filePath = path.join(migrationsDir, file);
          const checksum = fileChecksum(filePath);
          await recordMigration(connection, file, checksum, 0, 0, 0, 'success');
        }
        applied = await getAppliedMigrations(connection);
        console.log(`  ✓ ${files.length} migrations marked as applied\n`);
      }
    }

    // Status-only mode
    if (STATUS_ONLY) {
      await showStatus(connection, files, migrationsDir, applied);
      return;
    }

    // Determine pending migrations
    const pending = FORCE_MODE
      ? files
      : files.filter(f => !applied.has(f));

    if (pending.length === 0) {
      console.log(`\n✓ All ${files.length} migrations already applied. Nothing to do.\n`);
      return;
    }

    console.log(`\nRunning ${pending.length} pending migration(s) (${files.length - pending.length} already applied)...\n`);

    let totalExecuted = 0;
    let totalSkipped = 0;

    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const label = file.replace('.sql', '');
      const checksum = fileChecksum(filePath);

      // Check if file was modified since last run (in force mode)
      if (FORCE_MODE && applied.has(file) && applied.get(file) === checksum) {
        console.log(`  · ${label} (unchanged, skipping)`);
        continue;
      }

      const start = Date.now();
      const { executed, skipped } = await runMigrationFile(connection, filePath, label);
      const elapsed = Date.now() - start;

      // Record in history
      await recordMigration(connection, file, checksum, elapsed, executed, skipped, 'success');

      const status = executed > 0 ? '✓' : '·';
      const detail = skipped > 0 ? ` (${skipped} skipped)` : '';
      const timing = elapsed > 100 ? ` [${elapsed}ms]` : '';
      console.log(`  ${status} ${label}${detail}${timing}`);

      totalExecuted += executed;
      totalSkipped += skipped;
    }

    // Extra patches that aren't in SQL files (legacy — keep for backward compat)
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

    console.log(`\n✓ Migration complete: ${pending.length} applied, ${totalExecuted} statements, ${totalSkipped} skipped`);

    // Show tables
    console.log('\nTables:');
    const [tables] = await connection.query('SHOW TABLES');
    tables.forEach((row) => {
      console.log(`  - ${Object.values(row)[0]}`);
    });

    console.log(`\n✅ Migration completed successfully!`);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
