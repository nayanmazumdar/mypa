const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate } = require('../middlewares/auth.middleware');
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
 *     responses:
 *       200: { description: List of customers }
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { page, limit, offset } = parsePagination(req.query);
    const search = req.query.search;

    let query = 'SELECT * FROM customers WHERE shop_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE shop_id = ?';
    const params = [req.user.shop_id];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      countQuery += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const countParams = [...params];
    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, countParams);
    const pagination = buildPaginationMeta(countResult[0].total, page, limit);
    return ApiResponse.paginated(res, rows, pagination);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/search/quick - Quick search for POS (returns top 10 by name/phone)
 */
router.get('/search/quick', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { q } = req.query;
    if (!q || q.length < 2) return ApiResponse.success(res, []);

    const [rows] = await pool.query(
      `SELECT id, name, phone, email, balance FROM customers
       WHERE shop_id = ? AND (name LIKE ? OR phone LIKE ?) AND is_active = 1
       ORDER BY name ASC LIMIT 10`,
      [req.user.shop_id, `%${q}%`, `%${q}%`]
    );
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
 *     responses:
 *       200: { description: Customer details }
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM customers WHERE id = ? AND shop_id = ?',
      [req.params.id, req.user.shop_id]
    );
    if (rows.length === 0) return ApiResponse.notFound(res, 'Customer not found');
    return ApiResponse.success(res, rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create a customer
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Customer created }
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, email, phone, address, notes } = req.body;
    const uuid = generateId();
    const [result] = await pool.query(
      'INSERT INTO customers (uuid, shop_id, name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid, req.user.shop_id, name, email || null, phone || null, address || null, notes || null]
    );
    return ApiResponse.created(res, { id: result.insertId, uuid, name });
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
 *     responses:
 *       200: { description: Customer updated }
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, email, phone, address, notes } = req.body;
    await pool.query(
      'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, notes = ? WHERE id = ? AND shop_id = ?',
      [name, email || null, phone || null, address || null, notes || null, req.params.id, req.user.shop_id]
    );
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
 *     responses:
 *       200: { description: Customer deleted }
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM customers WHERE id = ? AND shop_id = ?', [req.params.id, req.user.shop_id]);
    return ApiResponse.success(res, null, 'Customer deleted');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/customers/:id/credit - Add credit (increase balance) after a credit sale
 */
router.post('/:id/credit', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { amount, reference, notes } = req.body;
    if (!amount || amount <= 0) return ApiResponse.error(res, 'Amount must be positive', 400);

    await pool.query(
      'UPDATE customers SET balance = balance + ? WHERE id = ? AND shop_id = ?',
      [amount, req.params.id, req.user.shop_id]
    );

    // Log the credit transaction
    await pool.query(
      'INSERT INTO customer_ledger (customer_id, shop_id, type, amount, reference, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, req.user.shop_id, 'credit', amount, reference || null, notes || null]
    );

    const [[customer]] = await pool.query('SELECT id, name, balance FROM customers WHERE id = ?', [req.params.id]);
    return ApiResponse.success(res, customer, 'Credit added');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/customers/:id/payment - Record payment (reduce balance)
 */
router.post('/:id/payment', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { amount, payment_method, notes } = req.body;
    if (!amount || amount <= 0) return ApiResponse.error(res, 'Amount must be positive', 400);

    await pool.query(
      'UPDATE customers SET balance = GREATEST(0, balance - ?) WHERE id = ? AND shop_id = ?',
      [amount, req.params.id, req.user.shop_id]
    );

    await pool.query(
      'INSERT INTO customer_ledger (customer_id, shop_id, type, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, req.user.shop_id, 'payment', amount, payment_method || 'cash', notes || null]
    );

    const [[customer]] = await pool.query('SELECT id, name, balance FROM customers WHERE id = ?', [req.params.id]);
    return ApiResponse.success(res, customer, 'Payment recorded');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/:id/ledger - Get credit/payment history
 */
router.get('/:id/ledger', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM customer_ledger WHERE customer_id = ? AND shop_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.params.id, req.user.shop_id]
    );
    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
