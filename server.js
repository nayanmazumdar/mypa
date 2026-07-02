const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = 3000;

// ── Seed demo data if empty ─────────────────────────────────────────────
async function seedData() {
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count > 0) return;

  const hash1 = await bcrypt.hash('password123', 10);
  const hash2 = await bcrypt.hash('password123', 10);

  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    'user-001','Ravi Kumar','9876543210','ravi@example.com',hash1,'individual',
    null,'1990-05-15','male','Software Engineer','12, MG Road','Bengaluru',
    'Karnataka','India','560001','9123456780','English','Single',
    new Date('2024-01-10').toISOString()
  );

  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    'user-002','Suresh Patel','9000012345','suresh@shop.com',hash2,'shopkeeper',
    null,'1985-03-20','male','Business Owner','','Ahmedabad',
    'Gujarat','India','380001','','Gujarati','Married',
    new Date('2024-02-01').toISOString()
  );

  db.prepare(`INSERT INTO business_profiles VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    'biz-001','user-002','Patel Grocery Store',null,'Suresh Patel','Grocery Store',
    JSON.stringify(['Grocery Store']),'24ABCDE1234F1Z5','TL-2024-001','REG-2024-001',
    'Shop No. 5, Market Road, Ahmedabad',23.0225,72.5714,
    'Fresh groceries and daily essentials since 2010','','','',
    new Date('2024-02-01').toISOString()
  );

  db.prepare(`INSERT INTO customers VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    'cust-001','biz-001','Raju Das','9876543210','',null,'Tarapur',
    'Farmer','Mohan Das',10000,4500,'active',null,0,
    new Date('2024-03-01').toISOString()
  );

  db.prepare(`INSERT INTO customers VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    'cust-002','biz-001','Meena Shah','9111222333','9444555666',null,
    'Navrangpura, Ahmedabad','Teacher','',5000,1200,'active',null,0,
    new Date('2024-03-15').toISOString()
  );

  db.prepare(`INSERT INTO customer_notes VALUES (?,?,?,?,?,?)`).run(
    uuidv4(),'cust-001','user-002','Pays regularly. VIP customer.',
    new Date('2024-04-01').toISOString(), new Date('2024-04-01').toISOString()
  );

  console.log('✅ Demo data seeded');
}

seedData();

// ── Upload folders ──────────────────────────────────────────────────────
['uploads/photos','uploads/logos','uploads/customer-photos','uploads/documents']
  .forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

// ── Multer ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.path.includes('logo') ? 'uploads/logos'
      : req.path.includes('customer') ? 'uploads/customer-photos'
      : req.path.includes('document') ? 'uploads/documents'
      : 'uploads/photos';
    cb(null, type);
  },
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file format'));
  }
});

// ── Middleware ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(session({
  secret: 'mypa-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Helpers ─────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  const u = db.prepare('SELECT is_active, role FROM users WHERE user_id=?').get(req.session.userId);
  if (!u) { req.session.destroy(); return res.redirect('/login'); }
  if (u.is_active === 0) {
    req.session.destroy();
    return res.render('login', { error: 'Your account has been deactivated. Please contact the administrator.' });
  }
  // Shopkeeper: also check if their business is deactivated
  if (u.role === 'shopkeeper') {
    const biz = db.prepare('SELECT is_active FROM business_profiles WHERE user_id=?').get(req.session.userId);
    if (biz && biz.is_active === 0) {
      req.session.destroy();
      return res.render('login', { error: 'Your business account has been deactivated. Please contact the administrator.' });
    }
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  const u = db.prepare('SELECT role FROM users WHERE user_id=?').get(req.session.userId);
  if (u && u.role === 'admin') return next();
  res.status(403).render('login', { error: 'Access denied. Admins only.' });
}

function getUser(req) {
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.session.userId);
}

function getBusinessByUser(userId) {
  const biz = db.prepare('SELECT * FROM business_profiles WHERE user_id = ?').get(userId);
  if (biz && biz.categories) {
    try { biz.categories = JSON.parse(biz.categories); } catch { biz.categories = []; }
  }
  return biz;
}

function calculateCompleteness(user, role) {
  const fields = role === 'shopkeeper'
    ? ['name','mobile','email','profile_photo','date_of_birth','gender','occupation','address','city','state']
    : ['name','mobile','email','profile_photo','date_of_birth','gender','occupation','address','city','state','country','pincode','emergency_contact','preferred_language','marital_status'];
  const filled = fields.filter(f => user[f] && user[f] !== '');
  return {
    score: Math.round((filled.length / fields.length) * 100),
    missing: fields.filter(f => !user[f] || user[f] === '')
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('landing');
});

// Register
app.get('/register', (req, res) => res.render('register', { error: null }));

app.post('/register', async (req, res) => {
  const { name, mobile, email, password, role, business_name, business_type } = req.body;
  const existing = db.prepare('SELECT user_id FROM users WHERE email=? OR mobile=?').get(email, mobile);
  if (existing) return res.render('register', { error: 'Email or mobile already registered.' });

  const hashed = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  db.prepare(`INSERT INTO users (user_id,name,mobile,email,password,role,created_at) VALUES (?,?,?,?,?,?,?)`)
    .run(userId, name, mobile, email, hashed, role, new Date().toISOString());

  if (role === 'shopkeeper') {
    db.prepare(`INSERT INTO business_profiles (business_id,user_id,business_name,owner_name,business_type,categories,created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(uuidv4(), userId, business_name || name+"'s Shop", name, business_type || 'Other', JSON.stringify([business_type || 'Other']), new Date().toISOString());
  }

  req.session.userId = userId;
  res.redirect('/dashboard');
});

