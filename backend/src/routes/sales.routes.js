const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createSaleValidator } = require('../validators/sale.validator');

const { getPool } = require('../config/db');
const ApiResponse = require('../utils/response');

/**
 * @swagger
 * /api/sales:
 *   get:
 *     tags: [Sales]
 *     summary: Get all sales
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, completed, cancelled] }
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: List of sales }
 */
router.get('/', authenticate, salesController.getAll);

/**
 * GET /api/sales/stats - Dashboard totals: combined invoice + POS sales count and revenue
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const shopId = req.user.shop_id;

    const [[invoiceStats]] = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(net_amount), 0) AS revenue
       FROM sales WHERE shop_id = ? AND status != 'cancelled'`,
      [shopId]
    );

    // pos_transactions may not exist on all installs — guard with try/catch
    let posCount = 0;
    let posRevenue = 0;
    try {
      const [[posStats]] = await pool.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(net_amount), 0) AS revenue
         FROM pos_transactions WHERE shop_id = ? AND status = 'completed'`,
        [shopId]
      );
      posCount = Number(posStats.count);
      posRevenue = parseFloat(posStats.revenue);
    } catch (_) { /* table may not exist in all environments */ }

    return ApiResponse.success(res, {
      total_sales: Number(invoiceStats.count) + posCount,
      total_revenue: parseFloat(invoiceStats.revenue) + posRevenue,
      invoice_sales: Number(invoiceStats.count),
      pos_sales: posCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get sale by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Sale details }
 */
router.get('/:id', authenticate, salesController.getById);

/**
 * @swagger
 * /api/sales:
 *   post:
 *     tags: [Sales]
 *     summary: Create a new sale
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Sale created }
 */
router.post('/', authenticate, validate(createSaleValidator), salesController.create);

/**
 * @swagger
 * /api/sales/{id}/status:
 *   patch:
 *     tags: [Sales]
 *     summary: Update sale status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status updated }
 */
router.patch('/:id/status', authenticate, salesController.updateStatus);

module.exports = router;
