const express = require('express');
const router = express.Router();
const { Shop, User } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * @swagger
 * /api/shop:
 *   get:
 *     tags: [Shop]
 *     summary: Get current shop details
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Shop information }
 *       404: { description: Shop not found }
 */
router.get('/', authenticate, permit('shop:read'), async (req, res, next) => {
  try {
    const shop = await Shop.findByPk(req.user.shop_id);
    if (!shop) return ApiResponse.notFound(res, 'Shop not found');
    return ApiResponse.success(res, shop);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/shop:
 *   put:
 *     tags: [Shop]
 *     summary: Update shop details
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               gst_number: { type: string }
 *               logo_url: { type: string }
 *     responses:
 *       200: { description: Shop updated }
 */
router.put('/', authenticate, permit('shop:update'), async (req, res, next) => {
  try {
    const { name, address, phone, email, gst_number, logo_url } = req.body;
    if (!name || !name.trim()) return ApiResponse.error(res, 'Shop name is required', 400);

    await Shop.update(
      { name: name.trim(), address: address || null, phone: phone || null, email: email || null, gst_number: gst_number || null, logo_url: logo_url || null },
      { where: { id: req.user.shop_id } }
    );

    await User.update({ shop_name: name.trim() }, { where: { id: req.user.id } });

    return ApiResponse.success(res, { name, address, phone, email, gst_number }, 'Shop updated');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
