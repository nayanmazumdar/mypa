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

    const adminUuid = uuidv4();
    const demoUuid = uuidv4();

    await connection.execute(
      `INSERT IGNORE INTO users (uuid, name, email, phone, password, role, shop_name, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [adminUuid, 'Admin', 'admin@shopkeeper.com', '9876543210', adminPassword, 'admin', 'Admin Shop', '123 Admin Street']
    );
    await connection.execute(
      `INSERT IGNORE INTO users (uuid, name, email, phone, password, role, shop_name, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [demoUuid, 'Demo Shopkeeper', 'demo@shopkeeper.com', '9876543211', demoPassword, 'admin', 'Demo General Store', '456 Market Road, City']
    );
    console.log('  ✓ 2 users seeded');

    // Get user IDs
    const [[demoUser]] = await connection.execute("SELECT id FROM users WHERE email = 'demo@shopkeeper.com'");
    const [[adminUser]] = await connection.execute("SELECT id FROM users WHERE email = 'admin@shopkeeper.com'");
    const userId = demoUser.id;

    // --- SHOP ---
    console.log('\nSeeding shop...');
    const shopUuid = uuidv4();
    await connection.execute(
      `INSERT IGNORE INTO shops (uuid, name, address, phone, email, gst_number, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [shopUuid, 'Demo General Store', '456 Market Road, City', '9876543211', 'demo@shopkeeper.com', '27AABCD1234E1ZF', userId]
    );
    const [[shop]] = await connection.execute("SELECT id FROM shops WHERE uuid = ?", [shopUuid]);
    const shopId = shop.id;

    // Update users with shop_id
    await connection.execute('UPDATE users SET shop_id = ? WHERE id = ?', [shopId, userId]);
    await connection.execute('UPDATE users SET shop_id = ? WHERE id = ?', [shopId, adminUser.id]);

    // Add to user_shops junction table
    await connection.execute(
      `INSERT IGNORE INTO user_shops (user_id, shop_id, role) VALUES (?, ?, ?), (?, ?, ?)`,
      [userId, shopId, 'admin', adminUser.id, shopId, 'admin']
    );
    console.log(`  ✓ Shop created (id: ${shopId})`);

    // --- CATEGORIES ---
    console.log('\nSeeding categories...');
    const catNames = ['Groceries', 'Beverages', 'Snacks', 'Personal Care', 'Dairy', 'Stationery', 'Household'];
    const catDescs = ['Daily grocery items', 'Drinks and beverages', 'Packaged snacks and chips', 'Soaps, shampoos, hygiene', 'Milk, curd, cheese products', 'Pens, notebooks, office supplies', 'Cleaning and household items'];
    for (let i = 0; i < catNames.length; i++) {
      await connection.execute(
        'INSERT IGNORE INTO categories (user_id, shop_id, name, description) VALUES (?, ?, ?, ?)',
        [userId, shopId, catNames[i], catDescs[i]]
      );
    }
    console.log(`  ✓ ${catNames.length} categories seeded`);

    // Get category IDs
    const [cats] = await connection.execute('SELECT id, name FROM categories WHERE shop_id = ? ORDER BY id', [shopId]);
    const catMap = {};
    cats.forEach(c => catMap[c.name] = c.id);

    // --- PRODUCTS ---
    console.log('\nSeeding products...');
    const products = [
      { name: 'Tata Salt 1kg', sku: 'SKU-001', cat: 'Groceries', desc: 'Iodized salt', pp: 18, sp: 25, unit: 'packet', tax: 0 },
      { name: 'Aashirvaad Atta 5kg', sku: 'SKU-002', cat: 'Groceries', desc: 'Whole wheat flour', pp: 210, sp: 280, unit: 'packet', tax: 5 },
      { name: 'Fortune Sunflower Oil 1L', sku: 'SKU-003', cat: 'Groceries', desc: 'Refined sunflower oil', pp: 120, sp: 155, unit: 'bottle', tax: 5 },
      { name: 'Toor Dal 1kg', sku: 'SKU-004', cat: 'Groceries', desc: 'Yellow lentils', pp: 110, sp: 140, unit: 'packet', tax: 5 },
      { name: 'Basmati Rice 5kg', sku: 'SKU-005', cat: 'Groceries', desc: 'Premium basmati rice', pp: 350, sp: 450, unit: 'packet', tax: 5 },
      { name: 'Coca-Cola 2L', sku: 'SKU-006', cat: 'Beverages', desc: 'Cold drink', pp: 72, sp: 95, unit: 'bottle', tax: 12 },
      { name: 'Parle Frooti 600ml', sku: 'SKU-007', cat: 'Beverages', desc: 'Mango drink', pp: 25, sp: 35, unit: 'bottle', tax: 12 },
      { name: 'Red Bull 250ml', sku: 'SKU-008', cat: 'Beverages', desc: 'Energy drink', pp: 95, sp: 125, unit: 'piece', tax: 12 },
      { name: 'Bisleri Water 1L', sku: 'SKU-009', cat: 'Beverages', desc: 'Packaged drinking water', pp: 15, sp: 20, unit: 'bottle', tax: 0 },
      { name: 'Lays Classic Salted', sku: 'SKU-010', cat: 'Snacks', desc: 'Potato chips 52g', pp: 15, sp: 20, unit: 'packet', tax: 12 },
      { name: 'Kurkure Masala Munch', sku: 'SKU-011', cat: 'Snacks', desc: 'Corn puffs 90g', pp: 15, sp: 20, unit: 'packet', tax: 12 },
      { name: 'Haldiram Namkeen 200g', sku: 'SKU-012', cat: 'Snacks', desc: 'Mixed namkeen', pp: 40, sp: 55, unit: 'packet', tax: 12 },
      { name: 'Dove Soap 100g', sku: 'SKU-013', cat: 'Personal Care', desc: 'Moisturizing soap', pp: 42, sp: 58, unit: 'piece', tax: 12 },
      { name: 'Head & Shoulders 180ml', sku: 'SKU-014', cat: 'Personal Care', desc: 'Anti-dandruff shampoo', pp: 155, sp: 199, unit: 'bottle', tax: 12 },
      { name: 'Colgate MaxFresh 150g', sku: 'SKU-015', cat: 'Personal Care', desc: 'Toothpaste', pp: 85, sp: 110, unit: 'piece', tax: 12 },
      { name: 'Amul Milk 500ml', sku: 'SKU-016', cat: 'Dairy', desc: 'Toned milk', pp: 24, sp: 30, unit: 'packet', tax: 0 },
      { name: 'Amul Butter 100g', sku: 'SKU-017', cat: 'Dairy', desc: 'Pasteurized butter', pp: 48, sp: 57, unit: 'packet', tax: 12 },
      { name: 'Mother Dairy Curd 400g', sku: 'SKU-018', cat: 'Dairy', desc: 'Fresh curd', pp: 35, sp: 45, unit: 'piece', tax: 5 },
      { name: 'Maggi Noodles (4 pack)', sku: 'SKU-019', cat: 'Groceries', desc: 'Instant noodles', pp: 48, sp: 56, unit: 'packet', tax: 12 },
      { name: 'Sugar 1kg', sku: 'SKU-020', cat: 'Groceries', desc: 'White sugar', pp: 38, sp: 48, unit: 'packet', tax: 0 },
    ];

    const productIds = [];
    for (const p of products) {
      const uuid = uuidv4();
      const [result] = await connection.execute(
        `INSERT INTO products (uuid, user_id, shop_id, category_id, name, sku, description, purchase_price, selling_price, unit, tax_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid, userId, shopId, catMap[p.cat], p.name, p.sku, p.desc, p.pp, p.sp, p.unit, p.tax]
      );
      productIds.push(result.insertId);
    }
    console.log(`  ✓ ${products.length} products seeded`);

    // --- INVENTORY ---
    console.log('\nSeeding inventory...');
    const stockLevels = [50, 25, 30, 40, 15, 60, 80, 24, 100, 90, 70, 35, 45, 20, 30, 50, 25, 20, 100, 40];
    const minLevels =   [10, 5,  5,  10, 3,  12, 15, 6,  20,  20, 15, 10, 10, 5,  8,  20, 5,  10, 20,  10];

    for (let i = 0; i < productIds.length; i++) {
      await connection.execute(
        'INSERT INTO inventory (product_id, user_id, shop_id, quantity, min_stock_level, max_stock_level) VALUES (?, ?, ?, ?, ?, ?)',
        [productIds[i], userId, shopId, stockLevels[i], minLevels[i], stockLevels[i] * 3]
      );
    }
    console.log(`  ✓ ${productIds.length} inventory records seeded`);

    // --- CUSTOMERS ---
    console.log('\nSeeding customers...');
    const customers = [
      ['Rajesh Kumar', 'rajesh@email.com', '9811111111', '12 MG Road, Delhi', 0],
      ['Priya Sharma', 'priya@email.com', '9822222222', '45 Ring Road, Mumbai', 500],
      ['Amit Patel', 'amit@email.com', '9833333333', '78 Station Road, Ahmedabad', 0],
      ['Sunita Verma', null, '9844444444', '23 Market Lane, Jaipur', 250],
      ['Vikas Singh', 'vikas@email.com', '9855555555', '56 Gandhi Nagar, Lucknow', 0],
    ];
    const customerIds = [];
    for (const c of customers) {
      const uuid = uuidv4();
      const [result] = await connection.execute(
        'INSERT INTO customers (uuid, user_id, shop_id, name, email, phone, address, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uuid, userId, shopId, c[0], c[1], c[2], c[3], c[4]]
      );
      customerIds.push(result.insertId);
    }
    console.log(`  ✓ ${customers.length} customers seeded`);

    // --- SUPPLIERS ---
    console.log('\nSeeding suppliers...');
    const suppliers = [
      ['Wholesale Mart', 'contact@wholesalemart.com', '9900001111', 'Wholesale Mart Pvt Ltd', '101 Industrial Area, Delhi', '27AABCW1234A1ZA', 0],
      ['Fresh Dairy Suppliers', 'dairy@freshsupply.com', '9900002222', 'Fresh Dairy Co.', '22 Dairy Complex, Anand', '24AABCF5678B1ZB', 0],
      ['Beverage Distributors', 'sales@bevdist.com', '9900003333', 'Bev Distributors LLP', '33 MIDC, Pune', '27AABCB9012C1ZC', 0],
      ['FMCG Direct', null, '9900004444', 'FMCG Direct India', '44 Sector 12, Noida', null, 1200],
    ];
    const supplierIds = [];
    for (const s of suppliers) {
      const uuid = uuidv4();
      const [result] = await connection.execute(
        'INSERT INTO suppliers (uuid, user_id, shop_id, name, email, phone, company, address, gst_number, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uuid, userId, shopId, s[0], s[1], s[2], s[3], s[4], s[5], s[6]]
      );
      supplierIds.push(result.insertId);
    }
    console.log(`  ✓ ${suppliers.length} suppliers seeded`);

    // --- SALES ---
    console.log('\nSeeding sales...');
    const sales = [
      { cust: 0, inv: 'INV-20260601-001', total: 280, disc: 0, tax: 14, net: 294, pstatus: 'paid', pm: 'cash', status: 'completed', date: '2026-06-28' },
      { cust: 1, inv: 'INV-20260601-002', total: 560, disc: 20, tax: 27, net: 567, pstatus: 'paid', pm: 'upi', status: 'completed', date: '2026-06-29' },
      { cust: null, inv: 'INV-20260601-003', total: 95, disc: 0, tax: 11.4, net: 106.4, pstatus: 'paid', pm: 'cash', status: 'completed', date: '2026-06-30' },
      { cust: 2, inv: 'INV-20260601-004', total: 450, disc: 0, tax: 22.5, net: 472.5, pstatus: 'unpaid', pm: 'cash', status: 'completed', date: '2026-07-01' },
      { cust: 0, inv: 'INV-20260701-005', total: 155, disc: 0, tax: 7.75, net: 162.75, pstatus: 'paid', pm: 'card', status: 'completed', date: '2026-07-02' },
    ];
    const saleIds = [];
    for (const s of sales) {
      const uuid = uuidv4();
      const custId = s.cust !== null ? customerIds[s.cust] : null;
      const [result] = await connection.execute(
        `INSERT INTO sales (uuid, user_id, shop_id, customer_id, invoice_number, total_amount, discount, tax_amount, net_amount, payment_status, payment_method, status, sale_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid, userId, shopId, custId, s.inv, s.total, s.disc, s.tax, s.net, s.pstatus, s.pm, s.status, s.date]
      );
      saleIds.push(result.insertId);
    }
    console.log(`  ✓ ${sales.length} sales seeded`);

    // Sale items
    const saleItems = [
      [saleIds[0], productIds[1], 1, 280, 0, 280],
      [saleIds[1], productIds[0], 2, 25, 0, 50],
      [saleIds[1], productIds[1], 1, 280, 0, 280],
      [saleIds[1], productIds[4], 1, 450, 20, 230],
      [saleIds[2], productIds[5], 1, 95, 0, 95],
      [saleIds[3], productIds[4], 1, 450, 0, 450],
      [saleIds[4], productIds[2], 1, 155, 0, 155],
    ];
    for (const si of saleItems) {
      await connection.execute(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, ?, ?)', si
      );
    }
    console.log(`  ✓ ${saleItems.length} sale items seeded`);

    // --- PURCHASES ---
    console.log('\nSeeding purchases...');
    const purchases = [
      { sup: 0, inv: 'PUR-20260601-001', total: 5000, disc: 0, tax: 250, net: 5250, pstatus: 'paid', pm: 'bank_transfer', status: 'completed', date: '2026-06-25' },
      { sup: 1, inv: 'PUR-20260601-002', total: 2400, disc: 100, tax: 0, net: 2300, pstatus: 'paid', pm: 'upi', status: 'completed', date: '2026-06-27' },
      { sup: 2, inv: 'PUR-20260601-003', total: 3600, disc: 0, tax: 432, net: 4032, pstatus: 'unpaid', pm: 'cash', status: 'completed', date: '2026-06-30' },
    ];
    const purchaseIds = [];
    for (const p of purchases) {
      const uuid = uuidv4();
      const [result] = await connection.execute(
        `INSERT INTO purchases (uuid, user_id, shop_id, supplier_id, invoice_number, total_amount, discount, tax_amount, net_amount, payment_status, payment_method, status, purchase_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid, userId, shopId, supplierIds[p.sup], p.inv, p.total, p.disc, p.tax, p.net, p.pstatus, p.pm, p.status, p.date]
      );
      purchaseIds.push(result.insertId);
    }
    console.log(`  ✓ ${purchases.length} purchases seeded`);

    // Purchase items
    const purchaseItems = [
      [purchaseIds[0], productIds[0], 100, 18, 1800],
      [purchaseIds[0], productIds[1], 10, 210, 2100],
      [purchaseIds[0], productIds[3], 10, 110, 1100],
      [purchaseIds[1], productIds[15], 50, 24, 1200],
      [purchaseIds[1], productIds[16], 25, 48, 1200],
      [purchaseIds[2], productIds[5], 50, 72, 3600],
    ];
    for (const pi of purchaseItems) {
      await connection.execute(
        'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)', pi
      );
    }
    console.log(`  ✓ ${purchaseItems.length} purchase items seeded`);

    // --- PAYMENTS ---
    console.log('\nSeeding payments...');
    const payments = [
      [userId, shopId, 'sale', saleIds[0], 294, 'cash'],
      [userId, shopId, 'sale', saleIds[1], 567, 'upi'],
      [userId, shopId, 'sale', saleIds[2], 106.4, 'cash'],
      [userId, shopId, 'sale', saleIds[4], 162.75, 'card'],
      [userId, shopId, 'purchase', purchaseIds[0], 5250, 'bank_transfer'],
      [userId, shopId, 'purchase', purchaseIds[1], 2300, 'upi'],
    ];
    for (const pay of payments) {
      await connection.execute(
        'INSERT INTO payments (user_id, shop_id, reference_type, reference_id, amount, payment_method) VALUES (?, ?, ?, ?, ?, ?)', pay
      );
    }
    console.log(`  ✓ ${payments.length} payments seeded`);

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin:      admin@shopkeeper.com / admin123');
    console.log('   Shopkeeper: demo@shopkeeper.com  / demo1234');
    console.log(`\n📦 Shop: "Demo General Store" (id: ${shopId})`);

  } catch (error) {
    console.error('✗ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seed();
