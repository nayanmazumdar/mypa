/**
 * Bulk Seeder - Seeds 1000+ records across all tables.
 * Usage: node src/database/seed-bulk.js
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

// Helper data
const FIRST_NAMES = ['Rahul','Amit','Priya','Sunita','Vikas','Neha','Ravi','Pooja','Arun','Deepa',
  'Sanjay','Meena','Rajesh','Kavita','Suresh','Anjali','Mohan','Rekha','Vijay','Swati',
  'Ashok','Nita','Dinesh','Geeta','Manoj','Sarita','Prakash','Usha','Ramesh','Lata'];
const LAST_NAMES = ['Kumar','Sharma','Patel','Singh','Verma','Gupta','Jain','Shah','Reddy','Nair',
  'Das','Rao','Mishra','Yadav','Pandey','Chauhan','Thakur','Joshi','Mehta','Chopra'];
const CITIES = ['Delhi','Mumbai','Bangalore','Chennai','Hyderabad','Pune','Ahmedabad','Kolkata',
  'Jaipur','Lucknow','Chandigarh','Indore','Bhopal','Nagpur','Surat','Vadodara','Patna','Ranchi'];
const STREETS = ['MG Road','Station Road','Ring Road','Market Lane','Gandhi Nagar','Civil Lines',
  'Sector 12','Phase 2','Industrial Area','Main Bazaar','Clock Tower','Bus Stand Road'];

const CATEGORIES_DATA = [
  'Vegetables','Fruits','Dairy','Groceries','Beverages','Snacks','Personal Care','Household',
  'Frozen Foods','Bakery','Meat & Fish','Spices','Oil & Ghee','Rice & Flour','Pulses & Lentils',
  'Confectionery','Baby Products','Pet Food','Organic','Ready to Eat'
];

const VEGETABLES = ['Tomato','Onion','Potato','Green Chili','Cauliflower','Cabbage','Brinjal',
  'Capsicum','Carrot','Beans','Spinach','Coriander','Methi','Bitter Gourd','Lady Finger',
  'Ginger','Garlic','Cucumber','Bottle Gourd','Radish','Pumpkin','Sweet Potato','Drumstick',
  'Mushroom','Corn','Peas','Beetroot','Turnip','Zucchini','Lettuce'];
const FRUITS = ['Apple','Banana','Mango','Grapes','Watermelon','Papaya','Pomegranate','Guava',
  'Orange','Lemon','Pineapple','Kiwi','Strawberry','Blueberry','Cherry','Peach','Plum',
  'Litchi','Coconut','Jackfruit','Sapota','Custard Apple','Fig','Dragon Fruit','Avocado'];

const DAIRY = ['Milk 500ml','Milk 1L','Curd 400g','Curd 1kg','Butter 100g','Butter 500g',
  'Cheese Slice','Paneer 200g','Paneer 500g','Cream 200ml','Ghee 500ml','Ghee 1L',
  'Buttermilk 500ml','Lassi 200ml','Ice Cream 500ml','Yogurt 100g'];

const GROCERIES = ['Tata Salt 1kg','Sugar 1kg','Sugar 5kg','Atta 5kg','Atta 10kg','Maida 1kg',
  'Besan 500g','Sooji 500g','Poha 500g','Rice 5kg','Basmati Rice 1kg','Brown Rice 1kg',
  'Toor Dal 1kg','Moong Dal 1kg','Chana Dal 1kg','Masoor Dal 1kg','Rajma 500g','Urad Dal 1kg',
  'Mustard Oil 1L','Sunflower Oil 1L','Groundnut Oil 1L','Olive Oil 500ml','Coconut Oil 500ml',
  'Turmeric 100g','Red Chili Powder 100g','Coriander Powder 100g','Cumin Seeds 100g',
  'Garam Masala 50g','Tea 250g','Tea 500g','Coffee 100g','Noodles Pack','Pasta 500g',
  'Oats 500g','Cornflakes 500g','Honey 500g','Jam 200g','Sauce 200g','Vinegar 500ml','Biscuits'];
const BEVERAGES = ['Coca-Cola 500ml','Coca-Cola 2L','Pepsi 500ml','Sprite 500ml','Fanta 500ml',
  'Frooti 200ml','Maaza 250ml','Red Bull 250ml','Bisleri 1L','Bisleri 500ml','Kinley 1L',
  'Appy Fizz 250ml','Thumbs Up 500ml','Mountain Dew 500ml','Limca 500ml','7Up 500ml',
  'Real Juice 1L','Tropicana 1L','Paper Boat 200ml','Glucon-D 500g','Tang 500g','Rooh Afza'];

const SNACKS = ['Lays Classic','Lays Magic Masala','Kurkure','Bingo Mad Angles','Uncle Chips',
  'Haldiram Bhujia','Haldiram Mixture','Namkeen 200g','Peanuts 200g','Cashews 100g',
  'Almonds 100g','Raisins 100g','Popcorn','Nachos','Makhana','Trail Mix','Granola Bar'];

const PERSONAL_CARE = ['Dove Soap','Lux Soap','Dettol Soap','Lifebuoy Soap','Head & Shoulders',
  'Dove Shampoo','Clinic Plus','Pantene','Colgate 150g','Pepsodent','Close-Up','Sensodyne',
  'Nivea Cream','Fair & Lovely','Vaseline','Dettol Handwash','Lifebuoy Handwash',
  'Gillette Razor','Whisper Pads','Stayfree','Old Spice','Fogg Deo','Wild Stone'];

const HOUSEHOLD = ['Vim Bar','Vim Liquid','Surf Excel 1kg','Tide 1kg','Ariel 500g','Harpic',
  'Lizol 500ml','Colin Glass Cleaner','Phenyl 1L','Room Freshener','Mosquito Coil',
  'Good Knight Liquid','All Out','Garbage Bags','Tissue Paper','Aluminium Foil','Cling Wrap',
  'Matchbox','Candle','Agarbatti','Broom','Mop','Sponge','Steel Wool'];
const EXPENSE_CATEGORIES = ['Rent','Electricity','Water Bill','Staff Salary','Transport',
  'Packaging','Maintenance','Wastage','Phone/Internet','Insurance','Taxes','Marketing',
  'Equipment','Cleaning','Miscellaneous'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function genPhone() { return '9' + Array(9).fill(0).map(() => rand(0,9)).join(''); }
function genDate(daysBack) {
  const d = new Date(); d.setDate(d.getDate() - rand(0, daysBack));
  return d.toISOString().split('T')[0];
}
function genBarcode() { return '89' + Array(11).fill(0).map(() => rand(0,9)).join(''); }

async function seedBulk() {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('✓ Connected to MySQL\n');

    // Get or create demo user
    let [[user]] = await conn.execute("SELECT id FROM users WHERE email='demo@shopkeeper.com'");
    if (!user) {
      const pw = await bcrypt.hash('demo1234', 10);
      const [r] = await conn.execute(
        "INSERT INTO users (uuid,name,email,password,role,shop_name) VALUES (?,?,?,?,?,?)",
        [uuidv4(),'Demo Shopkeeper','demo@shopkeeper.com',pw,'shopkeeper','Demo Store']
      );
      user = { id: r.insertId };
    }
    const uid = user.id;
    console.log('User ID:', uid);

    // === CATEGORIES (20) ===
    console.log('Seeding categories...');
    const catIds = {};
    for (const name of CATEGORIES_DATA) {
      const [r] = await conn.execute(
        'INSERT IGNORE INTO categories (user_id, name, description) VALUES (?,?,?)',
        [uid, name, name + ' items']
      );
      if (r.insertId) catIds[name] = r.insertId;
      else {
        const [[c]] = await conn.execute('SELECT id FROM categories WHERE user_id=? AND name=?', [uid, name]);
        if (c) catIds[name] = c.id;
      }
    }
    console.log(`  ✓ ${Object.keys(catIds).length} categories`);

    // === PRODUCTS (1000+) ===
    console.log('Seeding products...');
    const allProducts = [];
    const productSets = [
      { items: VEGETABLES, cat: 'Vegetables', unit: 'kg', minP: 15, maxP: 200 },
      { items: FRUITS, cat: 'Fruits', unit: 'kg', minP: 30, maxP: 300 },
      { items: DAIRY, cat: 'Dairy', unit: 'packet', minP: 20, maxP: 500 },
      { items: GROCERIES, cat: 'Groceries', unit: 'packet', minP: 10, maxP: 800 },
      { items: BEVERAGES, cat: 'Beverages', unit: 'bottle', minP: 10, maxP: 200 },
      { items: SNACKS, cat: 'Snacks', unit: 'packet', minP: 10, maxP: 500 },
      { items: PERSONAL_CARE, cat: 'Personal Care', unit: 'piece', minP: 20, maxP: 500 },
      { items: HOUSEHOLD, cat: 'Household', unit: 'piece', minP: 10, maxP: 300 },
    ];

    let skuCounter = 1;
    for (const set of productSets) {
      for (const name of set.items) {
        const pp = rand(set.minP, set.maxP);
        const sp = Math.round(pp * (1 + rand(20, 60) / 100));
        const sku = 'SKU-' + String(skuCounter++).padStart(4, '0');
        allProducts.push([uuidv4(), uid, catIds[set.cat], name, sku, genBarcode(), pp, sp, set.unit]);
      }
    }

    // Generate more products to reach 1000+
    const extraCategories = ['Frozen Foods','Bakery','Spices','Oil & Ghee','Rice & Flour',
      'Pulses & Lentils','Confectionery','Baby Products','Organic','Ready to Eat'];
    const extraNames = ['Premium','Classic','Gold','Silver','Family Pack','Economy','Jumbo',
      'Mini','Fresh','Natural','Pure','Original','Special','Regular','Lite','Extra'];
    const extraItems = ['Pack','Box','Bottle','Can','Jar','Sachet','Pouch','Tin','Tube','Roll'];

    for (const cat of extraCategories) {
      for (let i = 0; i < 60; i++) {
        const name = pick(extraNames) + ' ' + cat.split(' ')[0] + ' ' + pick(extraItems) + ' ' + (i+1);
        const pp = rand(10, 500);
        const sp = Math.round(pp * (1 + rand(15, 50) / 100));
        const sku = 'SKU-' + String(skuCounter++).padStart(4, '0');
        allProducts.push([uuidv4(), uid, catIds[cat], name, sku, genBarcode(), pp, sp, 'piece']);
      }
    }

    // Insert products in batches
    let insertedProducts = 0;
    for (const p of allProducts) {
      try {
        await conn.execute(
          'INSERT IGNORE INTO products (uuid,user_id,category_id,name,sku,barcode,purchase_price,selling_price,unit) VALUES (?,?,?,?,?,?,?,?,?)', p
        );
        insertedProducts++;
      } catch { /* skip duplicates */ }
    }
    console.log(`  ✓ ${insertedProducts} products`);

    // === CUSTOMERS (200) ===
    console.log('Seeding customers...');
    let custCount = 0;
    for (let i = 0; i < 200; i++) {
      const name = pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES);
      const email = name.toLowerCase().replace(' ', '.') + rand(1,999) + '@email.com';
      try {
        await conn.execute(
          'INSERT IGNORE INTO customers (uuid,user_id,name,email,phone,address,balance,notes) VALUES (?,?,?,?,?,?,?,?)',
          [uuidv4(), uid, name, email, genPhone(), rand(1,200)+' '+pick(STREETS)+', '+pick(CITIES), rand(0,5000), i%5===0?'VIP customer':null]
        );
        custCount++;
      } catch {}
    }
    console.log(`  ✓ ${custCount} customers`);

    // === SUPPLIERS (50) ===
    console.log('Seeding suppliers...');
    const companies = ['Fresh Farms','Green Valley','Metro Wholesale','City Mart','Daily Needs',
      'Super Supply','Quick Delivery','Prime Distributors','National Traders','Royal Foods',
      'Himalaya Imports','Eastern Spices','Western Foods','Southern Harvest','Northern Fresh'];
    let suppCount = 0;
    for (let i = 0; i < 50; i++) {
      const name = pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES);
      const company = pick(companies) + ' ' + pick(['Pvt Ltd','LLP','Co.','& Sons','Group']);
      try {
        await conn.execute(
          'INSERT IGNORE INTO suppliers (uuid,user_id,name,email,phone,company,address,gst_number,balance) VALUES (?,?,?,?,?,?,?,?,?)',
          [uuidv4(), uid, name, name.toLowerCase().replace(' ','')+'@supply.com', genPhone(), company,
           rand(1,50)+' Industrial Area, '+pick(CITIES), '27AABCX'+rand(1000,9999)+'X1Z'+rand(1,9), rand(0,50000)]
        );
        suppCount++;
      } catch {}
    }
    console.log(`  ✓ ${suppCount} suppliers`);

    // === INVENTORY (for all products) ===
    console.log('Seeding inventory...');
    const [[{minId}]] = await conn.execute('SELECT MIN(id) as minId FROM products WHERE user_id=?', [uid]);
    const [[{maxId}]] = await conn.execute('SELECT MAX(id) as maxId FROM products WHERE user_id=?', [uid]);
    let invCount = 0;
    for (let pid = minId; pid <= maxId; pid++) {
      try {
        await conn.execute(
          'INSERT IGNORE INTO inventory (product_id,user_id,quantity,min_stock_level,max_stock_level,location) VALUES (?,?,?,?,?,?)',
          [pid, uid, rand(5, 200), rand(3, 20), rand(100, 500), 'Shelf '+String.fromCharCode(65+rand(0,7))+rand(1,10)]
        );
        invCount++;
      } catch {}
    }
    console.log(`  ✓ ${invCount} inventory records`);

    // === POS TRANSACTIONS (500) ===
    console.log('Seeding POS transactions...');
    const productIds = [];
    const [prods] = await conn.execute('SELECT id, name, selling_price, unit FROM products WHERE user_id=? LIMIT 200', [uid]);
    prods.forEach(p => productIds.push(p));

    let txCount = 0;
    for (let i = 0; i < 500; i++) {
      const itemCount = rand(1, 6);
      let total = 0;
      const items = [];
      for (let j = 0; j < itemCount; j++) {
        const p = pick(productIds);
        const qty = p.unit === 'kg' ? (rand(1, 30) / 10) : rand(1, 5);
        const price = parseFloat(p.selling_price);
        const itemTotal = Math.round(qty * price * 100) / 100;
        total += itemTotal;
        items.push({ pid: p.id, name: p.name, qty, unit: p.unit, price, itemTotal });
      }

      const disc = rand(0, 10) > 7 ? rand(5, 50) : 0;
      const net = Math.round((total - disc) * 100) / 100;
      const method = pick(['cash', 'cash', 'cash', 'upi', 'upi', 'card']);
      const received = method === 'cash' ? Math.ceil(net / 10) * 10 : net;
      const change = Math.max(0, Math.round((received - net) * 100) / 100);
      const receipt = 'RCP-' + genDate(90).replace(/-/g, '') + '-' + rand(1000, 9999);
      const txDate = genDate(90);

      try {
        const [txR] = await conn.execute(
          `INSERT INTO pos_transactions (uuid,user_id,customer_name,total_amount,discount,net_amount,payment_method,amount_received,change_amount,receipt_number,created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), uid, rand(0,3)===0 ? pick(FIRST_NAMES)+' '+pick(LAST_NAMES) : null,
           total, disc, net, method, received, change, receipt, txDate + ' ' + rand(8,21)+':'+String(rand(0,59)).padStart(2,'0')+':00']
        );
        const txId = txR.insertId;
        for (const item of items) {
          await conn.execute(
            'INSERT INTO pos_transaction_items (transaction_id,product_id,product_name,quantity,unit,unit_price,total) VALUES (?,?,?,?,?,?,?)',
            [txId, item.pid, item.name, item.qty, item.unit, item.price, item.itemTotal]
          );
        }
        txCount++;
      } catch {}
    }
    console.log(`  ✓ ${txCount} POS transactions`);

    // === SALES (200) ===
    console.log('Seeding sales...');
    const [[{minCust}]] = await conn.execute('SELECT MIN(id) as minCust FROM customers WHERE user_id=?', [uid]);
    const [[{maxCust}]] = await conn.execute('SELECT MAX(id) as maxCust FROM customers WHERE user_id=?', [uid]);
    let saleCount = 0;
    for (let i = 0; i < 200; i++) {
      const itemCount = rand(1, 5);
      let total = 0;
      const saleItems = [];
      for (let j = 0; j < itemCount; j++) {
        const p = pick(productIds);
        const qty = rand(1, 10);
        const price = parseFloat(p.selling_price);
        const disc = rand(0, 5) === 0 ? rand(5, 20) : 0;
        const itemTotal = Math.round((qty * price - disc) * 100) / 100;
        total += itemTotal;
        saleItems.push({ pid: p.id, qty, price, disc, itemTotal });
      }
      const discount = rand(0, 5) === 0 ? rand(10, 100) : 0;
      const tax = Math.round(total * 0.05 * 100) / 100;
      const net = Math.round((total - discount + tax) * 100) / 100;
      const custId = rand(0, 3) === 0 ? null : rand(minCust, maxCust);
      const invoiceNum = 'INV-' + genDate(90).replace(/-/g, '') + '-' + String(i+1).padStart(3, '0');
      const saleDate = genDate(90);

      try {
        const [sR] = await conn.execute(
          `INSERT INTO sales (uuid,user_id,customer_id,invoice_number,total_amount,discount,tax_amount,net_amount,payment_status,payment_method,status,sale_date)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), uid, custId, invoiceNum, total, discount, tax, net,
           pick(['paid','paid','paid','unpaid','partial']), pick(['cash','upi','card','bank_transfer']), 'completed', saleDate]
        );
        for (const si of saleItems) {
          await conn.execute('INSERT INTO sale_items (sale_id,product_id,quantity,unit_price,discount,total) VALUES (?,?,?,?,?,?)',
            [sR.insertId, si.pid, si.qty, si.price, si.disc, si.itemTotal]);
        }
        saleCount++;
      } catch {}
    }
    console.log(`  ✓ ${saleCount} sales`);

    // === PURCHASES (100) ===
    console.log('Seeding purchases...');
    const [[{minSupp}]] = await conn.execute('SELECT MIN(id) as minSupp FROM suppliers WHERE user_id=?', [uid]);
    const [[{maxSupp}]] = await conn.execute('SELECT MAX(id) as maxSupp FROM suppliers WHERE user_id=?', [uid]);
    let purCount = 0;
    for (let i = 0; i < 100; i++) {
      const itemCount = rand(2, 8);
      let total = 0;
      const purItems = [];
      for (let j = 0; j < itemCount; j++) {
        const p = pick(productIds);
        const qty = rand(10, 100);
        const price = rand(10, 300);
        const itemTotal = qty * price;
        total += itemTotal;
        purItems.push({ pid: p.id, qty, price, itemTotal });
      }
      const discount = rand(0, 3) === 0 ? rand(50, 500) : 0;
      const tax = Math.round(total * 0.05 * 100) / 100;
      const net = Math.round((total - discount + tax) * 100) / 100;
      const invoiceNum = 'PUR-' + genDate(90).replace(/-/g, '') + '-' + String(i+1).padStart(3, '0');

      try {
        const [pR] = await conn.execute(
          `INSERT INTO purchases (uuid,user_id,supplier_id,invoice_number,total_amount,discount,tax_amount,net_amount,payment_status,payment_method,status,purchase_date)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), uid, rand(minSupp, maxSupp), invoiceNum, total, discount, tax, net,
           pick(['paid','paid','unpaid','partial']), pick(['cash','upi','bank_transfer']), 'completed', genDate(90)]
        );
        for (const pi of purItems) {
          await conn.execute('INSERT INTO purchase_items (purchase_id,product_id,quantity,unit_price,total) VALUES (?,?,?,?,?)',
            [pR.insertId, pi.pid, pi.qty, pi.price, pi.itemTotal]);
        }
        purCount++;
      } catch {}
    }
    console.log(`  ✓ ${purCount} purchases`);

    // === EXPENSES (300) ===
    console.log('Seeding expenses...');
    let expCount = 0;
    for (let i = 0; i < 300; i++) {
      const cat = pick(EXPENSE_CATEGORIES);
      const amount = rand(50, 10000);
      try {
        await conn.execute(
          'INSERT INTO expenses (user_id,category,description,amount,payment_method,expense_date) VALUES (?,?,?,?,?,?)',
          [uid, cat, cat + ' - ' + pick(['Monthly','Weekly','Daily','One-time','Quarterly']) + ' payment',
           amount, pick(['cash','upi','bank_transfer']), genDate(90)]
        );
        expCount++;
      } catch {}
    }
    console.log(`  ✓ ${expCount} expenses`);

    // === PAYMENTS (150) ===
    console.log('Seeding payments...');
    const [[{minSale}]] = await conn.execute('SELECT MIN(id) as minSale FROM sales WHERE user_id=?', [uid]);
    const [[{maxSale}]] = await conn.execute('SELECT MAX(id) as maxSale FROM sales WHERE user_id=?', [uid]);
    let payCount = 0;
    for (let i = 0; i < 150; i++) {
      const refType = rand(0, 3) === 0 ? 'purchase' : 'sale';
      const refId = refType === 'sale' ? rand(minSale || 1, maxSale || 1) : rand(1, purCount);
      try {
        await conn.execute(
          'INSERT INTO payments (user_id,reference_type,reference_id,amount,payment_method,notes) VALUES (?,?,?,?,?,?)',
          [uid, refType, refId, rand(100, 5000), pick(['cash','upi','card','bank_transfer']),
           rand(0,3)===0 ? 'Partial payment' : null]
        );
        payCount++;
      } catch {}
    }
    console.log(`  ✓ ${payCount} payments`);

    // === STOCK MOVEMENTS (500) ===
    console.log('Seeding stock movements...');
    let mvCount = 0;
    for (let i = 0; i < 500; i++) {
      const p = pick(productIds);
      const type = pick(['in', 'in', 'in', 'out', 'out', 'adjustment']);
      try {
        await conn.execute(
          'INSERT INTO stock_movements (product_id,user_id,type,quantity,reference_type,notes,created_at) VALUES (?,?,?,?,?,?,?)',
          [p.id, uid, type, rand(1, 50), pick(['purchase','sale','manual','adjustment']),
           type + ' - ' + pick(['Restock','Sale deduction','Manual count','Damaged','Expired']),
           genDate(90) + ' ' + rand(6,22) + ':' + String(rand(0,59)).padStart(2,'0') + ':00']
        );
        mvCount++;
      } catch {}
    }
    console.log(`  ✓ ${mvCount} stock movements`);

    // === SUMMARY ===
    console.log('\n============================================');
    console.log('  BULK SEED COMPLETE');
    console.log('============================================');
    const [[counts]] = await conn.execute(`
      SELECT
        (SELECT COUNT(*) FROM categories WHERE user_id=?) as categories,
        (SELECT COUNT(*) FROM products WHERE user_id=?) as products,
        (SELECT COUNT(*) FROM customers WHERE user_id=?) as customers,
        (SELECT COUNT(*) FROM suppliers WHERE user_id=?) as suppliers,
        (SELECT COUNT(*) FROM inventory WHERE user_id=?) as inventory,
        (SELECT COUNT(*) FROM sales WHERE user_id=?) as sales,
        (SELECT COUNT(*) FROM purchases WHERE user_id=?) as purchases,
        (SELECT COUNT(*) FROM pos_transactions WHERE user_id=?) as pos_transactions,
        (SELECT COUNT(*) FROM expenses WHERE user_id=?) as expenses,
        (SELECT COUNT(*) FROM payments WHERE user_id=?) as payments,
        (SELECT COUNT(*) FROM stock_movements WHERE user_id=?) as stock_movements
    `, [uid,uid,uid,uid,uid,uid,uid,uid,uid,uid,uid]);

    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    console.log('');
    for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
    console.log(`\n  TOTAL RECORDS: ${total}`);
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('✗ Seed failed:', error.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

seedBulk();
