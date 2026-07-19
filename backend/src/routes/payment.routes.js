const express = require('express');
const router = express.Router();
const { Payment, Sale, Purchase, sequelize } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { fn, col } = require('sequelize');

/**
 * @swagger
 * /api/payments:
 *   get:
 *     tags: [Payments]
 *     summary: Get all payments
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated list of payments }
 */
router.get('/', authenticate, permit('payments:read'), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const { rows, count } = await Payment.findAndCountAll({
      where: { shop_id: req.user.shop_id },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const pagination = buildPaginationMeta(count, page, limit);
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
 *     summary: Record a payment against a sale or purchase
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
 *               amount: { type: number, minimum: 0.01 }
 *               payment_method: { type: string, enum: [cash, upi, card, bank_transfer] }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Payment recorded }
 */
router.post('/', authenticate, permit('payments:create'), async (req, res, next) => {
  try {
    const { reference_type, reference_id, amount, payment_method, notes } = req.body;
    const { getPool } = require('../config/db');
    const pool = getPool();

    const payment = await Payment.create({
      user_id: req.user.id,
      shop_id: req.user.shop_id,
      reference_type,
      reference_id,
      amount,
      payment_method,
      notes: notes || null,
    });

    // Update payment status on the referenced sale/purchase/pos
    if (reference_type === 'pos') {
      // POS transaction — update payment_method from 'credit' to reflect partial/paid
      const [[posRef]] = await pool.query(
        'SELECT net_amount FROM pos_transactions WHERE id = ? AND shop_id = ?',
        [reference_id, req.user.shop_id]
      );
      if (posRef) {
        const totalPaid = await Payment.sum('amount', {
          where: { reference_type: 'pos', reference_id, shop_id: req.user.shop_id },
        });
        const newMethod = totalPaid >= parseFloat(posRef.net_amount) ? 'cash' : 'credit';
        await pool.query(
          'UPDATE pos_transactions SET payment_method = ? WHERE id = ? AND shop_id = ?',
          [newMethod, reference_id, req.user.shop_id]
        );
      }
    } else {
      const Model = reference_type === 'sale' ? Sale : Purchase;
      const ref = await Model.findOne({ where: { id: reference_id, shop_id: req.user.shop_id }, attributes: ['net_amount'] });

      if (ref) {
        const totalPaid = await Payment.sum('amount', {
          where: { reference_type, reference_id, shop_id: req.user.shop_id },
        });
        const status = totalPaid >= parseFloat(ref.net_amount) ? 'paid' : 'partial';
        await Model.update({ payment_status: status }, { where: { id: reference_id, shop_id: req.user.shop_id } });
      }
    }

    return ApiResponse.created(res, payment, 'Payment recorded');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/history/:reference_type/:reference_id - Get payment history for a transaction
 */
router.get('/history/:reference_type/:reference_id', authenticate, permit('payments:read'), async (req, res, next) => {
  try {
    const { reference_type, reference_id } = req.params;
    const payments = await Payment.findAll({
      where: { reference_type, reference_id, shop_id: req.user.shop_id },
      order: [['created_at', 'DESC']],
    });
    return ApiResponse.success(res, payments);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
