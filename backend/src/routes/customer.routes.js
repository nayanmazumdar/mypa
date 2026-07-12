const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Customer, CustomerLedger } = require('../models');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { generateId } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * @swagger
 * /api/customers:
 *   get:
 *     tags: [Customers]
 *     summary: Get all customers
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name, phone, or email
 *     responses:
 *       200: { description: Paginated list of customers }
 */
router.get('/', authenticate, permit('customers:read'), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;

    const where = { shop_id: req.user.shop_id };
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Customer.findAndCountAll({
      where,
      order: [['name', 'ASC']],
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
 * /api/customers/search/quick:
 *   get:
 *     tags: [Customers]
 *     summary: Quick search customers (for POS autocomplete)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2 }
 *         description: Search query (min 2 chars)
 *     responses:
 *       200: { description: Matching customers (max 10) }
 */
router.get('/search/quick', authenticate, permit('customers:read'), async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return ApiResponse.success(res, []);

    const rows = await Customer.findAll({
      attributes: ['id', 'name', 'phone', 'email', 'balance'],
      where: {
        shop_id: req.user.shop_id,
        is_active: true,
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { phone: { [Op.like]: `%${q}%` } },
        ],
      },
      order: [['name', 'ASC']],
      limit: 10,
    });
    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Customer details }
 *       404: { description: Customer not found }
 */
router.get('/:id', authenticate, permit('customers:read'), async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, shop_id: req.user.shop_id },
    });
    if (!customer) return ApiResponse.notFound(res, 'Customer not found');
    return ApiResponse.success(res, customer);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create a new customer
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Rahul Sharma" }
 *               phone: { type: string }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Customer created }
 */
router.post('/', authenticate, permit('customers:create'), async (req, res, next) => {
  try {
    const { name, email, phone, address, notes } = req.body;
    const customer = await Customer.create({
      uuid: generateId(),
      user_id: req.user.id,
      shop_id: req.user.shop_id,
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
    });
    return ApiResponse.created(res, customer);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     tags: [Customers]
 *     summary: Update a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Customer updated }
 *       404: { description: Customer not found }
 */
router.put('/:id', authenticate, permit('customers:update'), async (req, res, next) => {
  try {
    const { name, email, phone, address, notes } = req.body;
    const [updated] = await Customer.update(
      { name, email: email || null, phone: phone || null, address: address || null, notes: notes || null },
      { where: { id: req.params.id, shop_id: req.user.shop_id } }
    );
    if (!updated) return ApiResponse.notFound(res, 'Customer not found');
    return ApiResponse.success(res, null, 'Customer updated');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Delete a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Customer deleted }
 *       404: { description: Customer not found }
 */
router.delete('/:id', authenticate, permit('customers:delete'), async (req, res, next) => {
  try {
    const deleted = await Customer.destroy({
      where: { id: req.params.id, shop_id: req.user.shop_id },
    });
    if (!deleted) return ApiResponse.notFound(res, 'Customer not found');
    return ApiResponse.success(res, null, 'Customer deleted');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customers/{id}/credit:
 *   post:
 *     tags: [Customers]
 *     summary: Add credit to customer balance
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
 *             required: [amount]
 *             properties:
 *               amount: { type: number, minimum: 0.01 }
 *               reference: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Credit added }
 */
router.post('/:id/credit', authenticate, permit('customers:ledger'), async (req, res, next) => {
  try {
    const { amount, reference, notes } = req.body;
    if (!amount || amount <= 0) return ApiResponse.error(res, 'Amount must be positive', 400);

    await Customer.increment('balance', {
      by: amount,
      where: { id: req.params.id, shop_id: req.user.shop_id },
    });

    await CustomerLedger.create({
      customer_id: req.params.id,
      shop_id: req.user.shop_id,
      type: 'credit',
      amount,
      reference: reference || null,
      notes: notes || null,
    });

    const customer = await Customer.findByPk(req.params.id, { attributes: ['id', 'name', 'balance'] });
    return ApiResponse.success(res, customer, 'Credit added');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customers/{id}/payment:
 *   post:
 *     tags: [Customers]
 *     summary: Record payment from customer (reduces balance)
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
 *             required: [amount]
 *             properties:
 *               amount: { type: number, minimum: 0.01 }
 *               payment_method: { type: string, enum: [cash, upi, card, bank_transfer], default: cash }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Payment recorded }
 */
router.post('/:id/payment', authenticate, permit('customers:ledger'), async (req, res, next) => {
  try {
    const { amount, payment_method, notes } = req.body;
    if (!amount || amount <= 0) return ApiResponse.error(res, 'Amount must be positive', 400);

    await Customer.decrement('balance', {
      by: amount,
      where: { id: req.params.id, shop_id: req.user.shop_id },
    });

    await CustomerLedger.create({
      customer_id: req.params.id,
      shop_id: req.user.shop_id,
      type: 'payment',
      amount,
      payment_method: payment_method || 'cash',
      notes: notes || null,
    });

    const customer = await Customer.findByPk(req.params.id, { attributes: ['id', 'name', 'balance'] });
    return ApiResponse.success(res, customer, 'Payment recorded');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customers/{id}/ledger:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer ledger entries
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Ledger entries (max 50) }
 */
router.get('/:id/ledger', authenticate, permit('customers:ledger'), async (req, res, next) => {
  try {
    const rows = await CustomerLedger.findAll({
      where: { customer_id: req.params.id, shop_id: req.user.shop_id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
