/**
 * Seed vegetable products for POS demo.
 * Run after main seed: node src/database/seed-vegetables.js
 */
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
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

async function seedVegetables() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✓ Connected to MySQL');

    // Get demo user
    const [[user]] = await connection.execute("SELECT id FROM users WHERE email = 'demo@shopkeeper.com'");
    if (!user) {
      console.error('✗ Demo user not found. Run npm run seed first.');
      process.exit(1);
    }
    const userId = user.id;

    // Create Vegetables category
    const [catResult] = await connection.execute(
      'INSERT IGNORE INTO categories (user_id, name, description) VALUES (?, ?, ?)',
      [userId, 'Vegetables', 'Fresh vegetables sold by weight']
    );
    let catId;
    if (catResult.insertId) {
      catId = catResult.insertId;
    } else {
      const [[cat]] = await connection.execute("SELECT id FROM categories WHERE user_id = ? AND name = 'Vegetables'", [userId]);
      catId = cat.id;
    }

    // Create Fruits category
    const [fruitCatResult] = await connection.execute(
      'INSERT IGNORE INTO categories (user_id, name, description) VALUES (?, ?, ?)',
      [userId, 'Fruits', 'Fresh fruits sold by weight']
    );
    let fruitCatId;
    if (fruitCatResult.insertId) {
      fruitCatId = fruitCatResult.insertId;
    } else {
      const [[cat]] = await connection.execute("SELECT id FROM categories WHERE user_id = ? AND name = 'Fruits'", [userId]);
      fruitCatId = cat.id;
    }

    console.log('\nSeeding vegetables...');
    const vegetables = [
      [uuidv4(), userId, catId, 'Tomato', 'VEG-001', 20, 40, 'kg'],
      [uuidv4(), userId, catId, 'Onion', 'VEG-002', 25, 45, 'kg'],
      [uuidv4(), userId, catId, 'Potato', 'VEG-003', 18, 35, 'kg'],
      [uuidv4(), userId, catId, 'Green Chili', 'VEG-004', 40, 80, 'kg'],
      [uuidv4(), userId, catId, 'Cauliflower', 'VEG-005', 20, 40, 'piece'],
      [uuidv4(), userId, catId, 'Cabbage', 'VEG-006', 15, 30, 'piece'],
      [uuidv4(), userId, catId, 'Brinjal', 'VEG-007', 25, 50, 'kg'],
      [uuidv4(), userId, catId, 'Capsicum', 'VEG-008', 50, 100, 'kg'],
      [uuidv4(), userId, catId, 'Carrot', 'VEG-009', 30, 60, 'kg'],
      [uuidv4(), userId, catId, 'Beans', 'VEG-010', 40, 80, 'kg'],
      [uuidv4(), userId, catId, 'Spinach', 'VEG-011', 10, 25, 'piece'],
      [uuidv4(), userId, catId, 'Coriander', 'VEG-012', 5, 10, 'piece'],
      [uuidv4(), userId, catId, 'Methi (Fenugreek)', 'VEG-013', 8, 20, 'piece'],
      [uuidv4(), userId, catId, 'Bitter Gourd', 'VEG-014', 30, 60, 'kg'],
      [uuidv4(), userId, catId, 'Lady Finger', 'VEG-015', 35, 70, 'kg'],
      [uuidv4(), userId, catId, 'Ginger', 'VEG-016', 80, 160, 'kg'],
      [uuidv4(), userId, catId, 'Garlic', 'VEG-017', 100, 200, 'kg'],
      [uuidv4(), userId, catId, 'Cucumber', 'VEG-018', 15, 30, 'kg'],
      [uuidv4(), userId, catId, 'Bottle Gourd', 'VEG-019', 15, 30, 'piece'],
      [uuidv4(), userId, catId, 'Radish', 'VEG-020', 20, 40, 'kg'],
    ];

    for (const v of vegetables) {
      await connection.execute(
        'INSERT IGNORE INTO products (uuid, user_id, category_id, name, sku, purchase_price, selling_price, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        v
      );
    }
    console.log(`  ✓ ${vegetables.length} vegetables seeded`);

    console.log('\nSeeding fruits...');
    const fruits = [
      [uuidv4(), userId, fruitCatId, 'Apple', 'FRT-001', 80, 150, 'kg'],
      [uuidv4(), userId, fruitCatId, 'Banana', 'FRT-002', 30, 50, 'piece'],
      [uuidv4(), userId, fruitCatId, 'Mango', 'FRT-003', 60, 120, 'kg'],
      [uuidv4(), userId, fruitCatId, 'Grapes', 'FRT-004', 50, 100, 'kg'],
      [uuidv4(), userId, fruitCatId, 'Watermelon', 'FRT-005', 10, 25, 'kg'],
      [uuidv4(), userId, fruitCatId, 'Papaya', 'FRT-006', 20, 40, 'kg'],
      [uuidv4(), userId, fruitCatId, 'Pomegranate', 'FRT-007', 80, 160, 'kg'],
      [uuidv4(), userId, fruitCatId, 'Guava', 'FRT-008', 30, 60, 'kg'],
      [uuidv4(), userId, fruitCatId, 'Orange', 'FRT-009', 40, 80, 'kg'],
      [uuidv4(), userId, fruitCatId, 'Lemon', 'FRT-010', 60, 120, 'kg'],
    ];

    for (const f of fruits) {
      await connection.execute(
        'INSERT IGNORE INTO products (uuid, user_id, category_id, name, sku, purchase_price, selling_price, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        f
      );
    }
    console.log(`  ✓ ${fruits.length} fruits seeded`);

    // Add inventory for vegetables
    console.log('\nSeeding inventory...');
    const [[firstVeg]] = await connection.execute("SELECT id FROM products WHERE sku = 'VEG-001' AND user_id = ?", [userId]);
    if (firstVeg) {
      const startId = firstVeg.id;
      for (let i = 0; i < 20; i++) {
        await connection.execute(
          'INSERT IGNORE INTO inventory (product_id, user_id, quantity, min_stock_level, max_stock_level) VALUES (?, ?, ?, ?, ?)',
          [startId + i, userId, Math.floor(Math.random() * 50) + 10, 5, 100]
        );
      }
    }
    const [[firstFruit]] = await connection.execute("SELECT id FROM products WHERE sku = 'FRT-001' AND user_id = ?", [userId]);
    if (firstFruit) {
      for (let i = 0; i < 10; i++) {
        await connection.execute(
          'INSERT IGNORE INTO inventory (product_id, user_id, quantity, min_stock_level, max_stock_level) VALUES (?, ?, ?, ?, ?)',
          [firstFruit.id + i, userId, Math.floor(Math.random() * 30) + 5, 3, 50]
        );
      }
    }
    console.log('  ✓ Inventory seeded for vegetables and fruits');

    console.log('\n✅ Vegetable & Fruit POS data seeded!');
  } catch (error) {
    console.error('✗ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seedVegetables();