// Login
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { error: 'Invalid email or password.' });
  }
  req.session.userId = user.user_id;
  if (user.role === 'admin') return res.redirect('/admin');
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.session.destroy(function() {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

// Customer logout
app.get('/customer-logout', (req, res) => {
  req.session.destroy(function() {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

app.get('/customer-login', (req, res) => {
  res.render('customer-login', { error: null });
});

// Step 1: verify mobile + password
app.post('/customer-login', async (req, res) => {
  const { mobile, password } = req.body;
  const matches = db.prepare('SELECT * FROM customers WHERE mobile=? AND portal_password IS NOT NULL').all(mobile);
  if (!matches || matches.length === 0)
    return res.render('customer-login', { error: 'Mobile number not found or no password set. Contact your shopkeeper.' });

  // Verify password against first match (all same mobile share same password)
  const valid = await bcrypt.compare(password, matches[0].portal_password);
  if (!valid) return res.render('customer-login', { error: 'Incorrect password.' });

  // Check active status
  const activeMatches = matches.filter(c => c.is_active !== 0 && c.status === 'active');
  if (activeMatches.length === 0)
    return res.render('customer-login', { error: 'Your account is deactivated. Please contact your shopkeeper.' });

  if (activeMatches.length === 1) {
    // Only one business — go straight to portal
    req.session.customerId    = activeMatches[0].customer_id;
    req.session.customerMobile = mobile;
    return res.redirect('/customer-portal');
  }

  // Multiple businesses — show selector
  const bizIds = activeMatches.map(c => c.business_id);
  const businesses = bizIds.map(id => db.prepare('SELECT * FROM business_profiles WHERE business_id=?').get(id)).filter(Boolean);
  req.session.customerMobile  = mobile;
  req.session.customerChoices = activeMatches.map(c => c.customer_id);
  res.render('customer-login', { error: null, businesses, customers: activeMatches });
});

// Step 2: business selection (for multi-business customers)
app.post('/customer-select-business', (req, res) => {
  const { customer_id } = req.body;
  const allowed = req.session.customerChoices || [];
  if (!allowed.includes(customer_id))
    return res.redirect('/customer-login');
  req.session.customerId    = customer_id;
  req.session.customerChoices = null;
  res.redirect('/customer-portal');
});

// Customer portal dashboard
app.get('/customer-portal', (req, res) => {
  if (!req.session.customerId) return res.redirect('/customer-login');
  const { from, to } = req.query;
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.session.customerId);
  if (!customer) { req.session.destroy(); return res.redirect('/customer-login'); }
  const business = db.prepare('SELECT * FROM business_profiles WHERE business_id=?').get(customer.business_id);

  let query = 'SELECT * FROM credit_transactions WHERE customer_id=?';
  const params = [customer.customer_id];
  if (from) { query += ' AND date >= ?'; params.push(from); }
  if (to)   { query += ' AND date <= ?'; params.push(to); }
  query += ' ORDER BY date DESC, created_at DESC';
  const transactions = db.prepare(query).all(...params);

  // Running balance (oldest→newest)
  const sorted = [...transactions].sort((a,b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
  let run = 0;
  const withBal = sorted.map(t => {
    if (t.type === 'sale_credit' || t.type === 'sale') run += t.amount;
    else if (t.type === 'payment_cash' || t.type === 'payment') run -= t.amount;
    return { ...t, running: run };
  });
  const display = withBal.reverse();
  const totalCredit   = transactions.filter(t => t.type==='sale_credit'||t.type==='sale').reduce((s,t)=>s+t.amount,0);
  const totalReceived = transactions.filter(t => t.type==='payment_cash'||t.type==='payment').reduce((s,t)=>s+t.amount,0);
  const outstanding   = totalCredit - totalReceived;

  res.render('customer-portal', { customer, business, transactions: display, totalCredit, totalReceived, outstanding, from: from||'', to: to||'' });
});

// Customer portal report (print)
app.get('/customer-portal/report', (req, res) => {
  if (!req.session.customerId) return res.redirect('/customer-login');
  const { from, to } = req.query;
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.session.customerId);
  if (!customer) return res.redirect('/customer-login');
  const business = db.prepare('SELECT * FROM business_profiles WHERE business_id=?').get(customer.business_id);

  let query = 'SELECT * FROM credit_transactions WHERE customer_id=?';
  const params = [customer.customer_id];
  if (from) { query += ' AND date >= ?'; params.push(from); }
  if (to)   { query += ' AND date <= ?'; params.push(to); }
  query += ' ORDER BY date ASC, created_at ASC';
  const transactions = db.prepare(query).all(...params);

  let run = 0;
  const rows = transactions.map(t => {
    if (t.type === 'sale_credit' || t.type === 'sale') run += t.amount;
    else if (t.type === 'payment_cash' || t.type === 'payment') run -= t.amount;
    return { ...t, running: run };
  });
  const totalCredit   = transactions.filter(t => t.type==='sale_credit'||t.type==='sale').reduce((s,t)=>s+t.amount,0);
  const totalReceived = transactions.filter(t => t.type==='payment_cash'||t.type==='payment').reduce((s,t)=>s+t.amount,0);
  const outstanding   = totalCredit - totalReceived;
  res.render('customer-portal-report', { customer, business, transactions: rows, totalCredit, totalReceived, outstanding, from: from||'', to: to||'' });
});

// Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
  const user = getUser(req);
  if (user.role === 'admin') return res.redirect('/admin');
  const business = user.role === 'shopkeeper' ? getBusinessByUser(user.user_id) : null;
  const customers = business
    ? db.prepare('SELECT * FROM customers WHERE business_id=? ORDER BY created_at DESC').all(business.business_id).map(c => {
        const bal = db.prepare(`SELECT COALESCE(SUM(CASE WHEN type='sale_credit' OR type='sale' THEN amount WHEN type='payment_cash' OR type='payment' THEN -amount ELSE 0 END),0) as bal FROM credit_transactions WHERE customer_id=?`).get(c.customer_id);
        return Object.assign({}, c, { current_balance: bal.bal });
      })
    : [];
  const completeness = calculateCompleteness(user, user.role);
  const totalDue = customers.reduce((s, c) => s + (c.current_balance || 0), 0);

  // Expenditure stats for individual
  const thisMonth = new Date().toISOString().slice(0, 7);
  const totalExpenses = user.role === 'individual'
    ? (db.prepare('SELECT SUM(amount) as t FROM expenditures WHERE user_id=?').get(user.user_id)?.t || 0) : 0;
  const monthExpenses = user.role === 'individual'
    ? (db.prepare("SELECT SUM(amount) as t FROM expenditures WHERE user_id=? AND strftime('%Y-%m',date)=?").get(user.user_id, thisMonth)?.t || 0) : 0;
  const recentExpenses = user.role === 'individual'
    ? db.prepare('SELECT * FROM expenditures WHERE user_id=? ORDER BY date DESC LIMIT 5').all(user.user_id) : [];

  res.render('dashboard', { user, business, customers, completeness, totalDue, totalExpenses: totalExpenses || 0, monthExpenses: monthExpenses || 0, recentExpenses: recentExpenses || [] });
});

// Profile view
app.get('/profile', requireAuth, (req, res) => {
  const user = getUser(req);
  const business = user.role === 'shopkeeper' ? getBusinessByUser(user.user_id) : null;
  const completeness = calculateCompleteness(user, user.role);
  res.render('profile', { user, business, completeness, success: null, error: null });
});

// Profile update
app.post('/profile', requireAuth, upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'business_logo', maxCount: 1 }
]), (req, res) => {
  const user = getUser(req);
  const fields = ['name','mobile','date_of_birth','gender','occupation','address','city','state','country','pincode','emergency_contact','preferred_language','marital_status'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (req.files?.profile_photo) updates.profile_photo = '/' + req.files.profile_photo[0].path.replace(/\\/g, '/');

  const setClauses = Object.keys(updates).map(k => `${k}=?`).join(',');
  if (setClauses) {
    db.prepare(`UPDATE users SET ${setClauses} WHERE user_id=?`).run(...Object.values(updates), user.user_id);
  }

  if (user.role === 'shopkeeper') {
    const biz = getBusinessByUser(user.user_id);
    if (biz) {
      const bizUpdates = {};
      ['business_name','owner_name','business_type','gst_number','license_number','registration_number','description','website','facebook','instagram'].forEach(f => {
        if (req.body[f] !== undefined) bizUpdates[f] = req.body[f];
      });
      if (req.body.address) bizUpdates.address = req.body.address;
      if (req.body.categories) bizUpdates.categories = JSON.stringify(Array.isArray(req.body.categories) ? req.body.categories : [req.body.categories]);
      if (req.files?.business_logo) bizUpdates.business_logo = '/' + req.files.business_logo[0].path.replace(/\\/g, '/');
      const bizSet = Object.keys(bizUpdates).map(k => `${k}=?`).join(',');
      if (bizSet) db.prepare(`UPDATE business_profiles SET ${bizSet} WHERE business_id=?`).run(...Object.values(bizUpdates), biz.business_id);
    }
  }

  const updatedUser = getUser(req);
  const updatedBiz = updatedUser.role === 'shopkeeper' ? getBusinessByUser(updatedUser.user_id) : null;
  const completeness = calculateCompleteness(updatedUser, updatedUser.role);
  res.render('profile', { user: updatedUser, business: updatedBiz, completeness, success: 'Profile updated successfully!', error: null });
});

// Customers list
app.get('/customers', requireAuth, (req, res) => {
  const user = getUser(req);
  if (user.role !== 'shopkeeper') return res.redirect('/dashboard');
  const business = getBusinessByUser(user.user_id);
  const q = req.query.q || '';
  let customers = [];
  if (business) {
    customers = q
      ? db.prepare("SELECT * FROM customers WHERE business_id=? AND (name LIKE ? OR mobile LIKE ?) ORDER BY created_at DESC").all(business.business_id, `%${q}%`, `%${q}%`)
      : db.prepare("SELECT * FROM customers WHERE business_id=? ORDER BY created_at DESC").all(business.business_id);

    // Recompute correct credit balance for each customer from transactions
    customers = customers.map(c => {
      const bal = db.prepare(`
        SELECT COALESCE(SUM(
          CASE WHEN type='sale_credit' OR type='sale' THEN amount
               WHEN type='payment_cash' OR type='payment' THEN -amount
               ELSE 0 END
        ), 0) as bal FROM credit_transactions WHERE customer_id=?
      `).get(c.customer_id);
      return Object.assign({}, c, { current_balance: bal.bal });
    });
  }
  res.render('customers', { user, business, customers, q });
});

// Add customer
app.get('/customers/new', requireAuth, (req, res) => {
  const user = getUser(req);
  if (user.role !== 'shopkeeper') return res.redirect('/dashboard');
  res.render('customer-form', { user, customer: null, error: null });
});

app.post('/customers/new', requireAuth, upload.single('photo'), (req, res) => {
  const user = getUser(req);
  const business = getBusinessByUser(user.user_id);
  if (!business) return res.redirect('/dashboard');
  const existing = db.prepare('SELECT customer_id FROM customers WHERE business_id=? AND mobile=?').get(business.business_id, req.body.mobile);
  if (existing) return res.render('customer-form', { user, customer: null, error: 'Customer with this mobile already exists.' });

  db.prepare(`INSERT INTO customers (customer_id,business_id,name,mobile,alternate_mobile,photo,address,occupation,reference_person,credit_limit,current_balance,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), business.business_id, req.body.name, req.body.mobile,
      req.body.alternate_mobile || '', req.file ? '/'+req.file.path.replace(/\\/g,'/') : null,
      req.body.address || '', req.body.occupation || '', req.body.reference_person || '',
      parseFloat(req.body.credit_limit)||0, 0, 'active', new Date().toISOString());
  res.redirect('/customers');
});

// Customer transaction report (print/PDF)
app.get('/customers/:id/report', requireAuth, (req, res) => {
  const user = getUser(req);
  const business = getBusinessByUser(user.user_id);
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!customer) return res.redirect('/customers');

  const { from, to } = req.query;
  let query = 'SELECT * FROM credit_transactions WHERE customer_id=?';
  const params = [req.params.id];
  if (from) { query += ' AND date >= ?'; params.push(from); }
  if (to)   { query += ' AND date <= ?'; params.push(to); }
  query += ' ORDER BY date ASC, created_at ASC';

  const transactions = db.prepare(query).all(...params);

  let run = 0;
  const rows = transactions.map(function(t) {
    if (t.type === 'sale_credit' || t.type === 'sale') run += t.amount;
    else if (t.type === 'payment_cash' || t.type === 'payment') run -= t.amount;
    return Object.assign({}, t, { running: run });
  });

  const totalCredit   = transactions.filter(t => t.type === 'sale_credit' || t.type === 'sale').reduce((s,t) => s+t.amount, 0);
  const totalReceived = transactions.filter(t => t.type === 'payment_cash' || t.type === 'payment').reduce((s,t) => s+t.amount, 0);
  const outstanding   = totalCredit - totalReceived;

  res.render('customer-report', { user, business, customer, transactions: rows, totalCredit, totalReceived, outstanding, from: from||'', to: to||'' });
});

// Customer detail
app.get('/customers/:id', requireAuth, (req, res) => {
  const user = getUser(req);
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!customer) return res.redirect('/customers');
  const business = db.prepare('SELECT * FROM business_profiles WHERE business_id=?').get(customer.business_id);
  const notes = db.prepare('SELECT * FROM customer_notes WHERE customer_id=? ORDER BY created_at DESC').all(req.params.id);
  const family = customer.family_group_id
    ? db.prepare('SELECT * FROM customers WHERE family_group_id=? AND customer_id!=?').all(customer.family_group_id, customer.customer_id)
    : [];
  const transactions = db.prepare(
    'SELECT * FROM credit_transactions WHERE customer_id=? ORDER BY date DESC, created_at DESC'
  ).all(req.params.id);
  res.render('customer-detail', { user, customer, business, notes, family, transactions });
});

// Add credit transaction (sale on credit or received payment)
app.post('/customers/:id/transaction', requireAuth, upload.single('bill_photo'), (req, res) => {
  const { type, amount, date, note } = req.body;
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!customer) return res.redirect('/customers');

  // Block transactions for deactivated customers
  if (customer.is_active === 0 || customer.status === 'inactive') {
    return res.redirect('/customers/' + req.params.id + '?error=deactivated');
  }

  const business = getBusinessByUser(getUser(req).user_id);
  const amt = parseFloat(amount);
  if (!amt || amt <= 0 || !date || !type) return res.redirect('/customers/' + req.params.id);

  const billPhoto = req.file
    ? '/' + req.file.path.replace(/\\/g, '/')
    : req.body.bill_photo_data
      ? (() => {
          const base64 = req.body.bill_photo_data.replace(/^data:image\/\w+;base64,/, '');
          const fname  = 'uploads/photos/' + uuidv4() + '.jpg';
          require('fs').writeFileSync(fname, Buffer.from(base64, 'base64'));
          return '/' + fname;
        })()
      : null;

  db.prepare(`INSERT INTO credit_transactions (txn_id,customer_id,business_id,type,amount,note,bill_photo,date,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), customer.customer_id, business.business_id, type, amt,
      note || '', billPhoto, date, new Date().toISOString());

  const result = db.prepare(`
    SELECT COALESCE(SUM(
      CASE
        WHEN type='sale_credit' OR type='sale' THEN amount
        WHEN type='payment_cash' OR type='payment' THEN -amount
        ELSE 0
      END
    ), 0) as bal
    FROM credit_transactions WHERE customer_id=?
  `).get(customer.customer_id);

  db.prepare('UPDATE customers SET current_balance=? WHERE customer_id=?')
    .run(result.bal, customer.customer_id);

  res.redirect('/customers/' + req.params.id);
});

// Customer transaction report (print/PDF)
app.get('/customers/:id/report', requireAuth, (req, res) => {
  const user = getUser(req);
  const business = getBusinessByUser(user.user_id);
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!customer) return res.redirect('/customers');

  const { from, to } = req.query;
  let query = 'SELECT * FROM credit_transactions WHERE customer_id=?';
  const params = [req.params.id];
  if (from) { query += ' AND date >= ?'; params.push(from); }
  if (to)   { query += ' AND date <= ?'; params.push(to); }
  query += ' ORDER BY date ASC, created_at ASC';

  const transactions = db.prepare(query).all(...params);

  // Running balance
  let run = 0;
  const rows = transactions.map(function(t) {
    if (t.type === 'sale_credit' || t.type === 'sale') run += t.amount;
    else if (t.type === 'payment_cash' || t.type === 'payment') run -= t.amount;
    return Object.assign({}, t, { running: run });
  });

  const totalCredit   = transactions.filter(t => t.type === 'sale_credit' || t.type === 'sale').reduce((s,t) => s+t.amount, 0);
  const totalReceived = transactions.filter(t => t.type === 'payment_cash' || t.type === 'payment').reduce((s,t) => s+t.amount, 0);
  const outstanding   = totalCredit - totalReceived;

  res.render('customer-report', { user, business, customer, transactions: rows, totalCredit, totalReceived, outstanding, from: from||'', to: to||'' });
});
app.get('/customers/:id/edit', requireAuth, (req, res) => {
  const user = getUser(req);
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!customer) return res.redirect('/customers');
  res.render('customer-form', { user, customer, error: null });
});

