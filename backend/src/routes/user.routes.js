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
 * PATCH /api/users/:id/status - Toggle user active status (admin only)
 */
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { is_active } = req.body;
    // Ensure the user belongs to same shop
    const [user] = await pool.query('SELECT id FROM users WHERE id = ? AND shop_id = ?', [req.params.id, req.user.shop_id]);
    if (user.length === 0) return ApiResponse.notFound(res, 'User not found in your shop');

    await pool.query('UPDATE users SET is_active = ? WHERE id = ? AND shop_id = ?', [is_active, req.params.id, req.user.shop_id]);
    return ApiResponse.success(res, null, 'User status updated');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
