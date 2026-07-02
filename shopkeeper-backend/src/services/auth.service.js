const { getPool, testConnection } = require('../config/mysql');
const { getDb } = require('../config/sqlite');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { generateId } = require('../utils/helper');
const logger = require('../config/logger');

// Initialize SQLite users table (called lazily on first use)
let sqliteTableInitialized = false;
const ensureSqliteUsersTable = () => {
  if (sqliteTableInitialized) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'shopkeeper',
      shop_name TEXT,
      address TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  sqliteTableInitialized = true;
};

class AuthService {
  async _useMysql() {
    try {
      const pool = getPool();
      const conn = await pool.getConnection();
      conn.release();
      return true;
    } catch {
      return false;
    }
  }

  async register({ name, email, password, phone, shop_name, role }) {
    const useMysql = await this._useMysql();
    const hashedPassword = await hashPassword(password);
    const uuid = generateId();

    if (useMysql) {
      const pool = getPool();
      const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        const error = new Error('Email already registered');
        error.statusCode = 409;
        throw error;
      }

      const [result] = await pool.execute(
        'INSERT INTO users (uuid, name, email, phone, password, role, shop_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuid, name, email, phone || null, hashedPassword, role || 'shopkeeper', shop_name || null]
      );

      const user = { id: result.insertId, uuid, name, email, role: role || 'shopkeeper' };
      const token = generateToken({ id: user.id, uuid: user.uuid, email: user.email, role: user.role });
      logger.info(`User registered (MySQL): ${email}`);
      return { user, token };
    } else {
      ensureSqliteUsersTable();
      const db = getDb();
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        const error = new Error('Email already registered');
        error.statusCode = 409;
        throw error;
      }

      const result = db.prepare(
        'INSERT INTO users (uuid, name, email, phone, password, role, shop_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(uuid, name, email, phone || null, hashedPassword, role || 'shopkeeper', shop_name || null);

      const user = { id: result.lastInsertRowid, uuid, name, email, role: role || 'shopkeeper' };
      const token = generateToken({ id: user.id, uuid: user.uuid, email: user.email, role: user.role });
      logger.info(`User registered (SQLite): ${email}`);
      return { user, token };
    }
  }

  async login({ email, password }) {
    const useMysql = await this._useMysql();

    let user;
    if (useMysql) {
      const pool = getPool();
      const [rows] = await pool.execute(
        'SELECT id, uuid, name, email, password, role, shop_name, is_active FROM users WHERE email = ?',
        [email]
      );
      user = rows[0];
    } else {
      ensureSqliteUsersTable();
      const db = getDb();
      user = db.prepare(
        'SELECT id, uuid, name, email, password, role, shop_name, is_active FROM users WHERE email = ?'
      ).get(email);
    }

    if (!user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    if (user.is_active === 0) {
      const error = new Error('Account is deactivated');
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken({ id: user.id, uuid: user.uuid, email: user.email, role: user.role });

    logger.info(`User logged in: ${email}`);
    return {
      user: { id: user.id, uuid: user.uuid, name: user.name, email: user.email, role: user.role, shop_name: user.shop_name },
      token,
    };
  }

  async getProfile(userId) {
    const useMysql = await this._useMysql();

    if (useMysql) {
      const pool = getPool();
      const [rows] = await pool.execute(
        'SELECT id, uuid, name, email, phone, role, shop_name, address, is_active, created_at FROM users WHERE id = ?',
        [userId]
      );
      return rows[0] || null;
    } else {
      ensureSqliteUsersTable();
      const db = getDb();
      return db.prepare(
        'SELECT id, uuid, name, email, phone, role, shop_name, address, is_active, created_at FROM users WHERE id = ?'
      ).get(userId) || null;
    }
  }
}

module.exports = new AuthService();
