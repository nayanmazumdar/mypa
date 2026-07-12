/**
 * Test setup — creates a test database, runs migrations, seeds minimal data.
 * Each test file gets a fresh token for authenticated requests.
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Override env for tests
process.env.NODE_ENV = 'test';
process.env.MYSQL_DATABASE = 'shopkeeper_test_db';
process.env.JWT_SECRET = 'test_jwt_secret_key';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  multipleStatements: true,
};

const DB_NAME = 'shopkeeper_test_db';

let connection;

async function setupTestDB() {
  connection = await mysql.createConnection(dbConfig);
  await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
  await connection.query(`CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.changeUser({ database: DB_NAME });

  // Run migrations 001-006
  const migrationsDir = path.join(__dirname, '../src/database/migrations');
  const files = ['001_init.sql', '002_pos_module.sql', '003_multi_tenant.sql', '004_product_fields.sql', '005_offers.sql', '006_customer_ledger.sql'];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    if (!fs.existsSync(filePath)) continue;
    const sql = fs.readFileSync(filePath, 'utf8');
    const cleanSql = sql.replace(/--.*$/gm, '').trim();
    const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      try {
        await connection.query(stmt);
      } catch (e) {
        if (!e.message.includes('already exists') && !e.message.includes('Duplicate column') &&
            !e.message.includes('Duplicate key') && !e.message.includes('Duplicate foreign key')) {
          // Ignore non-critical migration errors in test
        }
      }
    }
  }

  return connection;
}

async function seedTestData(conn) {
  const password = await bcrypt.hash('Test1234', 10);
  const userUuid = uuidv4();
  const shopUuid = uuidv4();

  // Create user
  const [userResult] = await conn.execute(
    'INSERT INTO users (uuid, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
    [userUuid, 'Test Admin', 'test@shopkeeper.com', '9999999999', password, 'admin']
  );
  const userId = userResult.insertId;

  // Create shop
  const [shopResult] = await conn.execute(
    'INSERT INTO shops (uuid, name, address, phone, owner_id) VALUES (?, ?, ?, ?, ?)',
    [shopUuid, 'Test Shop', '123 Test Street', '9999999999', userId]
  );
  const shopId = shopResult.insertId;

  // Link user to shop
  await conn.execute('UPDATE users SET shop_id = ? WHERE id = ?', [shopId, userId]);
  await conn.execute('INSERT INTO user_shops (user_id, shop_id, role) VALUES (?, ?, ?)', [userId, shopId, 'admin']);

  // Create a category
  const [catResult] = await conn.execute(
    'INSERT INTO categories (user_id, shop_id, name, description) VALUES (?, ?, ?, ?)',
    [userId, shopId, 'Test Category', 'For testing']
  );
  const categoryId = catResult.insertId;

  // Create a product
  const [prodResult] = await conn.execute(
    'INSERT INTO products (uuid, user_id, shop_id, category_id, name, sku, purchase_price, selling_price, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, shopId, categoryId, 'Test Product', 'TST-001', 50, 100, 'piece']
  );
  const productId = prodResult.insertId;

  // Create inventory
  await conn.execute(
    'INSERT INTO inventory (product_id, user_id, shop_id, quantity, min_stock_level) VALUES (?, ?, ?, ?, ?)',
    [productId, userId, shopId, 50, 5]
  );

  // Create a customer
  const [custResult] = await conn.execute(
    'INSERT INTO customers (uuid, user_id, shop_id, name, phone, balance) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, shopId, 'Test Customer', '9888888888', 0]
  );
  const customerId = custResult.insertId;

  return { userId, shopId, categoryId, productId, customerId, userUuid };
}

async function teardownTestDB() {
  if (connection) {
    await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    await connection.end();
  }
}

module.exports = { setupTestDB, seedTestData, teardownTestDB, DB_NAME };
