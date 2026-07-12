/**
 * Bulk Seeder - Seeds 3000+ products, 200 customers, suppliers, sales, purchases.
 * Usage: node src/database/seed-bulk.js
 * 
 * IMPORTANT: Run seed.js first to create base user/shop, then run this.
 * This adds data to the existing demo shop.
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

// ─── HELPER DATA ────────────────────────────────────────────────
const FIRST_NAMES = ['Rahul','Amit','Priya','Sunita','Vikas','Neha','Ravi','Pooja','Arun','Deepa',
  'Sanjay','Meena','Rajesh','Kavita','Suresh','Anjali','Mohan','Rekha','Vijay','Swati',
  'Ashok','Nita','Dinesh','Geeta','Manoj','Sarita','Prakash','Usha','Ramesh','Lata',
  'Kiran','Anand','Jaya','Sachin','Ritu','Gaurav','Sneha','Vishal','Pallavi','Rohit',
  'Aarti','Nitin','Preeti','Manish','Shalini','Pankaj','Divya','Sandeep','Anju','Rakesh'];
const LAST_NAMES = ['Kumar','Sharma','Patel','Singh','Verma','Gupta','Jain','Shah','Reddy','Nair',
  'Das','Rao','Mishra','Yadav','Pandey','Chauhan','Thakur','Joshi','Mehta','Chopra',
  'Agarwal','Bansal','Saxena','Tiwari','Dubey','Malik','Bhat','Pillai','Iyer','Menon'];
const CITIES = ['Delhi','Mumbai','Bangalore','Chennai','Hyderabad','Pune','Ahmedabad','Kolkata',
  'Jaipur','Lucknow','Chandigarh','Indore','Bhopal','Nagpur','Surat','Vadodara','Patna','Ranchi',
  'Dehradun','Mysore','Nashik','Coimbatore','Vizag','Kanpur','Agra'];
const STREETS = ['MG Road','Station Road','Ring Road','Market Lane','Gandhi Nagar','Civil Lines',
  'Sector 12','Phase 2','Industrial Area','Main Bazaar','Clock Tower Road','Bus Stand Road',
  'Temple Street','Lake Road','Park Avenue','College Road','Hospital Road','Railway Colony'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, dec = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
function randPhone() { return `9${randInt(100000000, 999999999)}`; }
function randDate(daysBack) { const d = new Date(); d.setDate(d.getDate() - randInt(0, daysBack)); return d.toISOString().split('T')[0]; }
function padNum(n, len) { return String(n).padStart(len, '0'); }

// ─── PRODUCT DATA ───────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Groceries', desc: 'Daily grocery essentials' },
  { name: 'Beverages', desc: 'Drinks, juices, water' },
  { name: 'Snacks', desc: 'Chips, namkeen, biscuits' },
  { name: 'Personal Care', desc: 'Soaps, shampoos, skincare' },
  { name: 'Dairy', desc: 'Milk, curd, cheese, paneer' },
  { name: 'Fruits & Vegetables', desc: 'Fresh produce' },
  { name: 'Household', desc: 'Cleaning, detergents' },
  { name: 'Stationery', desc: 'Pens, notebooks, office' },
  { name: 'Baby & Kids', desc: 'Diapers, food, toys' },
  { name: 'Health & Wellness', desc: 'Medicines, supplements' },
  { name: 'Frozen Foods', desc: 'Frozen meals, ice cream' },
  { name: 'Spices & Masala', desc: 'Spice powders, whole spices' },
  { name: 'Bakery', desc: 'Bread, cakes, cookies' },
  { name: 'Rice & Grains', desc: 'Rice, wheat, pulses' },
  { name: 'Oils & Ghee', desc: 'Cooking oils, ghee' },
];

const BRANDS = ['Tata','Amul','Britannia','ITC','Hindustan Unilever','Nestle','Dabur','Patanjali',
  'Parle','Haldiram','MDH','Everest','Godrej','Marico','Emami','Colgate','P&G','Fortune',
  'Aashirvaad','Sunfeast','Good Day','Mother Dairy','Cadbury','Bournvita','Horlicks'];

const PRODUCT_TEMPLATES = {
  'Groceries': [
    ['Salt','Iodized salt',15,22,'kg'],['Sugar','White sugar',38,48,'kg'],['Wheat Flour','Atta',42,55,'kg'],
    ['Gram Flour','Besan',55,72,'kg'],['Semolina','Sooji/Rava',35,45,'kg'],['Poha','Flattened rice',30,40,'kg'],
    ['Vermicelli','Seviyan',22,30,'packet'],['Maida','All purpose flour',32,42,'kg'],['Jaggery','Gud',45,60,'kg'],
    ['Honey','Pure honey',180,250,'bottle'],['Jam','Mixed fruit jam',85,120,'bottle'],['Ketchup','Tomato sauce',80,110,'bottle'],
    ['Vinegar','White vinegar',25,35,'bottle'],['Soy Sauce','Dark soy',35,50,'bottle'],['Noodles','Instant noodles',12,15,'packet'],
    ['Pasta','Penne/Fusilli',40,55,'packet'],['Oats','Rolled oats',85,120,'packet'],['Cornflakes','Breakfast cereal',110,150,'packet'],
    ['Peanut Butter','Creamy',150,200,'bottle'],['Pickle','Mixed pickle',60,85,'bottle'],
  ],
  'Beverages': [
    ['Cola','Carbonated drink',35,50,'bottle'],['Lemon Soda','Lime flavored',20,30,'bottle'],
    ['Mango Juice','100% juice',45,65,'bottle'],['Apple Juice','Packaged juice',50,70,'bottle'],
    ['Green Tea','Herbal tea bags',90,130,'packet'],['Coffee','Instant coffee',120,170,'bottle'],
    ['Tea','Loose leaf tea',100,140,'packet'],['Milk Shake','Flavored milk',25,35,'bottle'],
    ['Coconut Water','Natural',25,40,'bottle'],['Energy Drink','Caffeinated',90,125,'piece'],
    ['Mineral Water','500ml',8,15,'bottle'],['Mineral Water','1L',12,20,'bottle'],
    ['Buttermilk','Chaas',15,22,'bottle'],['Lassi','Sweet/Mango',20,30,'bottle'],
    ['Soft Drink','Flavored soda',15,25,'bottle'],['Tonic Water','Fizzy',30,45,'bottle'],
  ],
  'Snacks': [
    ['Potato Chips','Salted/Masala',15,20,'packet'],['Nachos','Corn chips',25,35,'packet'],
    ['Namkeen','Mixture',20,30,'packet'],['Biscuits','Cream/Glucose',10,15,'packet'],
    ['Cookies','Choco chip',30,45,'packet'],['Cake','Cup cake',15,25,'piece'],
    ['Rusk','Toast rusk',25,35,'packet'],['Bhujia','Besan sev',30,45,'packet'],
    ['Popcorn','Ready to eat',20,30,'packet'],['Peanuts','Roasted',25,35,'packet'],
    ['Mathri','Baked snack',20,30,'packet'],['Chakli','Spiral snack',25,35,'packet'],
    ['Khakhra','Gujarati snack',30,45,'packet'],['Murukku','South Indian snack',35,50,'packet'],
    ['Banana Chips','Fried',30,40,'packet'],['Dry Fruits Mix','Premium',150,200,'packet'],
  ],
  'Personal Care': [
    ['Soap','Bath soap 100g',25,40,'piece'],['Shampoo','Hair shampoo',80,120,'bottle'],
    ['Conditioner','Hair conditioner',100,150,'bottle'],['Face Wash','Cleanser',80,120,'piece'],
    ['Toothpaste','Fluoride',50,75,'piece'],['Toothbrush','Soft bristles',20,35,'piece'],
    ['Deodorant','Body spray',100,160,'piece'],['Moisturizer','Body lotion',80,130,'bottle'],
    ['Sunscreen','SPF 50',120,180,'bottle'],['Hair Oil','Coconut/Amla',60,90,'bottle'],
    ['Razor','Disposable',15,25,'piece'],['Shaving Cream','Foam',60,90,'piece'],
    ['Hand Wash','Liquid',45,70,'bottle'],['Sanitizer','Alcohol based',30,50,'bottle'],
    ['Cotton','Cotton balls',20,35,'packet'],['Band Aid','Adhesive strips',25,40,'packet'],
  ],
  'Dairy': [
    ['Milk','Full cream',28,35,'packet'],['Milk','Toned',24,30,'packet'],
    ['Curd','Fresh dahi',20,30,'piece'],['Paneer','Fresh 200g',60,80,'packet'],
    ['Butter','Salted 100g',48,57,'packet'],['Ghee','Pure desi 500ml',250,320,'bottle'],
    ['Cheese','Sliced',45,65,'packet'],['Cheese','Block 200g',80,110,'packet'],
    ['Cream','Fresh cream',40,55,'packet'],['Buttermilk','Masala chaas',15,22,'packet'],
    ['Yogurt','Flavored',25,35,'piece'],['Ice Cream','500ml tub',90,130,'piece'],
    ['Shrikhand','Sweet',35,50,'piece'],['Lassi','Mango',18,25,'piece'],
  ],
  'Fruits & Vegetables': [
    ['Potato','Fresh',18,25,'kg'],['Onion','Red onion',20,30,'kg'],['Tomato','Fresh',25,35,'kg'],
    ['Banana','Dozen',30,40,'dozen'],['Apple','Kashmir',100,140,'kg'],['Orange','Nagpur',50,70,'kg'],
    ['Carrot','Fresh',25,35,'kg'],['Capsicum','Green/Red',40,60,'kg'],['Cucumber','Fresh',20,30,'kg'],
    ['Spinach','Palak bunch',15,25,'piece'],['Coriander','Fresh bunch',5,10,'piece'],
    ['Ginger','Fresh',60,80,'kg'],['Garlic','Fresh',80,120,'kg'],['Lemon','10 pcs',20,30,'piece'],
    ['Mango','Seasonal',60,100,'kg'],['Grapes','Green/Black',50,80,'kg'],
  ],
  'Household': [
    ['Detergent','Washing powder 1kg',60,85,'packet'],['Liquid Detergent','500ml',90,130,'bottle'],
    ['Dish Wash','Bar/Liquid',30,45,'piece'],['Floor Cleaner','1L',65,95,'bottle'],
    ['Toilet Cleaner','500ml',50,75,'bottle'],['Air Freshener','Room spray',80,120,'piece'],
    ['Broom','Plastic/Grass',40,60,'piece'],['Mop','Floor mop',80,130,'piece'],
    ['Dustbin','Plastic',60,90,'piece'],['Sponge','Scrub pad',10,15,'piece'],
    ['Garbage Bags','Pack of 30',25,40,'packet'],['Aluminium Foil','9m roll',50,75,'piece'],
    ['Cling Wrap','30m roll',60,90,'piece'],['Candle','Pack of 6',20,30,'packet'],
    ['Matchbox','Pack of 10',10,15,'packet'],['Mosquito Coil','Pack of 10',30,45,'packet'],
  ],
  'Spices & Masala': [
    ['Turmeric','Haldi powder',30,45,'packet'],['Red Chilli','Powder',35,50,'packet'],
    ['Coriander','Dhaniya powder',28,40,'packet'],['Cumin','Jeera powder',50,70,'packet'],
    ['Garam Masala','Blend',45,65,'packet'],['Black Pepper','Whole/Powder',80,120,'packet'],
    ['Mustard','Seeds',25,35,'packet'],['Fenugreek','Methi seeds',20,30,'packet'],
    ['Cardamom','Elaichi',150,200,'packet'],['Cinnamon','Dalchini sticks',60,85,'packet'],
    ['Bay Leaf','Tej Patta',15,25,'packet'],['Cloves','Laung',80,110,'packet'],
    ['Biryani Masala','Blend',40,60,'packet'],['Kitchen King','All purpose',35,50,'packet'],
    ['Chaat Masala','Tangy blend',25,35,'packet'],['Pav Bhaji Masala','Blend',30,45,'packet'],
  ],
  'Rice & Grains': [
    ['Basmati Rice','Premium 1kg',80,110,'kg'],['Basmati Rice','Regular 1kg',50,70,'kg'],
    ['Sona Masoori','South rice 1kg',40,55,'kg'],['Brown Rice','Healthy 1kg',70,95,'kg'],
    ['Moong Dal','Yellow 1kg',90,120,'kg'],['Toor Dal','Arhar 1kg',100,135,'kg'],
    ['Masoor Dal','Red 1kg',70,95,'kg'],['Chana Dal','Split gram 1kg',65,85,'kg'],
    ['Urad Dal','Black 1kg',85,110,'kg'],['Rajma','Kidney beans 1kg',90,120,'kg'],
    ['Chole','Chickpeas 1kg',60,80,'kg'],['Peanuts','Raw 1kg',80,110,'kg'],
  ],
  'Oils & Ghee': [
    ['Sunflower Oil','Refined 1L',110,145,'bottle'],['Mustard Oil','Kachi Ghani 1L',120,160,'bottle'],
    ['Groundnut Oil','Cold pressed 1L',140,180,'bottle'],['Olive Oil','Extra virgin 500ml',250,350,'bottle'],
    ['Coconut Oil','Pure 500ml',80,110,'bottle'],['Sesame Oil','Til oil 500ml',130,170,'bottle'],
    ['Rice Bran Oil','1L',100,135,'bottle'],['Ghee','Cow ghee 500ml',280,350,'bottle'],
    ['Ghee','Buffalo ghee 500ml',250,310,'bottle'],['Vanaspati','Dalda 1kg',90,120,'packet'],
  ],
  'Bakery': [
    ['Bread','White sliced',25,35,'packet'],['Bread','Brown/Wheat',30,42,'packet'],
    ['Pav','Pack of 6',20,28,'packet'],['Bun','Sweet bun 4pcs',25,35,'packet'],
    ['Cake','Slice',20,30,'piece'],['Muffin','Chocolate',25,40,'piece'],
    ['Croissant','Butter',30,45,'piece'],['Toast','Milk rusk',30,40,'packet'],
    ['Cookies','Butter 200g',40,60,'packet'],['Brownie','Chocolate',30,45,'piece'],
  ],
  'Baby & Kids': [
    ['Diapers','Pack of 30',350,450,'packet'],['Baby Wipes','Pack of 72',100,140,'packet'],
    ['Baby Powder','100g',45,65,'piece'],['Baby Oil','100ml',60,85,'bottle'],
    ['Baby Soap','75g',35,50,'piece'],['Baby Shampoo','200ml',90,130,'bottle'],
    ['Baby Food','Cerelac 300g',180,240,'packet'],['Formula Milk','400g',350,450,'piece'],
    ['Baby Cream','Rash cream',60,85,'piece'],['Feeding Bottle','250ml',80,120,'piece'],
  ],
  'Health & Wellness': [
    ['Vitamin C','Tablets 60',120,180,'bottle'],['Multivitamin','Daily 30 caps',200,280,'bottle'],
    ['Protein Powder','500g',500,650,'piece'],['Chyawanprash','500g',150,210,'bottle'],
    ['Honey','Organic 250g',120,165,'bottle'],['ORS','Pack of 10',25,35,'packet'],
    ['Glucon-D','500g',90,125,'packet'],['Calcium','Tablets 30',100,150,'bottle'],
    ['Omega 3','Fish oil 60 caps',250,350,'bottle'],['Cough Syrup','100ml',60,90,'bottle'],
  ],
  'Frozen Foods': [
    ['Frozen Peas','500g',50,70,'packet'],['Frozen Corn','500g',55,75,'packet'],
    ['Ice Cream','1L tub',150,200,'piece'],['Ice Cream','Stick/Cone',20,30,'piece'],
    ['Frozen Paratha','Pack of 5',60,85,'packet'],['Frozen Samosa','Pack of 12',80,110,'packet'],
    ['Frozen Momos','Pack of 10',90,130,'packet'],['Fish Fingers','200g',120,160,'packet'],
    ['Chicken Nuggets','300g',150,200,'packet'],['Frozen Pizza','7 inch',120,170,'piece'],
  ],
};

// ─── MAIN SEEDER ────────────────────────────────────────────────
async function seedBulk() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✓ Connected to MySQL\n');

    // Get existing demo user and shop
    const [[demoUser]] = await connection.execute("SELECT id FROM users WHERE email = 'demo@shopkeeper.com'");
    if (!demoUser) { console.error('✗ Run seed.js first to create base data'); process.exit(1); }
    const userId = demoUser.id;

    const [[shopRow]] = await connection.execute("SELECT id FROM shops WHERE owner_id = ?", [userId]);
    if (!shopRow) { console.error('✗ No shop found for demo user'); process.exit(1); }
    const shopId = shopRow.id;

    console.log(`Using user_id=${userId}, shop_id=${shopId}\n`);

    // ═══ CATEGORIES ═══════════════════════════════════════════════
    console.log('Seeding categories...');
    const catMap = {};
    for (const cat of CATEGORIES) {
      const [[existing]] = await connection.execute('SELECT id FROM categories WHERE shop_id = ? AND name = ?', [shopId, cat.name]);
      if (existing) { catMap[cat.name] = existing.id; continue; }
      const [result] = await connection.execute(
        'INSERT INTO categories (user_id, shop_id, name, description) VALUES (?, ?, ?, ?)',
        [userId, shopId, cat.name, cat.desc]
      );
      catMap[cat.name] = result.insertId;
    }
    console.log(`  ✓ ${Object.keys(catMap).length} categories ready\n`);

    // ═══ PRODUCTS (3000+) ═════════════════════════════════════════
    console.log('Seeding 3000+ products...');
    let productCount = 0;
    const allProductIds = [];

    // Get existing product count to avoid SKU conflicts
    const [[{ maxProd }]] = await connection.execute('SELECT COUNT(*) as maxProd FROM products WHERE shop_id = ?', [shopId]);
    let skuCounter = maxProd + 1;

    for (const [catName, templates] of Object.entries(PRODUCT_TEMPLATES)) {
      const catId = catMap[catName];
      if (!catId) continue;

      // For each template, generate multiple variants (different brands, sizes)
      for (const [baseName, desc, basePP, baseSP, unit] of templates) {
        const sizes = unit === 'kg' ? ['250g','500g','1kg','2kg','5kg'] : unit === 'bottle' ? ['200ml','500ml','1L','2L'] : ['Small','Regular','Large','Family Pack'];
        const brandsForItem = [];
        for (let b = 0; b < randInt(3, 6); b++) brandsForItem.push(pick(BRANDS));
        const uniqueBrands = [...new Set(brandsForItem)];

        for (const brand of uniqueBrands) {
          for (const size of sizes.slice(0, randInt(2, sizes.length))) {
            const priceMultiplier = size.includes('5kg') || size.includes('2L') || size === 'Family Pack' ? 3.5 :
              size.includes('2kg') || size.includes('1L') || size === 'Large' ? 2 :
              size.includes('500') || size === 'Regular' ? 1 :
              size.includes('250') || size.includes('200') || size === 'Small' ? 0.55 : 1;

            const pp = Math.round(basePP * priceMultiplier);
            const sp = Math.round(baseSP * priceMultiplier);
            const mrp = Math.round(sp * randFloat(1.0, 1.15));
            const sku = `SKU-${padNum(skuCounter++, 5)}`;
            const barcode = `890${randInt(1000000000, 9999999999)}`;
            const name = `${brand} ${baseName} ${size}`;

            const [result] = await connection.execute(
              `INSERT INTO products (uuid, user_id, shop_id, category_id, name, sku, barcode, brand, description, purchase_price, selling_price, mrp, unit, tax_rate, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
              [uuidv4(), userId, shopId, catId, name, sku, barcode, brand, desc, pp, sp, mrp, unit, pick([0, 5, 12, 18]), ]
            );
            allProductIds.push(result.insertId);
            productCount++;
          }
        }
      }
    }
    console.log(`  ✓ ${productCount} products seeded\n`);

    // ═══ INVENTORY ════════════════════════════════════════════════
    console.log('Seeding inventory...');
    let invCount = 0;
    const BATCH = 500;
    for (let i = 0; i < allProductIds.length; i += BATCH) {
      const batch = allProductIds.slice(i, i + BATCH);
      const values = batch.map(pid => {
        const qty = randInt(0, 200);
        const minLvl = randInt(5, 20);
        return `(${pid}, ${userId}, ${shopId}, ${qty}, ${minLvl}, ${minLvl * 5})`;
      }).join(',');
      await connection.execute(`INSERT INTO inventory (product_id, user_id, shop_id, quantity, min_stock_level, max_stock_level) VALUES ${values}`);
      invCount += batch.length;
    }
    console.log(`  ✓ ${invCount} inventory records seeded\n`);

    // ═══ CUSTOMERS (200) ══════════════════════════════════════════
    console.log('Seeding 200 customers...');
    const customerIds = [];
    for (let i = 0; i < 200; i++) {
      const fname = pick(FIRST_NAMES);
      const lname = pick(LAST_NAMES);
      const name = `${fname} ${lname}`;
      const phone = randPhone();
      const email = i < 120 ? `${fname.toLowerCase()}.${lname.toLowerCase()}${randInt(1,99)}@${pick(['gmail.com','yahoo.com','hotmail.com'])}` : null;
      const address = `${randInt(1,999)} ${pick(STREETS)}, ${pick(CITIES)}`;
      const balance = i < 30 ? randInt(100, 5000) : 0; // 30 customers with outstanding balance

      const [result] = await connection.execute(
        'INSERT INTO customers (uuid, user_id, shop_id, name, email, phone, address, balance, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
        [uuidv4(), userId, shopId, name, email, phone, address, balance]
      );
      customerIds.push(result.insertId);
    }
    console.log(`  ✓ 200 customers seeded\n`);

    // ═══ SUPPLIERS (25) ═══════════════════════════════════════════
    console.log('Seeding 25 suppliers...');
    const supplierNames = [
      'Wholesale Mart','Fresh Dairy Co','Beverage Hub','FMCG Direct','Spice World Traders',
      'Green Grocers Ltd','Bakery Supplies Co','Health Plus Dist.','Frozen Foods India','Oil & Ghee House',
      'National Distributors','City Wholesale','Metro Cash & Carry','Super Stockist','Reliance Retail',
      'D-Mart Wholesale','Patanjali Dist.','ITC e-Choupal','Nestle Dist.','HUL Stockist',
      'ABC Traders','Krishna Suppliers','Ganesh Enterprises','Lakshmi Trading Co','Jai Hind Wholesalers'
    ];
    const supplierIds = [];
    for (let i = 0; i < supplierNames.length; i++) {
      const balance = i < 5 ? randInt(2000, 20000) : 0;
      const [result] = await connection.execute(
        'INSERT INTO suppliers (uuid, user_id, shop_id, name, email, phone, company, address, gst_number, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, shopId, supplierNames[i], `contact@${supplierNames[i].toLowerCase().replace(/[^a-z]/g,'')}.com`, randPhone(), supplierNames[i], `${randInt(1,50)} ${pick(STREETS)}, ${pick(CITIES)}`, `${randInt(22,37)}AABCD${randInt(1000,9999)}E1Z${randInt(1,9)}`, balance]
      );
      supplierIds.push(result.insertId);
    }
    console.log(`  ✓ 25 suppliers seeded\n`);

    // ═══ SALES (500) ══════════════════════════════════════════════
    console.log('Seeding 500 sales with items...');
    const paymentMethods = ['cash', 'upi', 'card', 'bank_transfer'];
    let saleCount = 0;

    for (let i = 0; i < 500; i++) {
      const numItems = randInt(1, 8);
      const saleDate = randDate(90);
      const custId = Math.random() < 0.6 ? pick(customerIds) : null;
      const items = [];
      let totalAmount = 0;

      for (let j = 0; j < numItems; j++) {
        const prodId = pick(allProductIds);
        const [[prod]] = await connection.execute('SELECT selling_price, name FROM products WHERE id = ?', [prodId]);
        if (!prod) continue;
        const qty = randInt(1, 5);
        const price = parseFloat(prod.selling_price);
        const itemTotal = qty * price;
        totalAmount += itemTotal;
        items.push({ prodId, qty, price, total: itemTotal, name: prod.name });
      }

      if (items.length === 0) continue;
      const disc = Math.random() < 0.2 ? randInt(5, Math.min(50, Math.floor(totalAmount * 0.1))) : 0;
      const net = totalAmount - disc;
      const paidStatus = Math.random() < 0.85 ? 'paid' : Math.random() < 0.5 ? 'partial' : 'unpaid';
      const pm = pick(paymentMethods);
      const invNum = `INV-${saleDate.replace(/-/g, '')}-${padNum(i + 1, 3)}${String.fromCharCode(65 + randInt(0,25))}`;

      const [saleResult] = await connection.execute(
        `INSERT INTO sales (uuid, user_id, shop_id, customer_id, invoice_number, total_amount, discount, net_amount, payment_status, payment_method, status, sale_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [uuidv4(), userId, shopId, custId, invNum, totalAmount, disc, net, paidStatus, pm, saleDate]
      );
      const saleId = saleResult.insertId;

      for (const item of items) {
        await connection.execute(
          'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, 0, ?)',
          [saleId, item.prodId, item.qty, item.price, item.total]
        );
      }
      saleCount++;
      if (saleCount % 100 === 0) process.stdout.write(`  ... ${saleCount} sales\r`);
    }
    console.log(`  ✓ ${saleCount} sales with items seeded\n`);

    // ═══ PURCHASES (100) ══════════════════════════════════════════
    console.log('Seeding 100 purchases...');
    for (let i = 0; i < 100; i++) {
      const numItems = randInt(3, 12);
      const purchaseDate = randDate(90);
      const supId = pick(supplierIds);
      let totalAmount = 0;
      const items = [];

      for (let j = 0; j < numItems; j++) {
        const prodId = pick(allProductIds);
        const [[prod]] = await connection.execute('SELECT purchase_price FROM products WHERE id = ?', [prodId]);
        if (!prod) continue;
        const qty = randInt(10, 100);
        const price = parseFloat(prod.purchase_price);
        const itemTotal = qty * price;
        totalAmount += itemTotal;
        items.push({ prodId, qty, price, total: itemTotal });
      }

      if (items.length === 0) continue;
      const disc = Math.random() < 0.3 ? randInt(50, 500) : 0;
      const net = totalAmount - disc;
      const paidStatus = Math.random() < 0.7 ? 'paid' : 'unpaid';
      const pm = pick(paymentMethods);
      const invNum = `PUR-${purchaseDate.replace(/-/g, '')}-${padNum(i + 1, 3)}${String.fromCharCode(65 + randInt(0,25))}`;

      const [purResult] = await connection.execute(
        `INSERT INTO purchases (uuid, user_id, shop_id, supplier_id, invoice_number, total_amount, discount, net_amount, payment_status, payment_method, status, purchase_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [uuidv4(), userId, shopId, supId, invNum, totalAmount, disc, net, paidStatus, pm, purchaseDate]
      );
      const purId = purResult.insertId;

      for (const item of items) {
        await connection.execute(
          'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
          [purId, item.prodId, item.qty, item.price, item.total]
        );
      }
    }
    console.log(`  ✓ 100 purchases seeded\n`);

    // ═══ EXPENSES (150) ═══════════════════════════════════════════
    console.log('Seeding 150 expenses...');
    const expenseCategories = ['Rent','Electricity','Staff Salary','Transport','Packaging','Maintenance','Wastage','Water Bill','Internet','Miscellaneous'];
    for (let i = 0; i < 150; i++) {
      const cat = pick(expenseCategories);
      const amount = cat === 'Rent' ? randInt(8000, 25000) :
        cat === 'Staff Salary' ? randInt(5000, 15000) :
        cat === 'Electricity' ? randInt(1000, 5000) :
        randInt(100, 3000);
      await connection.execute(
        'INSERT INTO expenses (user_id, shop_id, category, description, amount, payment_method, expense_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, shopId, cat, `${cat} payment`, amount, pick(['cash','upi','bank_transfer']), randDate(90)]
      );
    }
    console.log(`  ✓ 150 expenses seeded\n`);

    // ═══ POS TRANSACTIONS (300) ═══════════════════════════════════
    console.log('Seeding 300 POS transactions...');
    for (let i = 0; i < 300; i++) {
      const numItems = randInt(1, 6);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - randInt(0, 30));
      createdAt.setHours(randInt(8, 21), randInt(0, 59), randInt(0, 59));

      let totalAmount = 0;
      const items = [];
      for (let j = 0; j < numItems; j++) {
        const prodId = pick(allProductIds);
        const [[prod]] = await connection.execute('SELECT selling_price, name, unit FROM products WHERE id = ?', [prodId]);
        if (!prod) continue;
        const qty = prod.unit === 'kg' ? randFloat(0.25, 3, 3) : randInt(1, 4);
        const price = parseFloat(prod.selling_price);
        const itemTotal = Math.round(qty * price * 100) / 100;
        totalAmount += itemTotal;
        items.push({ prodId, name: prod.name, qty, unit: prod.unit, price, total: itemTotal });
      }

      if (items.length === 0) continue;
      const disc = Math.random() < 0.15 ? randInt(5, 30) : 0;
      const net = Math.round((totalAmount - disc) * 100) / 100;
      const pm = pick(['cash','cash','cash','upi','upi','card']);
      const amtReceived = pm === 'cash' ? Math.ceil(net / 10) * 10 : net;
      const change = Math.round((amtReceived - net) * 100) / 100;
      const custId = Math.random() < 0.3 ? pick(customerIds) : null;
      const custName = Math.random() < 0.4 ? `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}` : null;
      const receiptNum = `RCP-${createdAt.toISOString().slice(0,10).replace(/-/g,'')}-${padNum(i+1, 4)}`;

      const [txResult] = await connection.execute(
        `INSERT INTO pos_transactions (uuid, user_id, shop_id, customer_name, customer_id, total_amount, discount, net_amount, payment_method, amount_received, change_amount, receipt_number, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [uuidv4(), userId, shopId, custName, custId, totalAmount, disc, net, pm, amtReceived, change > 0 ? change : 0, receiptNum, createdAt.toISOString().slice(0,19).replace('T',' ')]
      );
      const txId = txResult.insertId;

      for (const item of items) {
        await connection.execute(
          'INSERT INTO pos_transaction_items (transaction_id, product_id, product_name, quantity, unit, unit_price, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [txId, item.prodId, item.name, item.qty, item.unit, item.price, item.total]
        );
      }
      if ((i + 1) % 100 === 0) process.stdout.write(`  ... ${i + 1} POS transactions\r`);
    }
    console.log(`  ✓ 300 POS transactions seeded\n`);

    // ═══ OFFERS (10) ══════════════════════════════════════════════
    console.log('Seeding 10 offers...');
    const offerNames = ['Summer Sale','Weekend Flat 10%','Buy More Save More','Dairy Delight','Snack Attack',
      'Grocery Bonanza','Health Week','Fresh Produce 5% Off','Festival Offer','Clearance Sale'];
    for (let i = 0; i < 10; i++) {
      const startDate = randDate(30);
      const endD = new Date(startDate); endD.setDate(endD.getDate() + randInt(7, 30));
      const applicableTo = pick(['all','all','all','category','category','product']);
      const catId = applicableTo === 'category' ? pick(Object.values(catMap)) : null;
      const prodId = applicableTo === 'product' ? pick(allProductIds) : null;
      await connection.execute(
        `INSERT INTO offers (shop_id, name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, applicable_to, category_id, product_id, start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [shopId, offerNames[i], `${offerNames[i]} - limited time!`, pick(['percentage','flat']), randInt(5, 20), randInt(0, 200), randInt(50, 500), applicableTo, catId, prodId, startDate, endD.toISOString().split('T')[0]]
      );
    }
    console.log(`  ✓ 10 offers seeded\n`);

    // ═══ DONE ═════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════');
    console.log('✅ BULK SEEDING COMPLETED!');
    console.log('═══════════════════════════════════════════════');
    console.log(`  Products:         ${productCount}`);
    console.log(`  Inventory:        ${invCount}`);
    console.log(`  Customers:        200`);
    console.log(`  Suppliers:        25`);
    console.log(`  Sales:            500`);
    console.log(`  POS Transactions: 300`);
    console.log(`  Purchases:        100`);
    console.log(`  Expenses:         150`);
    console.log(`  Offers:           10`);
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n✗ Bulk seeding failed:', error.message);
    if (error.sql) console.error('  SQL:', error.sql.slice(0, 200));
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seedBulk();
