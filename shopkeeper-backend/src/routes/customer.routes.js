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

    let query = 'SELECT * FROM customers WHERE user_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE user_id = ?';
    const params = [req.user.id];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      countQuery += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const countParams = [...params];
    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    const [countResult] = await pool.execute(countQuery, countParams);
    const pagination = buildPaginationMeta(countResult[0].total, page, limit);
    return ApiResponse.paginated(res, rows, pagination);
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
    const [rows] = await pool.execute(
      'SELECT * FROM customers WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
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
    const [result] = await pool.execute(
      'INSERT INTO customers (uuid, user_id, name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid, req.user.id, name, email || null, phone || null, address || null, notes || null]
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
    await pool.execute(
      'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, notes = ? WHERE id = ? AND user_id = ?',
      [name, email || null, phone || null, address || null, notes || null, req.params.id, req.user.id]
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
    await pool.execute('DELETE FROM customers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return ApiResponse.success(res, null, 'Customer deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