app.post('/customers/:id/edit', requireAuth, upload.single('photo'), (req, res) => {
  const updates = {};
  ['name','mobile','alternate_mobile','address','occupation','reference_person'].forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  if (req.body.credit_limit) updates.credit_limit = parseFloat(req.body.credit_limit);
  if (req.file) updates.photo = '/'+req.file.path.replace(/\\/g,'/');
  const set = Object.keys(updates).map(k=>`${k}=?`).join(',');
  if (set) db.prepare(`UPDATE customers SET ${set} WHERE customer_id=?`).run(...Object.values(updates), req.params.id);
  res.redirect('/customers/'+req.params.id);
});

// Add note
app.post('/customers/:id/notes', requireAuth, (req, res) => {
  const user = getUser(req);
  db.prepare('INSERT INTO customer_notes (note_id,customer_id,shopkeeper_id,text,created_at,updated_at) VALUES (?,?,?,?,?,?)')
    .run(uuidv4(), req.params.id, user.user_id, req.body.text, new Date().toISOString(), new Date().toISOString());
  res.redirect('/customers/'+req.params.id);
});

// Business digital card (print)
app.get('/business/card', requireAuth, async (req, res) => {
  const user = getUser(req);
  const business = getBusinessByUser(user.user_id);
  if (!business) return res.redirect('/profile');
  const qrDataUrl = await QRCode.toDataURL(`http://localhost:${PORT}/register-credit?shop=${business.business_id}`, { width: 250 });
  res.render('business-card', { user, business, qrDataUrl });
});

