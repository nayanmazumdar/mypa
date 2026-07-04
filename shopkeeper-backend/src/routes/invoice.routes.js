const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * @swagger
 * /api/invoices/{saleId}:
 *   get:
 *     tags: [Invoices]
 *     summary: Get invoice for a sale
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Invoice data }
 */
router.get('/:saleId', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const [sales] = await pool.query(
      'SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ? AND s.user_id = ?',
      [req.params.saleId, req.user.shop_id]
    );

    if (sales.length === 0) return ApiResponse.notFound(res, 'Sale not found');

    const [items] = await pool.query(
      'SELECT si.*, p.name as product_name, p.sku FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
      [req.params.saleId]
    );

    const [user] = await pool.query(
      'SELECT name, email, phone, shop_name, address FROM users WHERE id = ?',
      [req.user.shop_id]
    );

    return ApiResponse.success(res, {
      sale: sales[0],
      items,
      shop: user[0],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
