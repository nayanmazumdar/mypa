const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of categories }
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE shop_id = ? ORDER BY name ASC',
      [req.user.shop_id]
    );
    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a category
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Category created }
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO categories (shop_id, name, description) VALUES (?, ?, ?)',
      [req.user.shop_id, name, description || null]
    );
    return ApiResponse.created(res, { id: result.insertId, name, description });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Category updated }
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, description } = req.body;
    await pool.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ? AND shop_id = ?',
      [name, description || null, req.params.id, req.user.shop_id]
    );
    return ApiResponse.success(res, null, 'Category updated');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Category deleted }
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query(
      'DELETE FROM categories WHERE id = ? AND shop_id = ?',
      [req.params.id, req.user.shop_id]
    );
    return ApiResponse.success(res, null, 'Category deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
