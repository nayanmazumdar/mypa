const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * GET /api/expenses - List expenses
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { page, limit, offset } = parsePagination(req.query);
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM expenses WHERE shop_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM expenses WHERE shop_id = ?';
    const params = [req.user.shop_id];

    if (start_date) {
      query += ' AND expense_date >= ?';
      countQuery += ' AND expense_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND expense_date <= ?';
      countQuery += ' AND expense_date <= ?';
      params.push(end_date);
    }

    const countParams = [...params];
    query += ' ORDER BY expense_date DESC, created_at DESC LIMIT ? OFFSET ?';
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
 * POST /api/expenses - Create expense
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { category, description, amount, payment_method, expense_date } = req.body;

    if (!category || !amount) {
      return ApiResponse.error(res, 'Category and amount are required', 400);
    }

    const [result] = await pool.query(
      'INSERT INTO expenses (shop_id, category, description, amount, payment_method, expense_date) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.shop_id, category, description || null, amount, payment_method || 'cash', expense_date || new Date().toISOString().split('T')[0]]
    );

    return ApiResponse.created(res, { id: result.insertId, category, amount });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/expenses/:id - Delete expense
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM expenses WHERE id = ? AND shop_id = ?', [req.params.id, req.user.shop_id]);
    return ApiResponse.success(res, null, 'Expense deleted');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/expenses/summary - Get expense summary by category
 */
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { start_date, end_date } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let query = `SELECT category, SUM(amount) as total, COUNT(*) as count
                 FROM expenses WHERE shop_id = ?`;
    const params = [req.user.shop_id];

    if (start_date) {
      query += ' AND expense_date >= ?';
      params.push(start_date);
    } else {
      query += ' AND expense_date >= ?';
      params.push(today.slice(0, 7) + '-01'); // First of current month
    }
    if (end_date) {
      query += ' AND expense_date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY category ORDER BY total DESC';

    const [rows] = await pool.query(query, params);
    return ApiResponse.success(res, rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
