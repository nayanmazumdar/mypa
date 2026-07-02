const express = require('express');
const router = express.Router();
const { getPool } = require('../config/mysql');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * @swagger
 * /api/payments:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment history
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Payment list }
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { page, limit, offset } = parsePagination(req.query);

    const [rows] = await pool.execute(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, limit, offset]
    );
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM payments WHERE user_id = ?',
      [req.user.id]
    );
    const pagination = buildPaginationMeta(countResult[0].total, page, limit);
    return ApiResponse.paginated(res, rows, pagination);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/payments:
 *   post:
 *     tags: [Payments]
 *     summary: Record a payment
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reference_type, reference_id, amount, payment_method]
 *             properties:
 *               reference_type: { type: string, enum: [sale, purchase] }
 *               reference_id: { type: integer }
 *               amount: { type: number }
 *               payment_method: { type: string, enum: [cash, card, upi, bank_transfer] }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Payment recorded }
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { reference_type, reference_id, amount, payment_method, notes } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO payments (user_id, reference_type, reference_id, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, reference_type, reference_id, amount, payment_method, notes || null]
    );

    // Update payment status on the referenced sale/purchase
    const table = reference_type === 'sale' ? 'sales' : 'purchases';
    const [[ref]] = await pool.execute(
      `SELECT net_amount FROM ${table} WHERE id = ? AND user_id = ?`,
      [reference_id, req.user.id]
    );

    if (ref) {
      const [[totalPaid]] = await pool.execute(
        'SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE reference_type = ? AND reference_id = ? AND user_id = ?',
        [reference_type, reference_id, req.user.id]
      );

      const status = totalPaid.paid >= ref.net_amount ? 'paid' : 'partial';
      await pool.execute(
        `UPDATE ${table} SET payment_status = ? WHERE id = ? AND user_id = ?`,
        [status, reference_id, req.user.id]
      );
    }

    return ApiResponse.created(res, { id: result.insertId }, 'Payment recorded');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
