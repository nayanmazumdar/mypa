const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { ROLES } = require('../utils/constants');

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of users }
 */
router.get('/', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, uuid, name, email, phone, role, shop_name, is_active, created_at FROM users'
    );
    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Toggle user active status (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User status updated }
 */
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const pool = getPool();
    const { is_active } = req.body;
    await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
    return ApiResponse.success(res, null, 'User status updated');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
