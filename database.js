const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'mypa.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ── Create tables ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'individual',
    profile_photo TEXT,
    date_of_birth TEXT,
    gender TEXT,
    occupation TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    pincode TEXT,
    emergency_contact TEXT,
    preferred_language TEXT,
    marital_status TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS business_profiles (
    business_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    business_name TEXT NOT NULL,
    business_logo TEXT,
    owner_name TEXT,
    business_type TEXT,
    categories TEXT,
    gst_number TEXT,
    license_number TEXT,
    registration_number TEXT,
    address TEXT,
    latitude REAL,
    longitude REAL,
    description TEXT,
    website TEXT,
    facebook TEXT,
    instagram TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    alternate_mobile TEXT,
    photo TEXT,
    address TEXT,
    occupation TEXT,
    reference_person TEXT,
    credit_limit REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    family_group_id TEXT,
    is_primary INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (business_id) REFERENCES business_profiles(business_id)
  );

  CREATE TABLE IF NOT EXISTS customer_notes (
    note_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    shopkeeper_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
  );

  CREATE TABLE IF NOT EXISTS expenditures (
    expenditure_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    payment_mode TEXT DEFAULT 'cash',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    document_id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY (owner_user_id) REFERENCES users(user_id)
  );
`);

console.log('✅ Database connected: mypa.db');

// Seed/reset admin account on every startup
{
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const existing = db.prepare("SELECT user_id FROM users WHERE email='admin@mypa.com'").get();
  const hash = bcrypt.hashSync('admin123', 10);
  if (!existing) {
    db.prepare(`INSERT INTO users (user_id,name,mobile,email,password,role,created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(uuidv4(), 'Admin', '0000000000', 'admin@mypa.com', hash, 'admin', new Date().toISOString());
    console.log('✅ Admin account created: admin@mypa.com / admin123');
  } else {
    db.prepare(`UPDATE users SET password=?, role='admin' WHERE email='admin@mypa.com'`).run(hash);
    console.log('✅ Admin password verified: admin@mypa.com / admin123');
  }
}

// ── Migrations ─────────────────────────────────────────────────────────────
// credit_transactions table
try {
  db.exec(`CREATE TABLE IF NOT EXISTS credit_transactions (
    txn_id      TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    type        TEXT NOT NULL,
    amount      REAL NOT NULL,
    note        TEXT,
    date        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
  );`);
} catch(e) {}

// bill_photo column for credit_transactions
try { db.exec(`ALTER TABLE credit_transactions ADD COLUMN bill_photo TEXT;`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;`);  } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN active_until TEXT;`);             } catch(e) {}

// is_active + active_until for business_profiles
try { db.exec(`ALTER TABLE business_profiles ADD COLUMN is_active INTEGER DEFAULT 1;`); } catch(e) {}
try { db.exec(`ALTER TABLE business_profiles ADD COLUMN active_until TEXT;`);           } catch(e) {}

// is_active + active_until for customers
try { db.exec(`ALTER TABLE customers ADD COLUMN is_active INTEGER DEFAULT 1;`); } catch(e) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN active_until TEXT;`);           } catch(e) {}

// Customer portal password
try { db.exec(`ALTER TABLE customers ADD COLUMN portal_password TEXT;`); } catch(e) {}

// Earnings table — subscription fee payments
try {
  db.exec(`CREATE TABLE IF NOT EXISTS earnings (
    earning_id   TEXT PRIMARY KEY,
    entity_type  TEXT NOT NULL,
    entity_id    TEXT NOT NULL,
    entity_name  TEXT,
    plan_note    TEXT,
    amount       REAL NOT NULL DEFAULT 0,
    payment_date TEXT NOT NULL,
    active_until TEXT,
    recorded_by  TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );`);
} catch(e) {}

// Subscriptions log
try {
  db.exec(`CREATE TABLE IF NOT EXISTS subscriptions (
    sub_id       TEXT PRIMARY KEY,
    entity_type  TEXT NOT NULL,
    entity_id    TEXT NOT NULL,
    entity_name  TEXT,
    action       TEXT NOT NULL,
    active_until TEXT,
    fee_amount   REAL DEFAULT 0,
    fee_note     TEXT,
    done_by      TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );`);
} catch(e) {}

module.exports = db;
