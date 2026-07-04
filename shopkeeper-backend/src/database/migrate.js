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
