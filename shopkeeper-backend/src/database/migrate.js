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
};

const DB_NAME = process.env.MYSQL_DATABASE || 'shopkeeper_db';

async function migrate() {
  let connection;
  try {
    // Connect without database to create it
    connection = await mysql.createConnection(config);
    console.log('✓ Connected to MySQL server');

    // Create database
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✓ Database "${DB_NAME}" created/verified`);

    // Switch to database
    await connection.changeUser({ database: DB_NAME });

    // Read and execute migration SQL
    const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await connection.execute(statement);
    }

    console.log('✓ All tables created successfully');
    console.log('\nTables:');
    const [tables] = await connection.execute('SHOW TABLES');
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
