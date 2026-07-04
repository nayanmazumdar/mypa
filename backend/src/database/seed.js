/**
 * MySQL Seeder Script
 * Seeds the database with sample data for development/testing.
 * 
 * Usage: node src/database/seed.js
 * 
 * Default accounts:
 *   Admin:      admin@shopkeeper.com / admin123
 *   Shopkeeper: demo@shopkeeper.com  / demo1234
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
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

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✓ Connected to MySQL');

    // --- USERS ---
    console.log('\nSeeding users...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const demoPassword = await bcrypt.hash('demo1234', 10);

    await connection.execute(
      `INSERT IGNORE INTO users (uuid, name, email, phone, password, role, shop_name, address) VALUES 
       (?, 'Admin', 'admin@shopkeeper.com', '9876543210', ?, 'admin', 'Admin Shop', '123 Admin Street'),
       (?, 'Demo Shopkeeper', 'demo@shopkeeper.com', '9876543211', ?, 'shopkeeper', 'Demo General Store', '456 Market Road, City')`,
      [uuidv4(), adminPassword, uuidv4(), demoPassword]
    );
    console.log('  ✓ 2 users seeded');

    // Get demo user ID for scoped data
    const [[demoUser]] = await connection.execute("SELECT id FROM users WHERE email = 'demo@shopkeeper.com'");
    const userId = demoUser.id;

    // --- CATEGORIES ---
    console.log('\nSeeding categories...');
    await connection.execute(
      `INSERT IGNORE INTO categories (user_id, name, description) VALUES 
       (?, 'Groceries', 'Daily grocery items'),
       (?, 'Beverages', 'Drinks and beverages'),
       (?, 'Snacks', 'Packaged snacks and chips'),
       (?, 'Personal Care', 'Soaps, shampoos, hygiene'),
       (?, 'Dairy', 'Milk, curd, cheese products'),
       (?, 'Stationery', 'Pens, notebooks, office supplies'),
       (?, 'Household', 'Cleaning and household items')`,
      [userId, userId, userId, userId, userId, userId, userId]
    );
    console.log('  ✓ 7 categories seeded');

    const [[cat1]] = await connection.execute("SELECT id FROM categories WHERE user_id = ? AND name = 'Groceries'", [userId]);
    const [[cat2]] = await connection.execute("SELECT id FROM categories WHERE user_id = ? AND name = 'Beverages'", [userId]);
    const [[cat3]] = await connection.execute("SELECT id FROM categories WHERE user_id = ? AND name = 'Snacks'", [userId]);
    const [[cat4]] = await connection.execute("SELECT id FROM categories WHERE user_id = ? AND name = 'Personal Care'", [userId]);
    const [[cat5]] = await connection.execute("SELECT id FROM categories WHERE user_id = ? AND name = 'Dairy'", [userId]);

    // --- PRODUCTS ---
    console.log('\nSeeding products...');
    const products = [
      [uuidv4(), userId, cat1.id, 'Tata Salt 1kg', 'SKU-001', null, 'Iodized salt', 18, 25, 'packet', 0],
      [uuidv4(), userId, cat1.id, 'Aashirvaad Atta 5kg', 'SKU-002', null, 'Whole wheat flour', 210, 280, 'packet', 5],
      [uuidv4(), userId, cat1.id, 'Fortune Sunflower Oil 1L', 'SKU-003', null, 'Refined sunflower oil', 120, 155, 'bottle', 5],
      [uuidv4(), userId, cat1.id, 'Toor Dal 1kg', 'SKU-004', null, 'Yellow lentils', 110, 140, 'packet', 5],
      [uuidv4(), userId, cat1.id, 'Basmati Rice 5kg', 'SKU-005', null, 'Premium basmati rice', 350, 450, 'packet', 5],
      [uuidv4(), userId, cat2.id, 'Coca-Cola 2L', 'SKU-006', null, 'Cold drink', 72, 95, 'bottle', 12],
      [uuidv4(), userId, cat2.id, 'Parle Frooti 600ml', 'SKU-007', null, 'Mango drink', 25, 35, 'bottle', 12],
      [uuidv4(), userId, cat2.id, 'Red Bull 250ml', 'SKU-008', null, 'Energy drink', 95, 125, 'can', 12],
      [uuidv4(), userId, cat2.id, 'Bisleri Water 1L', 'SKU-009', null, 'Packaged drinking water', 15, 20, 'bottle', 0],
      [uuidv4(), userId, cat3.id, 'Lays Classic Salted', 'SKU-010', null, 'Potato chips 52g', 15, 20, 'packet', 12],
      [uuidv4(), userId, cat3.id, 'Kurkure Masala Munch', 'SKU-011', null, 'Corn puffs 90g', 15, 20, 'packet', 12],
      [uuidv4(), userId, cat3.id, 'Haldiram Namkeen 200g', 'SKU-012', null, 'Mixed namkeen', 40, 55, 'packet', 12],
      [uuidv4(), userId, cat4.id, 'Dove Soap 100g', 'SKU-013', null, 'Moisturizing soap', 42, 58, 'piece', 12],
      [uuidv4(), userId, cat4.id, 'Head & Shoulders 180ml', 'SKU-014', null, 'Anti-dandruff shampoo', 155, 199, 'bottle', 12],
      [uuidv4(), userId, cat4.id, 'Colgate MaxFresh 150g', 'SKU-015', null, 'Toothpaste', 85, 110, 'tube', 12],
      [uuidv4(), userId, cat5.id, 'Amul Milk 500ml', 'SKU-016', null, 'Toned milk', 24, 30, 'packet', 0],
      [uuidv4(), userId, cat5.id, 'Amul Butter 100g', 'SKU-017', null, 'Pasteurized butter', 48, 57, 'packet', 12],
      [uuidv4(), userId, cat5.id, 'Mother Dairy Curd 400g', 'SKU-018', null, 'Fresh curd', 35, 45, 'cup', 5],
      [uuidv4(), userId, cat1.id, 'Maggi Noodles (4 pack)', 'SKU-019', null, 'Instant noodles', 48, 56, 'packet', 12],
      [uuidv4(), userId, cat1.id, 'Sugar 1kg', 'SKU-020', null, 'White sugar', 38, 48, 'packet', 0],
    ];

    for (const p of products) {
      await connection.execute(
        `INSERT INTO products (uuid, user_id, category_id, name, sku, barcode, description, purchase_price, selling_price, unit, tax_rate) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p
      );
    }
    console.log(`  ✓ ${products.length} products seeded`);

    // --- CUSTOMERS ---
    console.log('\nSeeding customers...');
    const customers = [
      [uuidv4(), userId, 'Rajesh Kumar', 'rajesh@email.com', '9811111111', '12 MG Road, Delhi', 0, 'Regular customer'],
      [uuidv4(), userId, 'Priya Sharma', 'priya@email.com', '9822222222', '45 Ring Road, Mumbai', 500, 'Loyal customer, weekly buyer'],
      [uuidv4(), userId, 'Amit Patel', 'amit@email.com', '9833333333', '78 Station Road, Ahmedabad', 0, null],
      [uuidv4(), userId, 'Sunita Verma', null, '9844444444', '23 Market Lane, Jaipur', 250, 'Credit customer'],
      [uuidv4(), userId, 'Vikas Singh', 'vikas@email.com', '9855555555', '56 Gandhi Nagar, Lucknow', 0, 'New customer'],
    ];

    for (const c of customers) {
      await connection.execute(
        `INSERT INTO customers (uuid, user_id, name, email, phone, address, balance, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        c
      );
    }
    console.log(`  ✓ ${customers.length} customers seeded`);

    // --- SUPPLIERS ---
    console.log('\nSeeding suppliers...');
    const suppliers = [
      [uuidv4(), userId, 'Wholesale Mart', 'contact@wholesalemart.com', '9900001111', 'Wholesale Mart Pvt Ltd', '101 Industrial Area, Delhi', '27AABCW1234A1ZA', 0],
      [uuidv4(), userId, 'Fresh Dairy Suppliers', 'dairy@freshsupply.com', '9900002222', 'Fresh Dairy Co.', '22 Dairy Complex, Anand', '24AABCF5678B1ZB', 0],
      [uuidv4(), userId, 'Beverage Distributors', 'sales@bevdist.com', '9900003333', 'Bev Distributors LLP', '33 MIDC, Pune', '27AABCB9012C1ZC', 0],
      [uuidv4(), userId, 'FMCG Direct', null, '9900004444', 'FMCG Direct India', '44 Sector 12, Noida', null, 1200],
    ];

    for (const s of suppliers) {
      await connection.execute(
        `INSERT INTO suppliers (uuid, user_id, name, email, phone, company, address, gst_number, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        s
      );
    }
    console.log(`  ✓ ${suppliers.length} suppliers seeded`);

    // --- INVENTORY ---
    console.log('\nSeeding inventory...');
    const [[firstProduct]] = await connection.execute('SELECT id FROM products WHERE user_id = ? ORDER BY id LIMIT 1', [userId]);
    const startId = firstProduct.id;

    const inventoryData = [
      [startId, userId, 50, 10, 200, 'Shelf A1'],
      [startId + 1, userId, 25, 5, 50, 'Shelf A2'],
      [startId + 2, userId, 30, 5, 60, 'Shelf A3'],
      [startId + 3, userId, 40, 10, 100, 'Shelf A4'],
      [startId + 4, userId, 15, 3, 30, 'Shelf A5'],
      [startId + 5, userId, 60, 12, 120, 'Shelf B1'],
      [startId + 6, userId, 80, 15, 150, 'Shelf B2'],
      [startId + 7, userId, 24, 6, 48, 'Shelf B3'],
      [startId + 8, userId, 100, 20, 200, 'Shelf B4'],
      [startId + 9, userId, 90, 20, 200, 'Shelf C1'],
      [startId + 10, userId, 70, 15, 150, 'Shelf C2'],
      [startId + 11, userId, 35, 10, 80, 'Shelf C3'],
      [startId + 12, userId, 45, 10, 100, 'Shelf D1'],
      [startId + 13, userId, 20, 5, 40, 'Shelf D2'],
      [startId + 14, userId, 30, 8, 60, 'Shelf D3'],
      [startId + 15, userId, 50, 20, 100, 'Cooler 1'],
      [startId + 16, userId, 25, 5, 50, 'Cooler 2'],
      [startId + 17, userId, 20, 10, 40, 'Cooler 3'],
      [startId + 18, userId, 100, 20, 200, 'Shelf A6'],
      [startId + 19, userId, 40, 10, 80, 'Shelf A7'],
    ];

    for (const inv of inventoryData) {
      await connection.execute(
        `INSERT INTO inventory (product_id, user_id, quantity, min_stock_level, max_stock_level, location) VALUES (?, ?, ?, ?, ?, ?)`,
        inv
      );
    }
    console.log(`  ✓ ${inventoryData.length} inventory records seeded`);

    // --- SALES ---
    console.log('\nSeeding sales...');
    const [[cust1]] = await connection.execute('SELECT id FROM customers WHERE user_id = ? ORDER BY id LIMIT 1', [userId]);

    const sales = [
      [uuidv4(), userId, cust1.id, 'INV-20260601-001', 280, 0, 14, 294, 'paid', 'cash', 'completed', null, '2026-06-28'],
      [uuidv4(), userId, cust1.id + 1, 'INV-20260601-002', 560, 20, 27, 567, 'paid', 'upi', 'completed', 'Bulk purchase', '2026-06-29'],
      [uuidv4(), userId, null, 'INV-20260601-003', 95, 0, 11.4, 106.4, 'paid', 'cash', 'completed', null, '2026-06-30'],
      [uuidv4(), userId, cust1.id + 2, 'INV-20260601-004', 450, 0, 22.5, 472.5, 'unpaid', 'cash', 'completed', 'Credit sale', '2026-07-01'],
      [uuidv4(), userId, cust1.id, 'INV-20260701-005', 155, 0, 7.75, 162.75, 'paid', 'card', 'completed', null, '2026-07-02'],
    ];

    for (const s of sales) {
      await connection.execute(
        `INSERT INTO sales (uuid, user_id, customer_id, invoice_number, total_amount, discount, tax_amount, net_amount, payment_status, payment_method, status, notes, sale_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        s
      );
    }
    console.log(`  ✓ ${sales.length} sales seeded`);

    // Sale items
    const [[sale1]] = await connection.execute("SELECT id FROM sales WHERE invoice_number = 'INV-20260601-001'");
    const [[sale2]] = await connection.execute("SELECT id FROM sales WHERE invoice_number = 'INV-20260601-002'");
    const [[sale3]] = await connection.execute("SELECT id FROM sales WHERE invoice_number = 'INV-20260601-003'");
    const [[sale4]] = await connection.execute("SELECT id FROM sales WHERE invoice_number = 'INV-20260601-004'");
    const [[sale5]] = await connection.execute("SELECT id FROM sales WHERE invoice_number = 'INV-20260701-005'");

    const saleItems = [
      [sale1.id, startId + 1, 1, 280, 0, 280],
      [sale2.id, startId, 2, 25, 0, 50],
      [sale2.id, startId + 1, 1, 280, 0, 280],
      [sale2.id, startId + 4, 1, 450, 20, 230],
      [sale3.id, startId + 5, 1, 95, 0, 95],
      [sale4.id, startId + 4, 1, 450, 0, 450],
      [sale5.id, startId + 2, 1, 155, 0, 155],
    ];

    for (const si of saleItems) {
      await connection.execute(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, ?, ?)',
        si
      );
    }
    console.log(`  ✓ ${saleItems.length} sale items seeded`);

    // --- PURCHASES ---
    console.log('\nSeeding purchases...');
    const [[supp1]] = await connection.execute('SELECT id FROM suppliers WHERE user_id = ? ORDER BY id LIMIT 1', [userId]);

    const purchases = [
      [uuidv4(), userId, supp1.id, 'PUR-20260601-001', 5000, 0, 250, 5250, 'paid', 'bank_transfer', 'completed', 'Monthly restock', '2026-06-25'],
      [uuidv4(), userId, supp1.id + 1, 'PUR-20260601-002', 2400, 100, 0, 2300, 'paid', 'upi', 'completed', 'Dairy restock', '2026-06-27'],
      [uuidv4(), userId, supp1.id + 2, 'PUR-20260601-003', 3600, 0, 432, 4032, 'unpaid', 'cash', 'completed', 'Beverages order', '2026-06-30'],
    ];

    for (const p of purchases) {
      await connection.execute(
        `INSERT INTO purchases (uuid, user_id, supplier_id, invoice_number, total_amount, discount, tax_amount, net_amount, payment_status, payment_method, status, notes, purchase_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p
      );
    }
    console.log(`  ✓ ${purchases.length} purchases seeded`);

    // Purchase items
    const [[pur1]] = await connection.execute("SELECT id FROM purchases WHERE invoice_number = 'PUR-20260601-001'");
    const [[pur2]] = await connection.execute("SELECT id FROM purchases WHERE invoice_number = 'PUR-20260601-002'");
    const [[pur3]] = await connection.execute("SELECT id FROM purchases WHERE invoice_number = 'PUR-20260601-003'");

    const purchaseItems = [
      [pur1.id, startId, 100, 18, 1800],
      [pur1.id, startId + 1, 10, 210, 2100],
      [pur1.id, startId + 3, 10, 110, 1100],
      [pur2.id, startId + 15, 50, 24, 1200],
      [pur2.id, startId + 16, 25, 48, 1200],
      [pur3.id, startId + 5, 50, 72, 3600],
    ];

    for (const pi of purchaseItems) {
      await connection.execute(
        'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
        pi
      );
    }
    console.log(`  ✓ ${purchaseItems.length} purchase items seeded`);

    // --- STOCK MOVEMENTS ---
    console.log('\nSeeding stock movements...');
    const movements = [
      [startId, userId, 'in', 100, 'purchase', pur1.id, 'Initial stock from PUR-20260601-001'],
      [startId + 1, userId, 'in', 10, 'purchase', pur1.id, 'Initial stock from PUR-20260601-001'],
      [startId + 3, userId, 'in', 10, 'purchase', pur1.id, 'Initial stock from PUR-20260601-001'],
      [startId + 15, userId, 'in', 50, 'purchase', pur2.id, 'Dairy restock'],
      [startId + 16, userId, 'in', 25, 'purchase', pur2.id, 'Dairy restock'],
      [startId + 5, userId, 'in', 50, 'purchase', pur3.id, 'Beverages order'],
      [startId + 1, userId, 'out', 1, 'sale', sale1.id, 'Sale INV-20260601-001'],
      [startId, userId, 'out', 2, 'sale', sale2.id, 'Sale INV-20260601-002'],
      [startId + 5, userId, 'out', 1, 'sale', sale3.id, 'Sale INV-20260601-003'],
    ];

    for (const m of movements) {
      await connection.execute(
        'INSERT INTO stock_movements (product_id, user_id, type, quantity, reference_type, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        m
      );
    }
    console.log(`  ✓ ${movements.length} stock movements seeded`);

    // --- PAYMENTS ---
    console.log('\nSeeding payments...');
    const payments = [
      [userId, 'sale', sale1.id, 294, 'cash', null],
      [userId, 'sale', sale2.id, 567, 'upi', null],
      [userId, 'sale', sale3.id, 106.4, 'cash', null],
      [userId, 'sale', sale5.id, 162.75, 'card', null],
      [userId, 'purchase', pur1.id, 5250, 'bank_transfer', 'Monthly payment'],
      [userId, 'purchase', pur2.id, 2300, 'upi', null],
    ];

    for (const pay of payments) {
      await connection.execute(
        'INSERT INTO payments (user_id, reference_type, reference_id, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)',
        pay
      );
    }
    console.log(`  ✓ ${payments.length} payments seeded`);

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin:      admin@shopkeeper.com / admin123');
    console.log('   Shopkeeper: demo@shopkeeper.com  / demo1234');

  } catch (error) {
    console.error('✗ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seed();
