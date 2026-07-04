const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * GET /api/shop - Get current user's shop details
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM shops WHERE id = ?', [req.user.shop_id]);
    if (rows.length === 0) return ApiResponse.notFound(res, 'Shop not found');
    return ApiResponse.success(res, rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/shop - Update shop details (owner/admin only)
 */
router.put('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, address, phone, email, gst_number, logo_url } = req.body;

    if (!name || !name.trim()) {
      return ApiResponse.error(res, 'Shop name is required', 400);
    }

    await pool.query(
      'UPDATE shops SET name=?, address=?, phone=?, email=?, gst_number=?, logo_url=? WHERE id=?',
      [name.trim(), address || null, phone || null, email || null, gst_number || null, logo_url || null, req.user.shop_id]
    );

    // Also update shop_name on the user record for quick access
    await pool.query('UPDATE users SET shop_name=? WHERE id=?', [name.trim(), req.user.id]);

    return ApiResponse.success(res, { name, address, phone, email, gst_number }, 'Shop updated');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
