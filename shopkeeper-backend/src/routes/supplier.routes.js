const express = require('express');
const router = express.Router();
const { getPool } = require('../config/mysql');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { generateId } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get all suppliers
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of suppliers }
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { page, limit, offset } = parsePagination(req.query);

    const [rows] = await pool.execute(
      'SELECT * FROM suppliers WHERE user_id = ? ORDER BY name ASC LIMIT ? OFFSET ?',
      [req.user.id, limit, offset]
    );
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM suppliers WHERE user_id = ?',
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
 * /api/suppliers/{id}:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get supplier by ID
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Supplier details }
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM suppliers WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return ApiResponse.notFound(res, 'Supplier not found');
    return ApiResponse.success(res, rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     tags: [Suppliers]
 *     summary: Create a supplier
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Supplier created }
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, email, phone, company, address, gst_number } = req.body;
    const uuid = generateId();
    const [result] = await pool.execute(
      'INSERT INTO suppliers (uuid, user_id, name, email, phone, company, address, gst_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid, req.user.id, name, email || null, phone || null, company || null, address || null, gst_number || null]
    );
    return ApiResponse.created(res, { id: result.insertId, uuid, name });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/{id}:
 *   put:
 *     tags: [Suppliers]
 *     summary: Update a supplier
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Supplier updated }
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, email, phone, company, address, gst_number } = req.body;
    await pool.execute(
      'UPDATE suppliers SET name = ?, email = ?, phone = ?, company = ?, address = ?, gst_number = ? WHERE id = ? AND user_id = ?',
      [name, email || null, phone || null, company || null, address || null, gst_number || null, req.params.id, req.user.id]
    );
    return ApiResponse.success(res, null, 'Supplier updated');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     tags: [Suppliers]
 *     summary: Delete a supplier
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Supplier deleted }
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM suppliers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return ApiResponse.success(res, null, 'Supplier deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
