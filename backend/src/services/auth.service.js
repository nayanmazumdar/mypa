const { getPool } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { generateId } = require('../utils/helper');
const logger = require('../config/logger');

class AuthService {
  async register({ name, email, password, phone }) {
    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      const error = new Error('Email already registered');
      error.statusCode = 409;
      throw error;
    }

    const hashedPassword = await hashPassword(password);
    const uuid = generateId();
    const [result] = await pool.query(
      'INSERT INTO users (uuid, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid, name, email, phone || null, hashedPassword, 'admin']
    );

    const user = { id: result.insertId, uuid, name, email, role: 'admin', shops: [] };
    const token = generateToken({ id: result.insertId, uuid, email, role: 'admin' });
    logger.info(`User registered: ${email}`);
    return { user, token };
  }

  async login({ email, password, passcode }) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, uuid, name, email, password, passcode, role, is_active FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      const error = new Error('Invalid credentials'); error.statusCode = 401; throw error;
    }
    const user = rows[0];
    if (!user.is_active) {
      const error = new Error('Account is deactivated'); error.statusCode = 403; throw error;
    }

    if (passcode) {
      if (!user.passcode) { const e = new Error('Passcode not set'); e.statusCode = 401; throw e; }
      if (!(await comparePassword(passcode, user.passcode))) { const e = new Error('Invalid passcode'); e.statusCode = 401; throw e; }
    } else if (password) {
      if (!(await comparePassword(password, user.password))) { const e = new Error('Invalid credentials'); e.statusCode = 401; throw e; }
    } else {
      const e = new Error('Password or passcode required'); e.statusCode = 400; throw e;
    }

    // Get user's shops
    const [shops] = await pool.query(
      `SELECT s.id, s.uuid, s.name, s.address, s.phone, us.role as user_role
       FROM user_shops us JOIN shops s ON us.shop_id = s.id
       WHERE us.user_id = ? AND us.is_active = 1 AND s.is_active = 1`,
      [user.id]
    );

    // Token without shop_id — user must select shop next
    const token = generateToken({ id: user.id, uuid: user.uuid, email: user.email, role: user.role });

    logger.info(`User logged in: ${email} (${shops.length} shops)`);
    return {
      user: { id: user.id, uuid: user.uuid, name: user.name, email: user.email, role: user.role, has_passcode: !!user.passcode, shops },
      token,
    };
  }

  /**
   * Select a shop — returns a new token scoped to that shop
   */
  async selectShop(userId, shopId) {
    const pool = getPool();
    const [[membership]] = await pool.query(
      'SELECT us.role FROM user_shops us WHERE us.user_id = ? AND us.shop_id = ? AND us.is_active = 1',
      [userId, shopId]
    );
    if (!membership) {
      const error = new Error('You do not have access to this shop'); error.statusCode = 403; throw error;
    }

    const [[user]] = await pool.query('SELECT id, uuid, email, name FROM users WHERE id = ?', [userId]);
    const [[shop]] = await pool.query('SELECT id, uuid, name FROM shops WHERE id = ?', [shopId]);

    const token = generateToken({
      id: user.id, uuid: user.uuid, email: user.email,
      role: membership.role, shop_id: shopId,
    });

    logger.info(`User ${user.email} selected shop: ${shop.name} (${shopId})`);
    return {
      token,
      shop: { id: shop.id, uuid: shop.uuid, name: shop.name },
      role: membership.role,
    };
  }

  /**
   * Create a new shop (user becomes admin)
   */
  async createShop(userId, { name, address, phone, email, gst_number }) {
    const pool = getPool();
    const shopUuid = generateId();

    const [shopResult] = await pool.query(
      'INSERT INTO shops (uuid, name, address, phone, email, gst_number, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [shopUuid, name, address || null, phone || null, email || null, gst_number || null, userId]
    );
    const shopId = shopResult.insertId;

    // Add user as admin of this shop
    await pool.query(
      'INSERT INTO user_shops (user_id, shop_id, role) VALUES (?, ?, ?)',
      [userId, shopId, 'admin']
    );

    // Also update legacy shop_id on user for backwards compat
    await pool.query('UPDATE users SET shop_id = ? WHERE id = ? AND shop_id IS NULL', [shopId, userId]);

    const token = generateToken({ id: userId, uuid: (await pool.query('SELECT uuid FROM users WHERE id=?', [userId]))[0][0].uuid, email: (await pool.query('SELECT email FROM users WHERE id=?', [userId]))[0][0].email, role: 'admin', shop_id: shopId });

    logger.info(`Shop created: "${name}" (id: ${shopId}) by user ${userId}`);
    return { shop: { id: shopId, uuid: shopUuid, name }, token };
  }

  async setPasscode(userId, { passcode, current_password }) {
    const pool = getPool();
    const [[user]] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }
    if (!(await comparePassword(current_password, user.password))) { const e = new Error('Current password is incorrect'); e.statusCode = 401; throw e; }
    if (!/^\d{4}$/.test(passcode)) { const e = new Error('Passcode must be exactly 4 digits'); e.statusCode = 400; throw e; }
    await pool.query('UPDATE users SET passcode = ? WHERE id = ?', [await hashPassword(passcode), userId]);
    logger.info(`Passcode set for user ${userId}`);
    return { success: true };
  }

  async addStaff({ name, email, password, phone, role, shop_id }) {
    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

    let userId;
    if (existing.length > 0) {
      userId = existing[0].id;
      // Check if already in this shop
      const [[inShop]] = await pool.query('SELECT id FROM user_shops WHERE user_id = ? AND shop_id = ?', [userId, shop_id]);
      if (inShop) { const e = new Error('User is already in this shop'); e.statusCode = 409; throw e; }
    } else {
      const hashedPassword = await hashPassword(password);
      const uuid = generateId();
      const [result] = await pool.query(
        'INSERT INTO users (uuid, name, email, phone, password, role, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuid, name, email, phone || null, hashedPassword, 'staff', shop_id]
      );
      userId = result.insertId;
    }

    const staffRole = role || 'staff';
    await pool.query('INSERT INTO user_shops (user_id, shop_id, role) VALUES (?, ?, ?)', [userId, shop_id, staffRole]);
    logger.info(`Staff ${email} added to shop ${shop_id}`);
    return { id: userId, name, email, role: staffRole, shop_id };
  }

  async getProfile(userId) {
    const pool = getPool();
    const [[user]] = await pool.query(
      'SELECT id, uuid, name, email, phone, role, is_active, created_at FROM users WHERE id = ?', [userId]
    );
    if (!user) return null;
    const [shops] = await pool.query(
      `SELECT s.id, s.uuid, s.name, s.address, s.phone, s.gst_number, us.role as user_role
       FROM user_shops us JOIN shops s ON us.shop_id = s.id WHERE us.user_id = ?`, [userId]
    );
    return { ...user, shops };
  }

  async getShopStaff(shopId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.uuid, u.name, u.email, u.phone, us.role, us.is_active, us.joined_at
       FROM user_shops us JOIN users u ON us.user_id = u.id WHERE us.shop_id = ? ORDER BY us.joined_at DESC`,
      [shopId]
    );
    return rows;
  }

  async updateProfile(userId, { name, phone }) {
    const pool = getPool();
    await pool.query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone || null, userId]);
  }

  async updateShop(shopId, { name, address, phone, email, gst_number }) {
    const pool = getPool();
    if (!shopId) { const e = new Error('No shop selected'); e.statusCode = 400; throw e; }
    await pool.query(
      'UPDATE shops SET name = ?, address = ?, phone = ?, email = ?, gst_number = ? WHERE id = ?',
      [name, address || null, phone || null, email || null, gst_number || null, shopId]
    );
  }

  async changePassword(userId, { current_password, new_password }) {
    const pool = getPool();
    const [[user]] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }
    if (!(await comparePassword(current_password, user.password))) {
      const e = new Error('Current password is incorrect'); e.statusCode = 401; throw e;
    }
    if (!new_password || new_password.length < 8) {
      const e = new Error('New password must be at least 8 characters'); e.statusCode = 400; throw e;
    }
    const hashed = await hashPassword(new_password);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
  }
}

module.exports = new AuthService();
