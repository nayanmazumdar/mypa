const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * GET /api/users - Get all users in the shop (admin only)
 */
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, uuid, name, email, phone, role, is_active, created_at FROM users WHERE shop_id = ? ORDER BY created_at DESC',
      [req.user.shop_id]
    );
    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/:id/status - Toggle staff active status in user_shops (admin only)
 */
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { is_active } = req.body;

    // Get all shops this admin owns
    const [adminShops] = await pool.query(
      `SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin'`, [req.user.id]
    );
    if (adminShops.length === 0) return ApiResponse.error(res, 'You do not own any shops', 403);
    const ownedShopIds = adminShops.map(s => s.shop_id);
    const placeholders = ownedShopIds.map(() => '?').join(',');

    // Ensure the staff member belongs to one of admin's shops and is not an admin
    const [[membership]] = await pool.query(
      `SELECT id, role FROM user_shops WHERE user_id = ? AND shop_id IN (${placeholders}) LIMIT 1`,
      [req.params.id, ...ownedShopIds]
    );
    if (!membership) return ApiResponse.notFound(res, 'Staff member not found in your shop');
    if (membership.role === 'admin') return ApiResponse.error(res, 'Cannot disable a shop admin', 403);

    await pool.query(
      `UPDATE user_shops SET is_active = ? WHERE user_id = ? AND shop_id IN (${placeholders})`,
      [is_active ? 1 : 0, req.params.id, ...ownedShopIds]
    );
    return ApiResponse.success(res, null, `Staff member ${is_active ? 'enabled' : 'disabled'}`);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/:id/details - Update staff name, phone, email (admin only)
 */
