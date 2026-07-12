const express = require('express');
const router = express.Router();
const { UserShop, User } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users in the shop (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of shop users }
 */
router.get('/', authenticate, permit('users:read'), async (req, res, next) => {
  try {
    const userShops = await UserShop.findAll({
      where: { shop_id: req.user.shop_id },
      include: [{
        model: User,
        attributes: ['id', 'uuid', 'name', 'email', 'phone', 'created_at'],
      }],
      order: [['joined_at', 'DESC']],
    });

    const rows = userShops.map(us => ({
      id: us.User.id,
      uuid: us.User.uuid,
      name: us.User.name,
      email: us.User.email,
      phone: us.User.phone,
      role: us.role,
      is_active: us.is_active,
      created_at: us.User.created_at,
    }));

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
 *     summary: Toggle user active status
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_active]
 *             properties:
 *               is_active: { type: boolean }
 *     responses:
 *       200: { description: Status updated }
 *       404: { description: User not found in shop }
 */
router.patch('/:id/status', authenticate, permit('users:manage'), async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const [updated] = await UserShop.update(
      { is_active },
      { where: { user_id: req.params.id, shop_id: req.user.shop_id } }
    );
    if (!updated) return ApiResponse.notFound(res, 'User not found in your shop');
    return ApiResponse.success(res, null, 'User status updated');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
