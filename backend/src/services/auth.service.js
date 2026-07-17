const { getPool } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { generateId } = require('../utils/helper');
const logger = require('../config/logger');
const loginLogService = require('./loginLog.service');

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
    // Role is NULL until the user picks one on first login
    const [result] = await pool.query(
      'INSERT INTO users (uuid, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, NULL)',
      [uuid, name, email, phone || null, hashedPassword]
    );

    const user = { id: result.insertId, uuid, name, email, role: null, shops: [] };
    // Token carries role: null — frontend will detect this and redirect to role picker
    const token = generateToken({ id: result.insertId, uuid, email, role: null });
    logger.info(`User registered: ${email} (role pending)`);
    return { user, token };
  }

  /**
   * Called after registration when the user picks their account type + default module.
   * Sets the role and default_module, returns a fresh token.
   * Once set, role + module are permanent (cannot be changed here).
   */
  async chooseRole(userId, role, defaultModule) {
    const pool = getPool();
    const allowed = ['admin', 'individual'];
    if (!allowed.includes(role)) {
      const e = new Error('Invalid role. Choose either "admin" (Shop/Business) or "individual".');
      e.statusCode = 400;
      throw e;
    }

    if (!defaultModule || typeof defaultModule !== 'string' || defaultModule.trim() === '') {
      const e = new Error('A default module must be selected.');
      e.statusCode = 400;
      throw e;
    }

    // Only allow if role is still unset
    const [[user]] = await pool.query(
      'SELECT id, uuid, name, email, role, default_module FROM users WHERE id = ?', [userId]
    );
    if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }

    // Allow re-assignment only if role is currently null (first-time setup)
    if (user.role !== null) {
      const e = new Error('Role has already been set and cannot be changed here.');
      e.statusCode = 409;
      throw e;
    }

    const module = defaultModule.trim().toLowerCase();
    await pool.query('UPDATE users SET role = ?, default_module = ? WHERE id = ?', [role, module, userId]);

    const token = generateToken({ id: user.id, uuid: user.uuid, email: user.email, role, default_module: module });
    logger.info(`Role set for user ${user.email}: ${role} / module: ${module}`);
    return {
      user: { id: user.id, uuid: user.uuid, name: user.name, email: user.email, role, default_module: module, shops: [] },
      token,
    };
  }

  async login({ email, password, passcode }) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, uuid, name, email, password, passcode, role, default_module, avatar, is_active FROM users WHERE email = ?',
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

    // Get user's shops (include inactive so disabled shops are visible)
    const [shops] = await pool.query(
      `SELECT s.id, s.uuid, s.name, s.address, s.phone, us.role as user_role, s.is_active, s.is_open
       FROM user_shops us JOIN shops s ON us.shop_id = s.id
       WHERE us.user_id = ? AND us.is_active = 1`,
      [user.id]
    );

    // Token without shop_id — user must select shop next
    const token = generateToken({ id: user.id, uuid: user.uuid, email: user.email, role: user.role, default_module: user.default_module || null });

    logger.info(`User logged in: ${email} (${shops.length} shops)`);
    return {
      user: { id: user.id, uuid: user.uuid, name: user.name, email: user.email, role: user.role, default_module: user.default_module || null, avatar: user.avatar || null, has_passcode: !!user.passcode, shops },
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

    const [[user]] = await pool.query('SELECT id, uuid, email, name, default_module FROM users WHERE id = ?', [userId]);
    const [[shop]] = await pool.query('SELECT id, uuid, name, is_active, is_open FROM shops WHERE id = ?', [shopId]);

    if (!shop.is_active) {
      const error = new Error('This shop is currently disabled'); error.statusCode = 403; throw error;
    }
    // Owners (admin role) can always log into their shop even when it is closed
    if (!shop.is_open && membership.role !== 'admin') {
      const error = new Error('This shop is currently closed'); error.statusCode = 403; throw error;
    }

    const token = generateToken({
      id: user.id, uuid: user.uuid, email: user.email,
      role: membership.role, shop_id: shopId,
      default_module: user.default_module || null,
    });

    // Record login event — log_id is sent to the client so it can post logout later
    const logId = await loginLogService.recordLogin(user.id, shopId, membership.role);

    logger.info(`User ${user.email} selected shop: ${shop.name} (${shopId})`);
    return {
      token,
      shop: { id: shop.id, uuid: shop.uuid, name: shop.name },
      role: membership.role,
      default_module: user.default_module || null,
      log_id: logId,
    };
  }

  /**
   * Create a new shop (user becomes admin)
   */
  async createShop(userId, { name, address, phone, email, gst_number }) {
    const pool = getPool();
    const shopUuid = generateId();

    const [shopResult] = await pool.query(
      'INSERT INTO shops (uuid, name, address, phone, email, gst_number, owner_id, is_open) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
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

  async toggleShopStatus(shopId) {
    const pool = getPool();
    const [[shop]] = await pool.query('SELECT id, name, is_open FROM shops WHERE id = ?', [shopId]);
    if (!shop) { const e = new Error('Shop not found'); e.statusCode = 404; throw e; }
    const newStatus = shop.is_open ? 0 : 1;

    // Update shop open/closed flag
    await pool.query('UPDATE shops SET is_open = ? WHERE id = ?', [newStatus, shopId]);

    // Disable all non-admin staff when closing, re-enable them when opening
    await pool.query(
      `UPDATE user_shops SET is_active = ? WHERE shop_id = ? AND role != 'admin'`,
      [newStatus, shopId]
    );

    const [affected] = await pool.query(
      `SELECT COUNT(*) as count FROM user_shops WHERE shop_id = ? AND role != 'admin'`,
      [shopId]
    );

    logger.info(
      `Shop ${shop.name} (${shopId}) ${newStatus ? 'opened' : 'closed'} — ` +
      `${affected[0].count} staff member(s) ${newStatus ? 'enabled' : 'disabled'}`
    );
    return { is_open: !!newStatus, staff_updated: affected[0].count };
  }

  async removeStaff(shopId, userId) {
    const pool = getPool();
    // Prevent removing yourself or another admin
    const [[membership]] = await pool.query(
      'SELECT role FROM user_shops WHERE user_id = ? AND shop_id = ?',
      [userId, shopId]
    );
    if (!membership) {
      const e = new Error('Staff member not found in this shop'); e.statusCode = 404; throw e;
    }
    if (membership.role === 'admin') {
      const e = new Error('Cannot remove a shop owner'); e.statusCode = 403; throw e;
    }
    await pool.query(
      'DELETE FROM user_shops WHERE user_id = ? AND shop_id = ?',
      [userId, shopId]
    );
    logger.info(`Staff user ${userId} removed from shop ${shopId}`);
    return { success: true };
  }

  async addStaff({ name, email, password, phone, role, designation, shop_id }) {
    const pool = getPool();
    const [existing] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email]);

    let userId;
    let isExisting = false;
    if (existing.length > 0) {
      userId = existing[0].id;
      isExisting = true;
      // Check if already in this shop
      const [[inShop]] = await pool.query('SELECT id FROM user_shops WHERE user_id = ? AND shop_id = ?', [userId, shop_id]);
      if (inShop) { const e = new Error('This user is already a member of this shop'); e.statusCode = 409; throw e; }
    } else {
      if (!password) { const e = new Error('Password is required for new staff'); e.statusCode = 400; throw e; }
      const hashedPassword = await hashPassword(password);
      const uuid = generateId();
      const [result] = await pool.query(
        'INSERT INTO users (uuid, name, email, phone, password, role, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuid, name, email, phone || null, hashedPassword, 'staff', shop_id]
      );
      userId = result.insertId;
    }

    const staffRole = role === 'admin' ? 'manager' : (role || 'staff');
    await pool.query(
      'INSERT INTO user_shops (user_id, shop_id, role, designation) VALUES (?, ?, ?, ?)',
      [userId, shop_id, staffRole, designation || null]
    );
    const displayName = isExisting ? existing[0].name : name;
    logger.info(`Staff ${email} added to shop ${shop_id} (existing account: ${isExisting})`);
    return {
      id: userId,
      name: displayName,
      email,
      role: staffRole,
      designation: designation || null,
      shop_id,
      existing_account: isExisting,
    };
  }

  async getProfile(userId) {
    const pool = getPool();
    const [[user]] = await pool.query(
      'SELECT id, uuid, name, email, phone, avatar, area, pincode, role, default_module, is_active, created_at FROM users WHERE id = ?', [userId]
    );
    if (!user) return null;
    const [shops] = await pool.query(
      `SELECT s.id, s.uuid, s.name, s.address, s.phone, s.gst_number, s.is_open, us.role as user_role
       FROM user_shops us JOIN shops s ON us.shop_id = s.id WHERE us.user_id = ?`, [userId]
    );
    return { ...user, shops };
  }

  async getShopStaff(shopId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.uuid, u.name, u.email, u.phone, us.role, us.designation, us.is_active, us.joined_at, s.name AS shop_name, s.id AS shop_id
       FROM user_shops us
       JOIN users u ON us.user_id = u.id
       JOIN shops s ON us.shop_id = s.id
       WHERE us.shop_id = ? ORDER BY us.joined_at ASC`,
      [shopId]
    );
    return rows;
  }

  async updateProfile(userId, { name, phone, avatar, area, pincode }) {
    const pool = getPool();
    if (avatar !== undefined) {
      await pool.query(
        'UPDATE users SET name = ?, phone = ?, avatar = ?, area = ?, pincode = ? WHERE id = ?',
        [name, phone || null, avatar || null, area || null, pincode || null, userId]
      );
    } else {
      await pool.query(
        'UPDATE users SET name = ?, phone = ?, area = ?, pincode = ? WHERE id = ?',
        [name, phone || null, area || null, pincode || null, userId]
      );
    }
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
