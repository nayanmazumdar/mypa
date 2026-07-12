/**
 * MySQL Migration Script
 * Creates the shopkeeper_db database and all tables.
 * 
 * Usage: node src/database/migrate.js
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

async function migrate() {
  let connection;
  try {
    // Connect without database to create it
    connection = await mysql.createConnection(config);
    console.log('✓ Connected to MySQL server');

    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✓ Database "${DB_NAME}" created/verified`);

    // Switch to database
    await connection.changeUser({ database: DB_NAME });

    // Read and execute migration SQL (multipleStatements enabled)
    const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await connection.query(sql);

    const migration2Path = path.join(__dirname, 'migrations', '002_pos_module.sql');
    if (fs.existsSync(migration2Path)) {
      const sql2 = fs.readFileSync(migration2Path, 'utf8');
      await connection.query(sql2);
    }

    // Migration 3: Multi-tenant
    const migration3Path = path.join(__dirname, 'migrations', '003_multi_tenant.sql');
    if (fs.existsSync(migration3Path)) {
      try {
        const sql3 = fs.readFileSync(migration3Path, 'utf8');
        await connection.query(sql3);
      } catch (e) {
        // Ignore "column already exists" errors for re-running
        if (!e.message.includes('Duplicate column')) throw e;
      }
    }

    // Migration 4: Advanced product fields
    const migration4Path = path.join(__dirname, 'migrations', '004_product_fields.sql');
    if (fs.existsSync(migration4Path)) {
      try {
        const sql4 = fs.readFileSync(migration4Path, 'utf8');
        await connection.query(sql4);
      } catch (e) {
        if (!e.message.includes('Duplicate column')) throw e;
      }
    }

    // Migration 5: Offers
    const migration5Path = path.join(__dirname, 'migrations', '005_offers.sql');
    if (fs.existsSync(migration5Path)) {
      try {
        const sql5 = fs.readFileSync(migration5Path, 'utf8');
        await connection.query(sql5);
      } catch (e) {
        if (!e.message.includes('already exists')) throw e;
      }
    }

    // Migration 6: Auth enhancements + Customer Ledger
    const migration6Path = path.join(__dirname, 'migrations', '006_customer_ledger.sql');
    if (fs.existsSync(migration6Path)) {
      const sql6 = fs.readFileSync(migration6Path, 'utf8');
      // Remove comment-only lines and split by semicolon
      const cleanSql = sql6.replace(/--.*$/gm, '').trim();
      const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await connection.query(stmt);
        } catch (e) {
          const msg = e.message || '';
          if (msg.includes('already exists') || msg.includes('Duplicate column') ||
              msg.includes('Duplicate key name') || msg.includes('Duplicate entry') ||
              msg.includes('Duplicate foreign key')) {
            // Idempotent — skip
          } else {
            console.warn('  ⚠ Migration 6 warning:', msg.slice(0, 100));
          }
        }
      }
    }

    // Helper: run a SQL file splitting on semicolons, ignoring safe errors
    async function runMigrationFile(filePath, label) {
      if (!fs.existsSync(filePath)) return;
      const raw = fs.readFileSync(filePath, 'utf8');
      const clean = raw.replace(/--.*$/gm, '').trim();
      const stmts = clean.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of stmts) {
        try {
          await connection.query(stmt);
        } catch (e) {
          const msg = e.message || '';
          if (
            msg.includes('already exists') || msg.includes('Duplicate column') ||
            msg.includes('Duplicate key name') || msg.includes('Duplicate entry') ||
            msg.includes('Duplicate foreign key') || msg.includes('Multiple primary key') ||
            msg.includes("Can't DROP") || msg.includes('already exists')
          ) {
            // Safe to skip — idempotent migration
          } else {
            console.warn(`  ⚠ ${label} warning:`, msg.slice(0, 120));
          }
        }
      }
    }

    // Migration 7: Individual role — personal_expenses, personal_incomes, personal_tasks
    await runMigrationFile(
      path.join(__dirname, 'migrations', '007_individual.sql'),
      'Migration 7'
    );

    // Migration 8: default_module column + role nullable
    await runMigrationFile(
      path.join(__dirname, 'migrations', '008_default_module.sql'),
      'Migration 8'
    );
    // Also make role nullable (handled in apply-008 but not in sql file)
    try {
      await connection.query(
        `ALTER TABLE users MODIFY COLUMN role ENUM('admin','shopkeeper','staff','individual') DEFAULT NULL`
      );
    } catch (e) { /* already correct */ }

    // Migration 9: offer is_paused column
    await runMigrationFile(
      path.join(__dirname, 'migrations', '009_offer_paused.sql'),
      'Migration 9'
    );

    console.log('✓ All tables created successfully');

    // Show created tables
    console.log('\nTables:');
    const [tables] = await connection.query('SHOW TABLES');
    tables.forEach((row) => {
      const tableName = Object.values(row)[0];
      console.log(`  - ${tableName}`);
    });

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