// Shop QR
app.get('/qr/shop', requireAuth, async (req, res) => {
  const user = getUser(req);
  const business = getBusinessByUser(user.user_id);
  if (!business) return res.redirect('/dashboard');
  const url = `http://localhost:${PORT}/register-credit?shop=${business.business_id}`;
  const qrDataUrl = await QRCode.toDataURL(url, { width: 300 });
  res.render('qr-shop', { user, business, qrDataUrl, url });
});

// Self-registration
app.get('/register-credit', (req, res) => {
  const shopId = req.query.shop;
  const business = db.prepare('SELECT * FROM business_profiles WHERE business_id=?').get(shopId);
  if (!business) return res.send('<h2>Invalid QR Code</h2>');
  res.render('self-register', { business, error: null, success: null });
});

app.post('/register-credit', (req, res) => {
  const shopId = req.body.shop_id;
  const business = db.prepare('SELECT * FROM business_profiles WHERE business_id=?').get(shopId);
  if (!business) return res.send('<h2>Invalid shop</h2>');
  const existing = db.prepare('SELECT customer_id FROM customers WHERE business_id=? AND mobile=?').get(shopId, req.body.mobile);
  if (existing) return res.render('self-register', { business, error: 'You are already registered at this shop.', success: null });

  db.prepare(`INSERT INTO customers (customer_id,business_id,name,mobile,alternate_mobile,photo,address,occupation,reference_person,credit_limit,current_balance,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), shopId, req.body.name, req.body.mobile, '', null, req.body.address||'', '', '', 1000, 0, 'active', new Date().toISOString());
  res.render('self-register', { business, error: null, success: `Welcome! You are now registered at ${business.business_name} for credit purchases.` });
});

// Customer QR card
app.get('/customers/:id/qr', requireAuth, async (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!customer) return res.redirect('/customers');
  const business = db.prepare('SELECT * FROM business_profiles WHERE business_id=?').get(customer.business_id);
  const qrDataUrl = await QRCode.toDataURL(`customer:${customer.customer_id}:${customer.mobile}`, { width: 250 });
  res.render('customer-card', { customer, business, qrDataUrl });
});

// Documents
app.get('/documents', requireAuth, (req, res) => {
  const user = getUser(req);
  const docs = db.prepare('SELECT * FROM documents WHERE owner_user_id=? ORDER BY uploaded_at DESC').all(user.user_id);
  res.render('documents', { user, docs, error: null, success: null });
});

app.post('/documents/upload', requireAuth, upload.single('document'), (req, res) => {
  const user = getUser(req);
  if (!req.file) {
    const docs = db.prepare('SELECT * FROM documents WHERE owner_user_id=?').all(user.user_id);
    return res.render('documents', { user, docs, error: 'No file uploaded or invalid format.', success: null });
  }
  db.prepare('INSERT INTO documents (document_id,owner_user_id,document_type,file_name,file_path,uploaded_at) VALUES (?,?,?,?,?,?)')
    .run(uuidv4(), user.user_id, req.body.document_type||'other', req.file.originalname, '/'+req.file.path.replace(/\\/g,'/'), new Date().toISOString());
  const docs = db.prepare('SELECT * FROM documents WHERE owner_user_id=? ORDER BY uploaded_at DESC').all(user.user_id);
  res.render('documents', { user, docs, error: null, success: 'Document uploaded successfully!' });
});

app.get('/documents/delete/:id', requireAuth, (req, res) => {
  const user = getUser(req);
  db.prepare('DELETE FROM documents WHERE document_id=? AND owner_user_id=?').run(req.params.id, user.user_id);
  res.redirect('/documents');
});

// Add credit transaction
app.post('/customers/:id/transaction', requireAuth, (req, res) => {
  const { type, amount, date, note } = req.body;
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!customer) return res.redirect('/customers');

  const business = getBusinessByUser(getUser(req).user_id);
  const amt = parseFloat(amount);
  if (!amt || amt <= 0 || !date || !type) return res.redirect('/customers/' + req.params.id);

  db.prepare(`INSERT INTO credit_transactions (txn_id,customer_id,business_id,type,amount,note,date,created_at)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), customer.customer_id, business.business_id, type, amt,
      note || '', date, new Date().toISOString());

  // Only sale_credit increases balance, payment_cash decreases it
  // sale_cash has no effect on credit balance
  const result = db.prepare(`
    SELECT COALESCE(SUM(
      CASE
        WHEN type='sale_credit' OR type='sale' THEN amount
        WHEN type='payment_cash' OR type='payment' THEN -amount
        ELSE 0
      END
    ), 0) as bal
    FROM credit_transactions WHERE customer_id=?
  `).get(customer.customer_id);

  db.prepare('UPDATE customers SET current_balance=? WHERE customer_id=?')
    .run(result.bal, customer.customer_id);

  res.redirect('/customers/' + req.params.id);
});
app.post('/customers/:id/transaction/:txnId/delete', requireAuth, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!customer) return res.redirect('/customers');

  db.prepare('DELETE FROM credit_transactions WHERE txn_id=? AND customer_id=?')
    .run(req.params.txnId, req.params.id);

  // Recompute balance after deletion
  const result = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type='sale' THEN amount ELSE -amount END), 0) as balance
    FROM credit_transactions WHERE customer_id=?
  `).get(req.params.id);

  db.prepare('UPDATE customers SET current_balance=? WHERE customer_id=?')
    .run(result.balance, req.params.id);

  res.redirect('/customers/' + req.params.id);
});

// ── Expenditure routes ────────────────────────────────────────────────────

// Expenditure report (print/PDF)
app.get('/expenditures/report', requireAuth, (req, res) => {
  const user = getUser(req);
  const { from, to, category } = req.query;

  let query = 'SELECT * FROM expenditures WHERE user_id=?';
  const params = [user.user_id];
  if (from)     { query += ' AND date >= ?';     params.push(from); }
  if (to)       { query += ' AND date <= ?';     params.push(to); }
  if (category) { query += ' AND category = ?';  params.push(category); }
  query += ' ORDER BY date ASC';

  const expenditures = db.prepare(query).all(...params);
  const total = expenditures.reduce((s, e) => s + e.amount, 0);

  // Summary by category
  const summaryMap = {};
  expenditures.forEach(function(e) {
    if (!summaryMap[e.category]) summaryMap[e.category] = { total: 0, count: 0 };
    summaryMap[e.category].total += e.amount;
    summaryMap[e.category].count += 1;
  });
  const summary = Object.keys(summaryMap).map(k => ({ category: k, total: summaryMap[k].total, count: summaryMap[k].count }))
    .sort((a, b) => b.total - a.total);

  const categories = ['Food & Dining','Groceries','Transport','Utilities','Rent','Healthcare',
    'Education','Shopping','Entertainment','Fuel','Mobile/Internet','EMI/Loan',
    'Insurance','Investment','Personal Care','Travel','Gifts','Other'];

  res.render('expenditure-report', { user, expenditures, total, summary, categories, from: from||'', to: to||'', category: category||'' });
});

// List expenditures
app.get('/expenditures', requireAuth, (req, res) => {
  const user = getUser(req);
  const { month, category } = req.query;
  let query = 'SELECT * FROM expenditures WHERE user_id=?';
  const params = [user.user_id];
  if (month) { query += " AND strftime('%Y-%m', date)=?"; params.push(month); }
  if (category) { query += ' AND category=?'; params.push(category); }
  query += ' ORDER BY date DESC';
  const expenditures = db.prepare(query).all(...params);
  const total = expenditures.reduce((s, e) => s + e.amount, 0);

  // Summary by category
  const summary = db.prepare(
    'SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenditures WHERE user_id=? GROUP BY category ORDER BY total DESC'
  ).all(user.user_id);

  // Monthly totals (last 6 months)
  const monthly = db.prepare(
    `SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
     FROM expenditures WHERE user_id=?
     GROUP BY month ORDER BY month DESC LIMIT 6`
  ).all(user.user_id);

  const categories = ['Food & Dining','Groceries','Transport','Utilities','Rent','Healthcare',
    'Education','Shopping','Entertainment','Fuel','Mobile/Internet','EMI/Loan',
    'Insurance','Investment','Personal Care','Travel','Gifts','Other'];

  res.render('expenditures', {
    user, expenditures, total, summary, monthly,
    categories, month: month || '', category: category || '',
    success: null, error: null
  });
});

// Add expenditure
app.post('/expenditures/add', requireAuth, (req, res) => {
  const user = getUser(req);
  const { amount, category, description, date, payment_mode } = req.body;
  if (!amount || !category || !date) return res.redirect('/expenditures?error=missing');
  db.prepare(`INSERT INTO expenditures (expenditure_id,user_id,amount,category,description,date,payment_mode,created_at)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), user.user_id, parseFloat(amount), category,
      description || '', date, payment_mode || 'cash', new Date().toISOString());
  res.redirect('/expenditures');
});

