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

    // Ensure the staff member belongs to the same shop and is not an admin
    const [[membership]] = await pool.query(
      'SELECT id, role FROM user_shops WHERE user_id = ? AND shop_id = ?',
      [req.params.id, req.user.shop_id]
    );
    if (!membership) return ApiResponse.notFound(res, 'Staff member not found in your shop');
    if (membership.role === 'admin') return ApiResponse.error(res, 'Cannot disable a shop admin', 403);

    await pool.query(
      'UPDATE user_shops SET is_active = ? WHERE user_id = ? AND shop_id = ?',
      [is_active ? 1 : 0, req.params.id, req.user.shop_id]
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

    // Verify belongs to this shop
    const [[membership]] = await pool.query(
      'SELECT id FROM user_shops WHERE user_id = ? AND shop_id = ?',
      [req.params.id, req.user.shop_id]
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

    // Ensure the staff member belongs to the same shop and is not the shop admin
    const [[membership]] = await pool.query(
      'SELECT id, role FROM user_shops WHERE user_id = ? AND shop_id = ?',
      [req.params.id, req.user.shop_id]
    );
    if (!membership) return ApiResponse.notFound(res, 'Staff member not found in your shop');
    if (membership.role === 'admin') return ApiResponse.error(res, 'Cannot change the role of a shop admin', 403);

    const updates = [];
    const params = [];
    if (role)        { updates.push('role = ?');        params.push(role); }
    if (designation !== undefined) { updates.push('designation = ?'); params.push(designation || null); }

    if (updates.length === 0) return ApiResponse.error(res, 'Nothing to update', 400);

    params.push(req.params.id, req.user.shop_id);
    await pool.query(
      `UPDATE user_shops SET ${updates.join(', ')} WHERE user_id = ? AND shop_id = ?`,
      params
    );
    return ApiResponse.success(res, null, 'Role updated successfully');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
