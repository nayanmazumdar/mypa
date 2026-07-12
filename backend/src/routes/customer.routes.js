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

    // Build the customer list from POS transactions (walk-ins + registered),
    // plus any registered customers who haven't transacted yet.
    //
    // Strategy — UNION of two sets:
    //   A) Registered customers (from customers table) with their POS aggregates
    //   B) Walk-in POS customers (customer_id IS NULL, customer_name set)
    //      who have never been registered — de-duped by name
    //
    // Both sets share the same columns so the UI can render them uniformly.

    const shopId   = req.user.shop_id;
    const userId   = req.user.id;

    let baseQuery = `
      SELECT
        c.id,
        c.uuid,
        c.name,
        c.phone,
        c.email,
        c.address,
        c.notes,
        COALESCE(c.balance, 0)          AS balance,
        c.is_active,
        c.created_at,
        COALESCE(pos.total_spent, 0)    AS total_spent,
        COALESCE(pos.visit_count, 0)    AS visit_count,
        pos.last_visit,
        'registered'                    AS source
      FROM customers c
      LEFT JOIN (
        SELECT
          customer_id,
          SUM(net_amount)  AS total_spent,
          COUNT(*)         AS visit_count,
          MAX(created_at)  AS last_visit
        FROM pos_transactions
        WHERE shop_id = ? AND customer_id IS NOT NULL AND status = 'completed'
        GROUP BY customer_id
      ) pos ON pos.customer_id = c.id
      WHERE (c.shop_id = ? OR (c.shop_id IS NULL AND c.user_id = ?))

      UNION ALL

      SELECT
        NULL                              AS id,
        NULL                              AS uuid,
        w.customer_name                   AS name,
        NULL                              AS phone,
        NULL                              AS email,
        NULL                              AS address,
        NULL                              AS notes,
        0                                 AS balance,
        1                                 AS is_active,
        MIN(w.created_at)                 AS created_at,
        SUM(w.net_amount)                 AS total_spent,
        COUNT(*)                          AS visit_count,
        MAX(w.created_at)                 AS last_visit,
        'walkin'                          AS source
      FROM pos_transactions w
      WHERE w.shop_id = ?
        AND w.customer_id IS NULL
        AND w.customer_name IS NOT NULL
        AND w.status = 'completed'
      GROUP BY w.customer_name`;

    // Wrap in a subquery so we can apply search + ordering + pagination
    let query = `SELECT * FROM (${baseQuery}) AS all_customers`;
    let countQuery = `SELECT COUNT(*) AS total FROM (${baseQuery}) AS all_customers`;

    // Params for the inner UNION (4 params: shopId for pos agg, shopId + userId for customers, shopId for walkins)
    const innerParams = [shopId, shopId, userId, shopId];

    const filterParams = [...innerParams];
    const countFilterParams = [...innerParams];

    if (search) {
      const like = `%${search}%`;
      const searchClause = ' WHERE (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      query += searchClause;
      countQuery += searchClause;
      filterParams.push(like, like, like);
      countFilterParams.push(like, like, like);
    }

    query += ' ORDER BY last_visit IS NULL DESC, last_visit DESC, created_at DESC, name ASC LIMIT ? OFFSET ?';
    filterParams.push(limit, offset);

    const [rows] = await pool.query(query, filterParams);
    const [countResult] = await pool.query(countQuery, countFilterParams);
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
    if (!q || q.length < 1) return ApiResponse.success(res, []);

    const [rows] = await pool.query(
      `SELECT id, name, phone, email, balance FROM customers
       WHERE (shop_id = ? OR (shop_id IS NULL AND user_id = ?))
         AND (name LIKE ? OR phone LIKE ? OR email LIKE ?) AND is_active = 1
       ORDER BY name ASC LIMIT 10`,
      [req.user.shop_id, req.user.id, `%${q}%`, `%${q}%`, `%${q}%`]
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
      'SELECT * FROM customers WHERE id = ? AND (shop_id = ? OR (shop_id IS NULL AND user_id = ?))',
      [req.params.id, req.user.shop_id, req.user.id]
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
    if (!name || !name.trim()) return ApiResponse.error(res, 'Name is required', 400);
    const uuid = generateId();
    const [result] = await pool.query(
      'INSERT INTO customers (uuid, user_id, shop_id, name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid, req.user.id, req.user.shop_id, name.trim(), email || null, phone || null, address || null, notes || null]
    );
    // Return all saved fields so the frontend can build the selected customer correctly
    return ApiResponse.created(res, {
      id:    result.insertId,
      uuid,
      name:  name.trim(),
      email: email  || null,
      phone: phone  || null,
    });
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
      'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, notes = ? WHERE id = ? AND (shop_id = ? OR (shop_id IS NULL AND user_id = ?))',
      [name, email || null, phone || null, address || null, notes || null, req.params.id, req.user.shop_id, req.user.id]
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
    await pool.query(
      'DELETE FROM customers WHERE id = ? AND (shop_id = ? OR (shop_id IS NULL AND user_id = ?))',
      [req.params.id, req.user.shop_id, req.user.id]
    );
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