// Delete expenditure
app.get('/expenditures/delete/:id', requireAuth, (req, res) => {
  const user = getUser(req);
  db.prepare('DELETE FROM expenditures WHERE expenditure_id=? AND user_id=?').run(req.params.id, user.user_id);
  res.redirect('/expenditures');
});

// API: expenditure chart data
app.get('/api/expenditures/chart', requireAuth, (req, res) => {
  const user = getUser(req);
  const data = db.prepare(
    'SELECT category, SUM(amount) as total FROM expenditures WHERE user_id=? GROUP BY category ORDER BY total DESC'
  ).all(user.user_id);
  res.json(data);
});

// ── Admin panel ──────────────────────────────────────────────────────────

app.get('/admin', requireAdmin, (req, res) => {
  runExpiryCheck();
  const user = getUser(req);
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  const businesses = db.prepare('SELECT * FROM business_profiles ORDER BY created_at DESC').all();
  const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
  const notes = db.prepare('SELECT * FROM customer_notes ORDER BY created_at DESC').all();
  const documents = db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all();
  const transactions = db.prepare('SELECT * FROM credit_transactions ORDER BY date DESC, created_at DESC').all();
  const subscriptions = db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 200').all();
  const msg = req.query.msg || null;
  const tab = req.query.tab || null;
  res.render('admin', { user, users, businesses, customers, notes, documents, transactions, subscriptions, msg, tab });
});

