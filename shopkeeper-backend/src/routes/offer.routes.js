const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * GET /api/offers - List all offers
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { page, limit, offset } = parsePagination(req.query);
    const { active_only } = req.query;

    let query = 'SELECT o.*, c.name as category_name, p.name as product_name FROM offers o LEFT JOIN categories c ON o.category_id = c.id LEFT JOIN products p ON o.product_id = p.id WHERE o.shop_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM offers WHERE shop_id = ?';
    const params = [req.user.shop_id];

    if (active_only === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query += ' AND o.is_active = 1 AND o.start_date <= ? AND o.end_date >= ?';
      countQuery += ' AND is_active = 1 AND start_date <= ? AND end_date >= ?';
      params.push(today, today);
    }

    const countParams = [...params];
    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
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
 * GET /api/offers/active - Get currently active offers (for POS)
 */
router.get('/active', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await pool.query(
      `SELECT o.*, c.name as category_name, p.name as product_name
       FROM offers o
       LEFT JOIN categories c ON o.category_id = c.id
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.shop_id = ? AND o.is_active = 1 AND o.start_date <= ? AND o.end_date >= ?
       ORDER BY o.discount_value DESC`,
      [req.user.shop_id, today, today]
    );
    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});


/**
 * POST /api/offers - Create an offer
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, applicable_to, category_id, product_id, start_date, end_date } = req.body;

    if (!name || !discount_value || !start_date || !end_date) {
      return ApiResponse.error(res, 'Name, discount value, start date and end date are required', 400);
    }

    const [result] = await pool.query(
      `INSERT INTO offers (shop_id, name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, applicable_to, category_id, product_id, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.shop_id, name, description || null, discount_type || 'percentage', discount_value, min_purchase_amount || 0, max_discount_amount || null, applicable_to || 'all', category_id || null, product_id || null, start_date, end_date]
    );

    return ApiResponse.created(res, { id: result.insertId, name, discount_type, discount_value });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/offers/:id - Update an offer
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, applicable_to, category_id, product_id, start_date, end_date, is_active } = req.body;

    await pool.query(
      `UPDATE offers SET name=?, description=?, discount_type=?, discount_value=?, min_purchase_amount=?, max_discount_amount=?, applicable_to=?, category_id=?, product_id=?, start_date=?, end_date=?, is_active=? WHERE id=? AND shop_id=?`,
      [name, description || null, discount_type, discount_value, min_purchase_amount || 0, max_discount_amount || null, applicable_to || 'all', category_id || null, product_id || null, start_date, end_date, is_active !== undefined ? is_active : 1, req.params.id, req.user.shop_id]
    );

    return ApiResponse.success(res, null, 'Offer updated');
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/offers/:id - Delete an offer
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM offers WHERE id = ? AND shop_id = ?', [req.params.id, req.user.shop_id]);
    return ApiResponse.success(res, null, 'Offer deleted');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/offers/for-product/:productId - Get active offers for a specific product
 */
router.get('/for-product/:productId', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];
    const productId = req.params.productId;

    // Get product's category
    const [[product]] = await pool.query('SELECT category_id FROM products WHERE id = ? AND shop_id = ?', [productId, req.user.shop_id]);

    const [rows] = await pool.query(
      `SELECT * FROM offers WHERE shop_id = ? AND is_active = 1 AND start_date <= ? AND end_date >= ?
       AND (applicable_to = 'all' OR (applicable_to = 'product' AND product_id = ?) OR (applicable_to = 'category' AND category_id = ?))
       ORDER BY discount_value DESC LIMIT 1`,
      [req.user.shop_id, today, today, productId, product?.category_id || 0]
    );

    return ApiResponse.success(res, rows[0] || null);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