router.patch('/:id/details', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, phone, email } = req.body;

    // Get all shops this admin owns
    const [adminShops] = await pool.query(
      `SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin'`, [req.user.id]
    );
    if (adminShops.length === 0) return ApiResponse.error(res, 'You do not own any shops', 403);
    const ownedShopIds = adminShops.map(s => s.shop_id);
    const placeholders = ownedShopIds.map(() => '?').join(',');

    // Verify user belongs to one of admin's shops
    const [[membership]] = await pool.query(
      `SELECT id FROM user_shops WHERE user_id = ? AND shop_id IN (${placeholders})`,
      [req.params.id, ...ownedShopIds]
    );
    if (!membership) return ApiResponse.notFound(res, 'Staff member not found in your shop');

    // Check email uniqueness if changing
    if (email) {
      const [[clash]] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]
      );
      if (clash) return ApiResponse.error(res, 'Email is already in use by another account', 409);
    }

    const updates = [];
    const params = [];
    if (name)  { updates.push('name = ?');  params.push(name); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
    if (email) { updates.push('email = ?'); params.push(email); }

    if (updates.length === 0) return ApiResponse.error(res, 'Nothing to update', 400);

    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    return ApiResponse.success(res, null, 'Staff details updated');
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/:id/reset-password - Reset staff password (admin only)
 */
router.patch('/:id/reset-password', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { new_password } = req.body;

    if (!new_password || new_password.length < 8) {
      return ApiResponse.error(res, 'Password must be at least 8 characters', 400);
    }

    const [[membership]] = await pool.query(
      'SELECT id FROM user_shops WHERE user_id = ? AND shop_id = ?',
      [req.params.id, req.user.shop_id]
    );
    if (!membership) return ApiResponse.notFound(res, 'Staff member not found in your shop');

    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
    return ApiResponse.success(res, null, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
});
router.patch('/:id/role', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { role, designation } = req.body;

    const validRoles = ['staff', 'manager'];
    if (role && !validRoles.includes(role)) {
      return ApiResponse.error(res, 'Invalid role. Must be staff or manager.', 400);
    }

    // Get all shops this admin owns
    const [adminShops] = await pool.query(
      `SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin'`, [req.user.id]
    );
    if (adminShops.length === 0) return ApiResponse.error(res, 'You do not own any shops', 403);
    const ownedShopIds = adminShops.map(s => s.shop_id);
    const placeholders = ownedShopIds.map(() => '?').join(',');

    // Ensure the staff member belongs to one of admin's shops and is not an admin
    const [[membership]] = await pool.query(
      `SELECT us.id, us.role, us.shop_id, s.is_open, s.name AS shop_name
       FROM user_shops us
       JOIN shops s ON s.id = us.shop_id
       WHERE us.user_id = ? AND us.shop_id IN (${placeholders}) LIMIT 1`,
      [req.params.id, ...ownedShopIds]
    );
    if (!membership) return ApiResponse.notFound(res, 'Staff member not found in your shop');
    if (membership.role === 'admin') return ApiResponse.error(res, 'Cannot change the role of a shop admin', 403);

    // Block role change when shop is closed
    if (!membership.is_open) {
      return ApiResponse.error(
        res,
        `Cannot change role — "${membership.shop_name}" is currently closed. Open the shop first.`,
        403
      );
    }

    const updates = [];
    const params = [];
    if (role)        { updates.push('role = ?');        params.push(role); }
    if (designation !== undefined) { updates.push('designation = ?'); params.push(designation || null); }

    if (updates.length === 0) return ApiResponse.error(res, 'Nothing to update', 400);

    // Update role in all admin's shops where this user is assigned
    params.push(req.params.id);
    await pool.query(
      `UPDATE user_shops SET ${updates.join(', ')} WHERE user_id = ? AND shop_id IN (${placeholders})`,
      [...params, ...ownedShopIds]
    );
    return ApiResponse.success(res, null, 'Role updated successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/:id/shops - Update assigned shops for a user (admin only)
 * Body: { shop_ids: [1, 2, 3], role: 'staff' }
 * Adds user to new shops and removes from unselected shops (within admin's owned shops only)
 */
router.patch('/:id/shops', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { shop_ids, role } = req.body;
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.id;

    if (!Array.isArray(shop_ids)) {
      return ApiResponse.error(res, 'shop_ids must be an array', 400);
    }

    // Get all shops the admin owns
    const [adminShops] = await pool.query(
      `SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin'`, [adminId]
    );
    const ownedShopIds = adminShops.map(s => s.shop_id);

    if (ownedShopIds.length === 0) {
      return ApiResponse.error(res, 'You do not own any shops', 403);
    }

    // Validate that requested shop_ids are all owned by this admin
    const invalidShops = shop_ids.filter(id => !ownedShopIds.includes(id));
    if (invalidShops.length > 0) {
      return ApiResponse.error(res, 'You can only assign users to shops you own', 403);
    }

    // Prevent editing the admin's own membership
    if (userId === adminId) {
      return ApiResponse.error(res, 'Cannot modify your own shop assignments', 400);
    }

    // Get current shop assignments for this user (within admin's shops only)
    const placeholders = ownedShopIds.map(() => '?').join(',');
    const [currentAssignments] = await pool.query(
      `SELECT shop_id, role FROM user_shops WHERE user_id = ? AND shop_id IN (${placeholders})`,
      [userId, ...ownedShopIds]
    );
    const currentShopIds = currentAssignments.map(a => a.shop_id);

    // Determine shops to add and remove
    const toAdd = shop_ids.filter(id => !currentShopIds.includes(id));
    const toRemove = currentShopIds.filter(id => !shop_ids.includes(id));

    // Prevent removing from a shop where user is admin
    const adminRoleShops = currentAssignments.filter(a => a.role === 'admin').map(a => a.shop_id);
    const blockedRemovals = toRemove.filter(id => adminRoleShops.includes(id));
    if (blockedRemovals.length > 0) {
      return ApiResponse.error(res, 'Cannot remove a shop owner from their own shop', 403);
    }

    const staffRole = role || 'staff';

    // Remove from unselected shops
    for (const shopId of toRemove) {
      await pool.query(
        'DELETE FROM user_shops WHERE user_id = ? AND shop_id = ?',
        [userId, shopId]
      );
    }

    // Add to newly selected shops
    for (const shopId of toAdd) {
      await pool.query(
        'INSERT INTO user_shops (user_id, shop_id, role) VALUES (?, ?, ?)',
        [userId, shopId, staffRole]
      );
    }

    return ApiResponse.success(res, {
      added: toAdd,
      removed: toRemove,
    }, 'Shop assignments updated');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id/shops - Get assigned shops for a specific user (admin only)
 * Returns the shops this user belongs to (within admin's owned shops)
 */
router.get('/:id/shops', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.id;

    // Get admin's owned shops
    const [adminShops] = await pool.query(
      `SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin'`, [adminId]
    );
    const ownedShopIds = adminShops.map(s => s.shop_id);

    if (ownedShopIds.length === 0) {
      return ApiResponse.success(res, []);
    }

    const placeholders = ownedShopIds.map(() => '?').join(',');
    const [assignments] = await pool.query(
      `SELECT us.shop_id, us.role, s.name as shop_name
       FROM user_shops us
       JOIN shops s ON us.shop_id = s.id
       WHERE us.user_id = ? AND us.shop_id IN (${placeholders})`,
      [userId, ...ownedShopIds]
    );

    return ApiResponse.success(res, assignments);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