// Admin: delete user (cascade)
app.post('/admin/users/:id/delete', requireAdmin, (req, res) => {
  const id = req.params.id;
  if (id === req.session.userId) return res.redirect('/admin?msg=Cannot delete your own account');
  const biz = db.prepare('SELECT business_id FROM business_profiles WHERE user_id=?').get(id);
  if (biz) {
    db.prepare('DELETE FROM credit_transactions WHERE business_id=?').run(biz.business_id);
    db.prepare('DELETE FROM customer_notes WHERE customer_id IN (SELECT customer_id FROM customers WHERE business_id=?)').run(biz.business_id);
    db.prepare('DELETE FROM customers WHERE business_id=?').run(biz.business_id);
    db.prepare('DELETE FROM business_profiles WHERE business_id=?').run(biz.business_id);
  }
  db.prepare('DELETE FROM expenditures WHERE user_id=?').run(id);
  db.prepare('DELETE FROM documents WHERE owner_user_id=?').run(id);
  db.prepare('DELETE FROM customer_notes WHERE shopkeeper_id=?').run(id);
  db.prepare('DELETE FROM users WHERE user_id=?').run(id);
  res.redirect('/admin?msg=User deleted successfully');
});

// Admin: edit user
app.post('/admin/users/:id/edit', requireAdmin, (req, res) => {
  const { name, mobile, email, role, city, occupation } = req.body;
  db.prepare('UPDATE users SET name=?,mobile=?,email=?,role=?,city=?,occupation=? WHERE user_id=?')
    .run(name, mobile, email, role, city||'', occupation||'', req.params.id);
  res.redirect('/admin?msg=User updated successfully');
});

// Admin: reset user password
app.post('/admin/users/:id/reset-password', requireAdmin, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) return res.redirect('/admin?msg=Password must be at least 6 characters');
  const hash = await bcrypt.hash(new_password, 10);
  db.prepare('UPDATE users SET password=? WHERE user_id=?').run(hash, req.params.id);
  res.redirect('/admin?msg=Password reset successfully');
});

// Admin: reset customer portal password
app.post('/admin/customers/:id/reset-password', requireAdmin, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 4)
    return res.redirect('/admin?msg=Password must be at least 4 characters');
  const hash = await bcrypt.hash(new_password, 10);
  // Apply same password to all customers with same mobile (multi-business)
  const c = db.prepare('SELECT mobile FROM customers WHERE customer_id=?').get(req.params.id);
  if (c) db.prepare('UPDATE customers SET portal_password=? WHERE mobile=?').run(hash, c.mobile);
  res.redirect('/admin?msg=Customer portal password updated');
});

// Admin: delete customer
app.post('/admin/customers/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM credit_transactions WHERE customer_id=?').run(req.params.id);
  db.prepare('DELETE FROM customer_notes WHERE customer_id=?').run(req.params.id);
  db.prepare('DELETE FROM customers WHERE customer_id=?').run(req.params.id);
  res.redirect('/admin?msg=Customer deleted successfully');
});

