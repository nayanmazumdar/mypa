const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { authenticate, permit } = require('../middlewares/auth.middleware');
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
router.get('/', authenticate, permit('sales:read'), salesController.getAll);

/**
 * GET /api/sales/combined - Combined invoice + POS transactions list
 */
router.get('/combined', authenticate, permit('sales:read'), async (req, res, next) => {
  try {
    const pool = getPool();
    const shopId = req.user.shop_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Combined query: invoice sales + POS transactions
    const [rows] = await pool.query(
      `(SELECT 
          id, 'invoice' AS type, invoice_number AS receipt_number, customer_name,
          total_amount, discount, net_amount, payment_method, status, created_at
        FROM sales WHERE shop_id = ?)
       UNION ALL
       (SELECT 
          id, 'pos' AS type, receipt_number, customer_name,
          total_amount, discount, net_amount, payment_method, status, created_at
        FROM pos_transactions WHERE shop_id = ?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [shopId, shopId, limit, offset]
    );

    // Get total count
    const [[countResult]] = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM sales WHERE shop_id = ?) +
        (SELECT COUNT(*) FROM pos_transactions WHERE shop_id = ?) AS total`,
      [shopId, shopId]
    );

    const total = countResult.total;
    return ApiResponse.success(res, {
      sales: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

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
router.get('/:id', authenticate, permit('sales:read'), salesController.getById);

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
router.post('/', authenticate, permit('sales:create'), validate(createSaleValidator), salesController.create);

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
router.patch('/:id/status', authenticate, permit('sales:update'), salesController.updateStatus);

module.exports = router;
