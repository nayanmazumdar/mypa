const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// All routes require admin role
router.use(authenticate, authorize('admin'));

/* ── SHOPS ── */

// GET /api/admin/shops — all shops where this user is admin (via owner_id OR user_shops role)
router.get('/shops', async (req, res, next) => {
  try {
    const pool = getPool();
    const [shops] = await pool.query(
      `SELECT s.id, s.uuid, s.name, s.address, s.phone, s.email, s.gst_number,
              s.is_active, s.is_open, s.owner_id, s.created_at,
              u.name AS owner_name, u.email AS owner_email,
              COUNT(DISTINCT us2.user_id) AS staff_count
       FROM shops s
       LEFT JOIN users u ON u.id = s.owner_id
       LEFT JOIN user_shops us2 ON us2.shop_id = s.id
       WHERE s.owner_id = ? OR s.id IN (SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin')
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.user.id, req.user.id]
    );
    return ApiResponse.success(res, shops);
  } catch (err) { next(err); }
});

// POST /api/admin/shops — create a new shop
router.post('/shops', async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, address, phone, email, gst_number } = req.body;
    if (!name?.trim()) return ApiResponse.error(res, 'Shop name is required', 400);

    const uuid = uuidv4();
    const [result] = await pool.query(
      'INSERT INTO shops (uuid, name, address, phone, email, gst_number, owner_id, is_active, is_open) VALUES (?,?,?,?,?,?,?,1,1)',
      [uuid, name.trim(), address || null, phone || null, email || null, gst_number || null, req.user.id]
    );
    const shopId = result.insertId;

    // Auto-assign owner as admin of the new shop
    await pool.query(
      'INSERT INTO user_shops (user_id, shop_id, role, is_active) VALUES (?,?,?,1)',
      [req.user.id, shopId, 'admin']
    );

    const [[shop]] = await pool.query('SELECT * FROM shops WHERE id = ?', [shopId]);
    return ApiResponse.created(res, shop, 'Shop created');
  } catch (err) { next(err); }
});

// PUT /api/admin/shops/:id — edit shop details
router.put('/shops/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, address, phone, email, gst_number } = req.body;
    if (!name?.trim()) return ApiResponse.error(res, 'Shop name is required', 400);

    const [[shop]] = await pool.query('SELECT id FROM shops WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    if (!shop) return ApiResponse.notFound(res, 'Shop not found');

    await pool.query(
      'UPDATE shops SET name=?, address=?, phone=?, email=?, gst_number=? WHERE id=?',
      [name.trim(), address || null, phone || null, email || null, gst_number || null, req.params.id]
    );
    return ApiResponse.success(res, null, 'Shop updated');
  } catch (err) { next(err); }
});

// PATCH /api/admin/shops/:id/active — toggle is_active
router.patch('/shops/:id/active', async (req, res, next) => {
  try {
    const pool = getPool();
    const [[shop]] = await pool.query('SELECT id, is_active FROM shops WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    if (!shop) return ApiResponse.notFound(res, 'Shop not found');

    const newVal = shop.is_active ? 0 : 1;
    await pool.query('UPDATE shops SET is_active=? WHERE id=?', [newVal, req.params.id]);
    return ApiResponse.success(res, { is_active: newVal }, newVal ? 'Shop activated' : 'Shop deactivated');
  } catch (err) { next(err); }
});

// PATCH /api/admin/shops/:id/open — toggle is_open
router.patch('/shops/:id/open', async (req, res, next) => {
  try {
    const pool = getPool();
    const [[shop]] = await pool.query('SELECT id, is_open FROM shops WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    if (!shop) return ApiResponse.notFound(res, 'Shop not found');

    const newVal = shop.is_open ? 0 : 1;
    await pool.query('UPDATE shops SET is_open=? WHERE id=?', [newVal, req.params.id]);
    // Sync staff access — user_shops and users tables
    await pool.query(
      `UPDATE user_shops SET is_active=? WHERE shop_id=? AND role != 'admin'`,
      [newVal, req.params.id]
    );
    await pool.query(
      `UPDATE users u JOIN user_shops us ON us.user_id = u.id
       SET u.is_active = ? WHERE us.shop_id = ? AND us.role != 'admin'`,
      [newVal, req.params.id]
    );
    return ApiResponse.success(res, { is_open: newVal }, newVal ? 'Shop opened' : 'Shop closed');
  } catch (err) { next(err); }
});

/* ── USERS ── */

// GET /api/admin/users — all users (shop-assigned + unassigned)
router.get('/users', async (req, res, next) => {
  try {
    const pool = getPool();
    
    // First, get all shops where this admin is the owner
    const [adminShops] = await pool.query(
      `SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin'`,
      [req.user.id]
    );
    
    if (adminShops.length === 0) {
      // No shops yet — still return the owner themselves
      const [[ownerOnly]] = await pool.query(
        `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
                NULL AS shop_names, NULL AS shop_ids, NULL AS shop_roles
         FROM users u WHERE u.id = ?`,
        [req.user.id]
      );
      return ApiResponse.success(res, ownerOnly ? [{ ...ownerOnly, is_owner: true, status: 'owner' }] : []);
    }
    
    const shopIds = adminShops.map(s => s.shop_id);
    const placeholders = shopIds.map(() => '?').join(',');

    // 1. Users assigned to the admin's shops (staff/managers)
    const [shopUsers] = await pool.query(
      `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
              GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS shop_names,
              GROUP_CONCAT(DISTINCT us.shop_id ORDER BY s.name SEPARATOR ',') AS shop_ids,
              GROUP_CONCAT(DISTINCT us.role ORDER BY s.name SEPARATOR ',') AS shop_roles,
              MIN(s.is_open) AS any_shop_open,
              MIN(us.is_active) AS staff_active
       FROM users u
       INNER JOIN user_shops us ON us.user_id = u.id AND us.shop_id IN (${placeholders})
       LEFT JOIN shops s ON s.id = us.shop_id
       WHERE u.id != ?
       GROUP BY u.id`,
      [...shopIds, req.user.id]
    );

    // 2. The logged-in owner themselves
    const [[ownerRow]] = await pool.query(
      `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
              GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS shop_names,
              GROUP_CONCAT(DISTINCT us.shop_id ORDER BY s.name SEPARATOR ',') AS shop_ids,
              GROUP_CONCAT(DISTINCT us.role ORDER BY s.name SEPARATOR ',') AS shop_roles
       FROM users u
       LEFT JOIN user_shops us ON us.user_id = u.id
       LEFT JOIN shops s ON s.id = us.shop_id AND s.owner_id = u.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.user.id]
    );

    // 3. Users created by this admin but not assigned to any shop yet (unassigned)
    const [unassignedUsers] = await pool.query(
      `SELECT u.id, u.uuid, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
              NULL AS shop_names, NULL AS shop_ids, NULL AS shop_roles
       FROM users u
       LEFT JOIN user_shops us ON us.user_id = u.id
       WHERE us.user_id IS NULL
         AND u.id != ?
         AND u.role != 'admin'
       ORDER BY u.name ASC`,
      [req.user.id]
    );

    // Merge and deduplicate by id (shop users take priority over unassigned)
    const seen = new Set();
    const merged = [];

    // Owner first — tag with is_owner so the frontend can style it distinctly
    if (ownerRow) { seen.add(ownerRow.id); merged.push({ ...ownerRow, is_owner: true }); }
    // Shop-assigned users
    for (const u of shopUsers) { if (!seen.has(u.id)) { seen.add(u.id); merged.push(u); } }
    // Unassigned users
    for (const u of unassignedUsers) { if (!seen.has(u.id)) { seen.add(u.id); merged.push(u); } }

    // Sort by name (owner stays first, rest alphabetically)
    merged.sort((a, b) => {
      if (a.id === req.user.id) return -1;
      if (b.id === req.user.id) return 1;
      return a.name.localeCompare(b.name);
    });

    // Derive status from is_active + shop open state
    const enriched = merged.map(u => {
      let status;
      if (u.is_owner) {
        status = 'owner';
      } else if (u.shop_ids) {
        const shopOpen = u.any_shop_open == null ? true : !!u.any_shop_open;
        const staffActive = u.staff_active == null ? !!u.is_active : !!u.staff_active;
        status = (shopOpen && staffActive) ? 'active' : 'disabled';
      } else {
        status = !u.is_active ? 'disabled' : 'unassigned';
      }
      return { ...u, status, shop_closed: u.shop_ids ? !u.any_shop_open : false };
    });

    // Attach RBAC role names for all users in one query
    const allUserIds = enriched.map(u => u.id);
    let rbacMap = {};
    if (allUserIds.length > 0) {
      const rbacPH = allUserIds.map(() => '?').join(',');
      const [rbacRows] = await pool.query(
        `SELECT ur.user_id, r.name
         FROM rbac_user_roles ur
         JOIN rbac_roles r ON r.id = ur.role_id
         WHERE ur.user_id IN (${rbacPH})
         ORDER BY r.name ASC`,
        allUserIds
      );
      for (const row of rbacRows) {
        if (!rbacMap[row.user_id]) rbacMap[row.user_id] = [];
        rbacMap[row.user_id].push(row.name);
      }
    }

    const final = enriched.map(u => ({
      ...u,
      rbac_role_names: rbacMap[u.id] || [],
    }));

    return ApiResponse.success(res, final);
  } catch (err) { next(err); }
});

// POST /api/admin/users — create a new user and optionally assign to a shop + RBAC roles
router.post('/users', async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, email, password, phone, role = 'staff', shop_id, shop_role = 'staff', role_ids } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return ApiResponse.error(res, 'Name, email and password are required', 400);
    if (password.length < 8) return ApiResponse.error(res, 'Password must be at least 8 characters', 400);

    const [[existing]] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) return ApiResponse.error(res, 'Email already in use', 409);

    const hashed = await bcrypt.hash(password, 10);
    const uuid = uuidv4();
    const [result] = await pool.query(
      'INSERT INTO users (uuid, name, email, phone, password, role, is_active) VALUES (?,?,?,?,?,?,0)',
      [uuid, name.trim(), email.toLowerCase().trim(), phone || null, hashed, role]
    );
    const userId = result.insertId;

    // Determine the target shop — explicit or admin's first shop
    let targetShopId = shop_id || null;
    if (!targetShopId) {
      const [[firstShop]] = await pool.query(
        `SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin' ORDER BY shop_id ASC LIMIT 1`,
        [req.user.id]
      );
      if (firstShop) targetShopId = firstShop.shop_id;
    }

    if (targetShopId) {
      // Verify admin has access to this shop
      const [[hasAccess]] = await pool.query(
        `SELECT 1 FROM user_shops WHERE user_id = ? AND shop_id = ? AND role = 'admin'`,
        [req.user.id, targetShopId]
      );
      if (hasAccess) {
        await pool.query(
          'INSERT INTO user_shops (user_id, shop_id, role, is_active) VALUES (?,?,?,1)',
          [userId, targetShopId, shop_role]
        );
      }
    }

    // Assign RBAC roles if provided
    if (Array.isArray(role_ids) && role_ids.length > 0) {
      const rbacService = require('../services/rbac.service');
      await rbacService.assignRolesToUser(userId, role_ids, req.user.id);
    }

    return ApiResponse.created(res, { id: userId, name: name.trim(), email }, 'User created');
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id — edit user details
router.patch('/users/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, phone, email, is_active } = req.body;

    // Verify user belongs to one of admin's shops
    const [[membership]] = await pool.query(
      `SELECT u.id FROM users u
       JOIN user_shops us ON us.user_id = u.id
       JOIN shops s ON s.id = us.shop_id AND s.owner_id = ?
       WHERE u.id = ? LIMIT 1`,
      [req.user.id, req.params.id]
    );
    if (!membership) return ApiResponse.notFound(res, 'User not found');

    const updates = [];
    const params = [];
    if (name)  { updates.push('name=?'); params.push(name.trim()); }
    if (phone !== undefined) { updates.push('phone=?'); params.push(phone || null); }
    if (email) {
      const [[clash]] = await pool.query('SELECT id FROM users WHERE email=? AND id!=?', [email, req.params.id]);
      if (clash) return ApiResponse.error(res, 'Email already in use', 409);
      updates.push('email=?'); params.push(email.toLowerCase().trim());
    }
    if (is_active !== undefined) { updates.push('is_active=?'); params.push(is_active ? 1 : 0); }

    if (!updates.length) return ApiResponse.error(res, 'Nothing to update', 400);
    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${updates.join(',')} WHERE id=?`, params);
    return ApiResponse.success(res, null, 'User updated');
  } catch (err) { next(err); }
});

// POST /api/admin/shops/:id/assign — assign existing user to a shop
router.post('/shops/:id/assign', async (req, res, next) => {
  try {
    const pool = getPool();
    const { user_id, role = 'staff' } = req.body;
    if (!user_id) return ApiResponse.error(res, 'user_id is required', 400);

    const [[shop]] = await pool.query('SELECT id FROM shops WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
    if (!shop) return ApiResponse.notFound(res, 'Shop not found');

    const [[user]] = await pool.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (!user) return ApiResponse.notFound(res, 'User not found');

    const [[existing]] = await pool.query('SELECT id FROM user_shops WHERE user_id=? AND shop_id=?', [user_id, req.params.id]);
    if (existing) {
      await pool.query('UPDATE user_shops SET role=?, is_active=1 WHERE user_id=? AND shop_id=?', [role, user_id, req.params.id]);
      return ApiResponse.success(res, null, 'User assignment updated');
    }

    await pool.query('INSERT INTO user_shops (user_id, shop_id, role, is_active) VALUES (?,?,?,1)', [user_id, req.params.id, role]);
    return ApiResponse.created(res, null, 'User assigned to shop');
  } catch (err) { next(err); }
});

// DELETE /api/admin/shops/:shopId/users/:userId — remove user from shop
router.delete('/shops/:shopId/users/:userId', async (req, res, next) => {
  try {
    const pool = getPool();
    const [[shop]] = await pool.query('SELECT id FROM shops WHERE id = ? AND owner_id = ?', [req.params.shopId, req.user.id]);
    if (!shop) return ApiResponse.notFound(res, 'Shop not found');

    await pool.query('DELETE FROM user_shops WHERE user_id=? AND shop_id=?', [req.params.userId, req.params.shopId]);
    return ApiResponse.success(res, null, 'User removed from shop');
  } catch (err) { next(err); }
});

module.exports = router;