// Admin: toggle customer status
app.post('/admin/customers/:id/toggle-status', requireAdmin, (req, res) => {
  const c = db.prepare('SELECT status FROM customers WHERE customer_id=?').get(req.params.id);
  if (c) db.prepare('UPDATE customers SET status=? WHERE customer_id=?')
    .run(c.status === 'active' ? 'inactive' : 'active', req.params.id);
  res.redirect('/admin?msg=Customer status updated');
});

// Admin: update own profile
app.post('/admin/profile', requireAdmin, upload.fields([{ name: 'profile_photo', maxCount: 1 }]), (req, res) => {
  const user = getUser(req);
  const updates = {};
  ['name', 'mobile', 'city'].forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (req.files && req.files.profile_photo) updates.profile_photo = '/' + req.files.profile_photo[0].path.replace(/\\/g, '/');
  const set = Object.keys(updates).map(k => k + '=?').join(',');
  if (set) db.prepare('UPDATE users SET ' + set + ' WHERE user_id=?').run(...Object.values(updates), user.user_id);
  res.redirect('/admin?tab=myprofile&msg=Profile updated successfully');
});

// Admin: change own password
app.post('/admin/change-password', requireAdmin, async (req, res) => {
  const user = getUser(req);
  const { current_password, new_password, confirm_password } = req.body;
  if (new_password !== confirm_password)
    return res.redirect('/admin?tab=myprofile&msg=New passwords do not match');
  if (!new_password || new_password.length < 6)
    return res.redirect('/admin?tab=myprofile&msg=Password must be at least 6 characters');
  const valid = await bcrypt.compare(current_password, user.password);
  if (!valid) return res.redirect('/admin?tab=myprofile&msg=Current password is incorrect');
  const hash = await bcrypt.hash(new_password, 10);
  db.prepare('UPDATE users SET password=? WHERE user_id=?').run(hash, user.user_id);
  res.redirect('/admin?tab=myprofile&msg=Password changed successfully');
});

// Admin: delete note
app.post('/admin/notes/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM customer_notes WHERE note_id=?').run(req.params.id);
  res.redirect('/admin?msg=Note deleted');
});

// Admin: delete transaction
app.post('/admin/transactions/:id/delete', requireAdmin, (req, res) => {
  const txn = db.prepare('SELECT * FROM credit_transactions WHERE txn_id=?').get(req.params.id);
  if (txn) {
    db.prepare('DELETE FROM credit_transactions WHERE txn_id=?').run(req.params.id);
    const result = db.prepare(`SELECT COALESCE(SUM(CASE WHEN type='sale' THEN amount ELSE -amount END),0) as bal FROM credit_transactions WHERE customer_id=?`).get(txn.customer_id);
    db.prepare('UPDATE customers SET current_balance=? WHERE customer_id=?').run(result.bal, txn.customer_id);
  }
  res.redirect('/admin?msg=Transaction deleted');
});

// Admin: delete document
app.post('/admin/documents/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM documents WHERE document_id=?').run(req.params.id);
  res.redirect('/admin?msg=Document deleted');
});

// ── Subscription / Activation routes ─────────────────────────────────────

function logSub(entityType, entityId, entityName, action, activeUntil, feeAmount, feeNote, doneBy) {
  const { v4: uuidv4 } = require('uuid');
  db.prepare(`INSERT INTO subscriptions (sub_id,entity_type,entity_id,entity_name,action,active_until,fee_amount,fee_note,done_by,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), entityType, entityId, entityName||'', action, activeUntil||'', feeAmount||0, feeNote||'', doneBy, new Date().toISOString());
  // Record in earnings if a fee was paid
  if (feeAmount && parseFloat(feeAmount) > 0) {
    db.prepare(`INSERT INTO earnings (earning_id,entity_type,entity_id,entity_name,plan_note,amount,payment_date,active_until,recorded_by,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(uuidv4(), entityType, entityId, entityName||'', feeNote||action, parseFloat(feeAmount),
        new Date().toISOString().slice(0,10), activeUntil||'', doneBy, new Date().toISOString());
  }
}

// Set expiry for user
app.post('/admin/users/:id/set-expiry', requireAdmin, (req, res) => {
  const { active_until, fee_amount, fee_note } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE user_id=?').get(req.params.id);
  if (!u) return res.redirect('/admin?msg=User not found');
  if (u.role === 'admin') return res.redirect('/admin?msg=Admin accounts cannot be deactivated');
  db.prepare('UPDATE users SET active_until=?, is_active=1 WHERE user_id=?').run(active_until, req.params.id);
  logSub('user', u.user_id, u.name, 'set_expiry', active_until, fee_amount, fee_note, req.session.userId);
  res.redirect('/admin?msg=User expiry set. User is now active until ' + active_until);
});

// Activate user (mark fee paid, clear expiry or extend)
app.post('/admin/users/:id/activate', requireAdmin, (req, res) => {
  const { active_until, fee_amount, fee_note } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE user_id=?').get(req.params.id);
  if (!u) return res.redirect('/admin?msg=User not found');
  if (u.role === 'admin') return res.redirect('/admin?msg=Admin accounts cannot be deactivated');
  db.prepare('UPDATE users SET is_active=1, active_until=? WHERE user_id=?').run(active_until||null, req.params.id);
  logSub('user', u.user_id, u.name, 'activated', active_until, fee_amount, fee_note, req.session.userId);
  res.redirect('/admin?msg=User activated successfully');
});

// Deactivate user manually
app.post('/admin/users/:id/deactivate', requireAdmin, (req, res) => {
  const { fee_note } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE user_id=?').get(req.params.id);
  if (!u) return res.redirect('/admin?msg=User not found');
  if (u.role === 'admin') return res.redirect('/admin?msg=Admin accounts cannot be deactivated');
  db.prepare('UPDATE users SET is_active=0 WHERE user_id=?').run(req.params.id);
  logSub('user', u.user_id, u.name, 'deactivated', null, 0, fee_note||'Manual deactivation', req.session.userId);
  res.redirect('/admin?msg=User deactivated');
});

// Set expiry for business
app.post('/admin/businesses/:id/set-expiry', requireAdmin, (req, res) => {
  const { active_until, fee_amount, fee_note } = req.body;
  const b = db.prepare('SELECT * FROM business_profiles WHERE business_id=?').get(req.params.id);
  if (!b) return res.redirect('/admin?msg=Business not found');
  db.prepare('UPDATE business_profiles SET active_until=?, is_active=1 WHERE business_id=?').run(active_until, req.params.id);
  logSub('business', b.business_id, b.business_name, 'set_expiry', active_until, fee_amount, fee_note, req.session.userId);
  res.redirect('/admin?msg=Business expiry set');
});

// Activate business
app.post('/admin/businesses/:id/activate', requireAdmin, (req, res) => {
  const { active_until, fee_amount, fee_note } = req.body;
  const b = db.prepare('SELECT * FROM business_profiles WHERE business_id=?').get(req.params.id);
  if (!b) return res.redirect('/admin?msg=Business not found');
  db.prepare('UPDATE business_profiles SET is_active=1, active_until=? WHERE business_id=?').run(active_until||null, req.params.id);
  logSub('business', b.business_id, b.business_name, 'activated', active_until, fee_amount, fee_note, req.session.userId);
  res.redirect('/admin?msg=Business activated successfully');
});

// Deactivate business
app.post('/admin/businesses/:id/deactivate', requireAdmin, (req, res) => {
  const { fee_note } = req.body;
  const b = db.prepare('SELECT * FROM business_profiles WHERE business_id=?').get(req.params.id);
  if (!b) return res.redirect('/admin?msg=Business not found');
  db.prepare('UPDATE business_profiles SET is_active=0 WHERE business_id=?').run(req.params.id);
  logSub('business', b.business_id, b.business_name, 'deactivated', null, 0, fee_note||'Manual deactivation', req.session.userId);
  res.redirect('/admin?msg=Business deactivated');
});

// Set expiry for customer
app.post('/admin/customers/:id/set-expiry', requireAdmin, (req, res) => {
  const { active_until, fee_amount, fee_note } = req.body;
  const c = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!c) return res.redirect('/admin?msg=Customer not found');
  db.prepare('UPDATE customers SET active_until=?, is_active=1, status=? WHERE customer_id=?').run(active_until, 'active', req.params.id);
  logSub('customer', c.customer_id, c.name, 'set_expiry', active_until, fee_amount, fee_note, req.session.userId);
  res.redirect('/admin?msg=Customer expiry set');
});

