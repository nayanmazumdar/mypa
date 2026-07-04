/**
 * Database connection manager — SQLite (no MySQL required).
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

let db;

const initDatabase = () => {
  const dbPath = path.resolve(__dirname, '../../src/database/sqlite/shop.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations inline
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'shopkeeper',
      shop_name TEXT,
      address TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      barcode TEXT,
      description TEXT,
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'piece',
      tax_rate REAL DEFAULT 0,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      balance REAL DEFAULT 0,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      address TEXT,
      gst_number TEXT,
      balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      min_stock_level REAL DEFAULT 0,
      max_stock_level REAL DEFAULT 0,
      location TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(product_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      customer_id INTEGER,
      invoice_number TEXT NOT NULL UNIQUE,
      total_amount REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid',
      payment_method TEXT DEFAULT 'cash',
      status TEXT DEFAULT 'pending',
      notes TEXT,
      sale_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      supplier_id INTEGER,
      invoice_number TEXT,
      total_amount REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid',
      payment_method TEXT DEFAULT 'cash',
      status TEXT DEFAULT 'pending',
      notes TEXT,
      purchase_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reference_type TEXT NOT NULL,
      reference_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      gst_number TEXT,
      logo_url TEXT,
      address TEXT,
      description TEXT,
      website TEXT,
      is_active INTEGER DEFAULT 1,
      active_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      business_id INTEGER,
      customer_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      bill_photo TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      plan TEXT DEFAULT 'free',
      active_until TEXT,
      amount_paid REAL DEFAULT 0,
      activated_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      old_data TEXT,
      new_data TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Add new columns to existing tables (migration-safe)
  const alterStatements = [
    "ALTER TABLE users ADD COLUMN business_id INTEGER",
    "ALTER TABLE users ADD COLUMN otp_code TEXT",
    "ALTER TABLE users ADD COLUMN otp_expires TEXT",
    "ALTER TABLE customers ADD COLUMN business_id INTEGER",
    "ALTER TABLE customers ADD COLUMN alternate_mobile TEXT",
    "ALTER TABLE customers ADD COLUMN occupation TEXT",
    "ALTER TABLE customers ADD COLUMN credit_limit REAL DEFAULT 0",
    "ALTER TABLE customers ADD COLUMN reference_person TEXT",
    "ALTER TABLE customers ADD COLUMN portal_password TEXT",
    "ALTER TABLE products ADD COLUMN business_id INTEGER",
    "ALTER TABLE sales ADD COLUMN business_id INTEGER",
    "ALTER TABLE purchases ADD COLUMN business_id INTEGER",
    "ALTER TABLE inventory ADD COLUMN business_id INTEGER",
    "ALTER TABLE stock_movements ADD COLUMN business_id INTEGER",
    "ALTER TABLE categories ADD COLUMN business_id INTEGER",
    "ALTER TABLE categories ADD COLUMN uuid TEXT",
    "ALTER TABLE categories ADD COLUMN is_active INTEGER DEFAULT 1",
    "ALTER TABLE categories ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))",
  ];
  for (const stmt of alterStatements) {
    try { db.exec(stmt); } catch (e) { /* column already exists */ }
  }

  logger.info(`SQLite database ready at ${dbPath}`);
  return db;
};

const getPool = () => {
  if (!db) throw new Error('Database not initialized');
  return db;
};

// Compatibility shim — wraps SQLite calls to look like MySQL pool
// MySQL: pool.execute(sql, params) → [rows, fields]
// SQLite: db.prepare(sql).all/get/run(params)
const createMySQLCompat = (sqliteDb) => ({
  execute: (sql, params = []) => {
    const s = sql.trim().toUpperCase();
    if (s.startsWith('SELECT')) {
      const rows = sqliteDb.prepare(sql).all(...params);
      return [rows, []];
    } else if (s.startsWith('INSERT')) {
      const info = sqliteDb.prepare(sql).run(...params);
      return [{ insertId: info.lastInsertRowid, affectedRows: info.changes }, []];
    } else {
      const info = sqliteDb.prepare(sql).run(...params);
      return [{ affectedRows: info.changes }, []];
    }
  },
  query: (sql, params = []) => {
    const s = sql.trim().toUpperCase();
    if (s.startsWith('SELECT')) {
      const rows = sqliteDb.prepare(sql).all(...params);
      return [rows, []];
    } else {
      const info = sqliteDb.prepare(sql).run(...params);
      return [{ affectedRows: info.changes }, []];
    }
  }
});

// Async wrapper for execute (returns promise like mysql2)
const getAsyncPool = () => {
  const sqliteDb = getPool();
  const compat = createMySQLCompat(sqliteDb);
  return {
    execute: async (sql, params) => compat.execute(sql, params),
    query: async (sql, params) => compat.query(sql, params),
  };
};

module.exports = { initDatabase, getPool, getAsyncPool };
