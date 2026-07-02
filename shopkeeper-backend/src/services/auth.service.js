const { getPool } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { generateId } = require('../utils/helper');
const logger = require('../config/logger');

class AuthService {
  async register({ name, email, password, phone, shop_name, role }) {
    const pool = getPool();
    const hashedPassword = await hashPassword(password);
    const uuid = generateId();

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
    logger.info(`User registered: ${email}`);
    return { user, token };
  }

  async login({ email, password }) {
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT id, uuid, name, email, password, role, shop_name, is_active FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const user = rows[0];

    if (!user.is_active) {
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
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, uuid, name, email, phone, role, shop_name, address, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );
    return rows[0] || null;
  }
}

module.exports = new AuthService();