// Activate customer (fee paid)
app.post('/admin/customers/:id/activate', requireAdmin, (req, res) => {
  const { active_until, fee_amount, fee_note } = req.body;
  const c = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!c) return res.redirect('/admin?msg=Customer not found');
  db.prepare('UPDATE customers SET is_active=1, status=?, active_until=? WHERE customer_id=?').run('active', active_until||null, req.params.id);
  logSub('customer', c.customer_id, c.name, 'activated', active_until, fee_amount, fee_note, req.session.userId);
  res.redirect('/admin?msg=Customer activated successfully');
});

// Deactivate customer
app.post('/admin/customers/:id/deactivate', requireAdmin, (req, res) => {
  const { fee_note } = req.body;
  const c = db.prepare('SELECT * FROM customers WHERE customer_id=?').get(req.params.id);
  if (!c) return res.redirect('/admin?msg=Customer not found');
  db.prepare('UPDATE customers SET is_active=0, status=? WHERE customer_id=?').run('inactive', req.params.id);
  logSub('customer', c.customer_id, c.name, 'deactivated', null, 0, fee_note||'Manual deactivation', req.session.userId);
  res.redirect('/admin?msg=Customer deactivated');
});

// ── Earnings routes ───────────────────────────────────────────────────────

app.get('/admin/earnings', requireAdmin, (req, res) => {
  const user = getUser(req);
  const { from, to, type } = req.query;
  let query = 'SELECT * FROM earnings WHERE 1=1';
  const params = [];
  if (from) { query += ' AND payment_date >= ?'; params.push(from); }
  if (to)   { query += ' AND payment_date <= ?'; params.push(to); }
  if (type) { query += ' AND entity_type = ?';   params.push(type); }
  query += ' ORDER BY payment_date DESC, created_at DESC';
  const earnings = db.prepare(query).all(...params);
  const total = earnings.reduce((s, e) => s + e.amount, 0);
  const totalUsers     = earnings.filter(e => e.entity_type === 'user').reduce((s,e) => s+e.amount, 0);
  const totalBusiness  = earnings.filter(e => e.entity_type === 'business').reduce((s,e) => s+e.amount, 0);
  const totalCustomers = earnings.filter(e => e.entity_type === 'customer').reduce((s,e) => s+e.amount, 0);
  res.render('earnings', { user, earnings, total, totalUsers, totalBusiness, totalCustomers, from: from||'', to: to||'', type: type||'' });
});

app.get('/admin/earnings/report', requireAdmin, (req, res) => {
  const user = getUser(req);
  const { from, to, type } = req.query;
  let query = 'SELECT * FROM earnings WHERE 1=1';
  const params = [];
  if (from) { query += ' AND payment_date >= ?'; params.push(from); }
  if (to)   { query += ' AND payment_date <= ?'; params.push(to); }
  if (type) { query += ' AND entity_type = ?';   params.push(type); }
  query += ' ORDER BY payment_date ASC, created_at ASC';
  const earnings = db.prepare(query).all(...params);
  const total = earnings.reduce((s, e) => s + e.amount, 0);
  const totalUsers     = earnings.filter(e => e.entity_type === 'user').reduce((s,e) => s+e.amount, 0);
  const totalBusiness  = earnings.filter(e => e.entity_type === 'business').reduce((s,e) => s+e.amount, 0);
  const totalCustomers = earnings.filter(e => e.entity_type === 'customer').reduce((s,e) => s+e.amount, 0);
  res.render('earnings-report', { user, earnings, total, totalUsers, totalBusiness, totalCustomers, from: from||'', to: to||'', type: type||'' });
});
function runExpiryCheck() {
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`UPDATE users SET is_active=0 WHERE active_until IS NOT NULL AND active_until < ? AND is_active=1 AND role != 'admin'`).run(today);
  db.prepare(`UPDATE business_profiles SET is_active=0 WHERE active_until IS NOT NULL AND active_until < ? AND is_active=1`).run(today);
  db.prepare(`UPDATE customers SET is_active=0, status='inactive' WHERE active_until IS NOT NULL AND active_until < ? AND is_active=1`).run(today);
}

// ── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ MyPA is running at: http://localhost:${PORT}`);
  console.log('📦 Database: mypa.db (SQLite)');
  console.log('\nDemo accounts:');
  console.log('  Individual → ravi@example.com / password123');
  console.log('  Shopkeeper → suresh@shop.com  / password123\n');
});
