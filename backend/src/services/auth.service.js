const { getPool } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateId } = require('../utils/helper');
const logger = require('../config/logger');
const loginLogService = require('./loginLog.service');
const rbacService = require('./rbac.service');

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

    // Get user's shops (include all to show closed/disabled status in the login modal)
    const [shops] = await pool.query(
      `SELECT s.id, s.uuid, s.name, s.address, s.phone, us.role as user_role, us.is_active as staff_active, s.is_active, s.is_open
       FROM user_shops us JOIN shops s ON us.shop_id = s.id
       WHERE us.user_id = ?`,
      [user.id]
    );

    // Token without shop_id — user must select shop next
    const token = generateToken({ id: user.id, uuid: user.uuid, email: user.email, role: user.role, default_module: user.default_module || null });
    const refreshToken = generateRefreshToken({ id: user.id, uuid: user.uuid, email: user.email });

    logger.info(`User logged in: ${email} (${shops.length} shops)`);
    return {
      user: { id: user.id, uuid: user.uuid, name: user.name, email: user.email, role: user.role, default_module: user.default_module || null, avatar: user.avatar || null, has_passcode: !!user.passcode, shops },
      token,
      refresh_token: refreshToken,
    };
  }

  /**
   * Select a shop — returns a new token scoped to that shop,
   * with dynamic RBAC permissions embedded.
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

    // Resolve dynamic RBAC for this user
    const { permissions: rbacPerms, roles: rbacRoles } = await rbacService.resolveUserPermissions(userId);

    const token = generateToken({
      id: user.id, uuid: user.uuid, email: user.email,
      role: membership.role, shop_id: shopId,
      default_module: user.default_module || null,
      rbac_roles: rbacRoles,
      rbac_perms: rbacPerms,
    });

    // Record login event — log_id is sent to the client so it can post logout later
    const logId = await loginLogService.recordLogin(user.id, shopId, membership.role);

    logger.info(`User ${user.email} selected shop: ${shop.name} (${shopId}), rbac_roles: [${rbacRoles.join(',')}]`);
    return {
      token,
      shop: { id: shop.id, uuid: shop.uuid, name: shop.name },
      role: membership.role,
      default_module: user.default_module || null,
      log_id: logId,
      rbac_roles: rbacRoles,
      rbac_perms: rbacPerms,
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

    // Disable all non-admin staff when closing, re-enable when opening
    // 1. Sync user_shops.is_active
    await pool.query(
      `UPDATE user_shops SET is_active = ? WHERE shop_id = ? AND role != 'admin'`,
      [newStatus, shopId]
    );
    // 2. Sync users.is_active for those staff members
    await pool.query(
      `UPDATE users u
       JOIN user_shops us ON us.user_id = u.id
       SET u.is_active = ?
       WHERE us.shop_id = ? AND us.role != 'admin'`,
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
      `SELECT s.id, s.uuid, s.name, s.address, s.phone, s.gst_number, s.tax_rate, s.tax_label, s.gst_type, s.is_open, us.role as user_role
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

  async updateShop(shopId, { name, address, phone, email, gst_number, tax_rate, tax_label, gst_type }) {
    const pool = getPool();
    if (!shopId) { const e = new Error('No shop selected'); e.statusCode = 400; throw e; }
    await pool.query(
      'UPDATE shops SET name = ?, address = ?, phone = ?, email = ?, gst_number = ?, tax_rate = ?, tax_label = ?, gst_type = ? WHERE id = ?',
      [name, address || null, phone || null, email || null, gst_number || null, tax_rate != null ? tax_rate : 5, tax_label || 'GST', gst_type || 'without_gst', shopId]
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

  async refreshToken(refreshToken) {
    if (!refreshToken) {
      const e = new Error('Refresh token is required'); e.statusCode = 400; throw e;
    }
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const pool = getPool();
      const [[user]] = await pool.query(
        'SELECT id, uuid, email, role, default_module, shop_id, is_active FROM users WHERE id = ?',
        [decoded.id]
      );
      if (!user || !user.is_active) {
        const e = new Error('User not found or inactive'); e.statusCode = 401; throw e;
      }

      // Resolve the user's active shop — prefer their stored shop_id
      let shopId = user.shop_id || null;
      let membershipRole = user.role;
      let rbacPerms = {};
      let rbacRoles = [];

      if (shopId) {
        // Verify membership still exists
        const [[membership]] = await pool.query(
          'SELECT role FROM user_shops WHERE user_id = ? AND shop_id = ?',
          [user.id, shopId]
        );
        if (membership) {
          membershipRole = membership.role;
          const resolved = await rbacService.resolveUserPermissions(user.id);
          rbacPerms = resolved.permissions;
          rbacRoles = resolved.roles;
        } else {
          // User no longer has access to this shop
          shopId = null;
        }
      }

      const token = generateToken({
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        role: membershipRole,
        shop_id: shopId,
        default_module: user.default_module || null,
        rbac_roles: rbacRoles,
        rbac_perms: rbacPerms,
      });
      const newRefreshToken = generateRefreshToken({ id: user.id, uuid: user.uuid, email: user.email });
      return { token, refresh_token: newRefreshToken };
    } catch (err) {
      if (err.statusCode) throw err;
      const e = new Error('Invalid or expired refresh token'); e.statusCode = 401; throw e;
    }
  }
  /**
   * Create a user account without assigning to any shop.
   * Admin creates users here, then assigns them to shops separately.
   */
  async createUserAccount({ name, email, password, phone }) {
    const pool = getPool();
    if (!name || !email || !password) {
      const e = new Error('Name, email, and password are required'); e.statusCode = 400; throw e;
    }
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      const e = new Error('Email already registered'); e.statusCode = 409; throw e;
    }
    if (password.length < 8) {
      const e = new Error('Password must be at least 8 characters'); e.statusCode = 400; throw e;
    }
    const hashedPassword = await hashPassword(password);
    const uuid = generateId();
    const [result] = await pool.query(
      'INSERT INTO users (uuid, name, email, phone, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [uuid, name.trim(), email.toLowerCase().trim(), phone || null, hashedPassword, 'staff']
    );
    logger.info(`User account created (disabled): ${email} (id: ${result.insertId})`);
    return { id: result.insertId, uuid, name: name.trim(), email: email.toLowerCase().trim(), phone: phone || null, role: 'staff', is_active: 0 };
  }

  /**
   * Get all users that belong to any shop the admin owns.
   */
  async getAllUsersForAdmin(adminId) {
    const pool = getPool();
    // Get all shops where this admin is owner
    const [adminShops] = await pool.query(
      `SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin'`, [adminId]
    );
    if (adminShops.length === 0) return [];
    const shopIds = adminShops.map(s => s.shop_id);
    const placeholders = shopIds.map(() => '?').join(',');

    // Get staff/managers (non-admin, non-owner) who are assigned to admin's shops
    const [staffRows] = await pool.query(
      `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role AS global_role, u.is_active, u.created_at,
              GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS shop_names,
              GROUP_CONCAT(DISTINCT us.role ORDER BY s.name SEPARATOR ', ') AS shop_roles,
              MIN(us.is_active) AS staff_active,
              MAX(s.is_open) AS any_shop_open
       FROM users u
       LEFT JOIN user_shops us ON u.id = us.user_id AND us.shop_id IN (${placeholders})
       LEFT JOIN shops s ON us.shop_id = s.id
       WHERE us.user_id IS NOT NULL
         AND us.role != 'admin'
         AND u.id != ?
       GROUP BY u.id
       ORDER BY u.name ASC`,
      [...shopIds, adminId]
    );

    // Get unassigned users (created but not yet assigned to any shop)
    const [unassignedRows] = await pool.query(
      `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role AS global_role, u.is_active, u.created_at
       FROM users u
       LEFT JOIN user_shops us ON u.id = us.user_id
       WHERE us.user_id IS NULL
         AND u.id != ?
       ORDER BY u.name ASC`,
      [adminId]
    );

    // Get the owner's own info
    const [[owner]] = await pool.query(
      `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role AS global_role, u.is_active, u.created_at,
              GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS shop_names
       FROM users u
       LEFT JOIN user_shops us ON u.id = us.user_id AND us.role = 'admin'
       LEFT JOIN shops s ON us.shop_id = s.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [adminId]
    );

    const results = [];

    // Add owner first, marked as non-editable
    if (owner) {
      results.push({
        ...owner,
        shops: owner.shop_names ? owner.shop_names.split(', ') : [],
        role: 'admin',
        is_owner: true,
      });
    }

    // Add staff
    for (const r of staffRows) {
      // Determine status: disabled if staff_active is 0 OR all assigned shops are closed
      let status = 'active';
      if (!r.staff_active || !r.any_shop_open) {
        status = 'disabled';
      }
      results.push({
        ...r,
        shops: r.shop_names ? r.shop_names.split(', ') : [],
        role: r.shop_roles?.split(', ')[0] || r.global_role || 'staff',
        is_owner: false,
        status,
      });
    }

    // Add unassigned users
    for (const r of unassignedRows) {
      results.push({
        ...r,
        shops: [],
        role: r.global_role || 'staff',
        is_owner: false,
        status: 'unassigned',
      });
    }

    return results;
  }
}

module.exports = new AuthService();
