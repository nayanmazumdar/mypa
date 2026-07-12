const express = require('express');
const router = express.Router();
const { CustomerLedger, Customer } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { fn, col } = require('sequelize');

/**
 * @swagger
 * /api/customer-ledger/{customerId}:
 *   get:
 *     tags: [Customer Ledger]
 *     summary: Get ledger entries for a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated ledger entries }
 */
router.get('/:customerId', authenticate, permit('customer-ledger:read'), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const { rows, count } = await CustomerLedger.findAndCountAll({
      where: { customer_id: req.params.customerId, shop_id: req.user.shop_id },
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
 * /api/customer-ledger/{customerId}/balance:
 *   get:
 *     tags: [Customer Ledger]
 *     summary: Get customer balance summary
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Balance summary (credits, payments, net balance) }
 */
router.get('/:customerId/balance', authenticate, permit('customer-ledger:read'), async (req, res, next) => {
  try {
    const result = await CustomerLedger.findAll({
      attributes: [
        'type',
        [fn('SUM', col('amount')), 'total'],
      ],
      where: { customer_id: req.params.customerId, shop_id: req.user.shop_id },
      group: ['type'],
      raw: true,
    });

    const credits = parseFloat(result.find(r => r.type === 'credit')?.total || 0);
    const payments = parseFloat(result.find(r => r.type === 'payment')?.total || 0);
    const balance = (credits - payments).toFixed(2);

    return ApiResponse.success(res, { total_credit: credits, total_payment: payments, balance: parseFloat(balance) });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-ledger/{customerId}:
 *   post:
 *     tags: [Customer Ledger]
 *     summary: Add a credit or payment entry
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, amount]
 *             properties:
 *               type: { type: string, enum: [credit, payment] }
 *               amount: { type: number, minimum: 0.01 }
 *               payment_method: { type: string, enum: [cash, upi, card, bank_transfer] }
 *               reference: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Ledger entry created }
 */
router.post('/:customerId', authenticate, permit('customer-ledger:create'), async (req, res, next) => {
  try {
    const { type, amount, payment_method, reference, notes } = req.body;
    if (!type || !['credit', 'payment'].includes(type)) return ApiResponse.error(res, 'Type must be "credit" or "payment"', 400);
    if (!amount || amount <= 0) return ApiResponse.error(res, 'Amount must be greater than 0', 400);

    const customer = await Customer.findOne({ where: { id: req.params.customerId, shop_id: req.user.shop_id } });
    if (!customer) return ApiResponse.notFound(res, 'Customer not found');

    const entry = await CustomerLedger.create({
      customer_id: req.params.customerId,
      shop_id: req.user.shop_id,
      type,
      amount,
      payment_method: payment_method || null,
      reference: reference || null,
      notes: notes || null,
    });

    const balanceChange = type === 'credit' ? amount : -amount;
    await Customer.increment('balance', { by: balanceChange, where: { id: req.params.customerId, shop_id: req.user.shop_id } });

    return ApiResponse.created(res, entry);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
