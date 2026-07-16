const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { generateId } = require('../utils/helper');

/**
 * GET /api/shifts/current — get current open shift
 */
router.get('/current', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const [[shift]] = await pool.query(
      `SELECT * FROM shifts WHERE shop_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1`,
      [req.user.shop_id]
    );
    return ApiResponse.success(res, shift || null);
  } catch (error) { next(error); }
});

/**
 * POST /api/shifts/open — open a new shift
 */
router.post('/open', authenticate, permit('pos:checkout'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { opening_cash } = req.body;

    // Check if there's already an open shift
    const [[existing]] = await pool.query(
      `SELECT id FROM shifts WHERE shop_id = ? AND status = 'open'`,
      [req.user.shop_id]
    );
    if (existing) {
      return ApiResponse.error(res, 'A shift is already open. Close it before opening a new one.', 400);
    }

    const uuid = generateId();
    const [result] = await pool.query(
      `INSERT INTO shifts (uuid, shop_id, user_id, status, opened_at, opening_cash)
       VALUES (?, ?, ?, 'open', NOW(), ?)`,
      [uuid, req.user.shop_id, req.user.id, parseFloat(opening_cash) || 0]
    );

    return ApiResponse.created(res, {
      id: result.insertId, uuid, status: 'open',
      opening_cash: parseFloat(opening_cash) || 0,
      opened_at: new Date().toISOString(),
    }, 'Shift opened');
  } catch (error) { next(error); }
});

/**
 * POST /api/shifts/close — close current shift with settlement
 */
router.post('/close', authenticate, permit('pos:checkout'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { closing_cash, notes } = req.body;

    const [[shift]] = await pool.query(
      `SELECT * FROM shifts WHERE shop_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1`,
      [req.user.shop_id]
    );
    if (!shift) {
      return ApiResponse.error(res, 'No open shift found', 404);
    }

    // Calculate sales during this shift
    const [[summary]] = await pool.query(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(net_amount), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN net_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'upi' THEN net_amount ELSE 0 END), 0) as upi_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN net_amount ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN net_amount ELSE 0 END), 0) as credit_sales
       FROM pos_transactions
       WHERE shop_id = ? AND created_at >= ?`,
      [req.user.shop_id, shift.opened_at]
    );

    // Calculate returns during this shift
    const [[returnSummary]] = await pool.query(
      `SELECT COALESCE(SUM(total_refund), 0) as total_returns
       FROM pos_returns WHERE shop_id = ? AND created_at >= ?`,
      [req.user.shop_id, shift.opened_at]
    );

    const expectedCash = parseFloat(shift.opening_cash) + parseFloat(summary.cash_sales) - parseFloat(returnSummary.total_returns);
    const actualClosing = parseFloat(closing_cash) || 0;
    const difference = actualClosing - expectedCash;

    await pool.query(
      `UPDATE shifts SET 
        status = 'closed', closed_at = NOW(), closing_cash = ?, expected_cash = ?,
        cash_difference = ?, total_sales = ?, total_transactions = ?,
        cash_sales = ?, upi_sales = ?, card_sales = ?, credit_sales = ?,
        total_returns = ?, notes = ?
       WHERE id = ?`,
      [actualClosing, expectedCash, difference,
       summary.total_sales, summary.total_transactions,
       summary.cash_sales, summary.upi_sales, summary.card_sales, summary.credit_sales,
       returnSummary.total_returns, notes || null, shift.id]
    );

    return ApiResponse.success(res, {
      id: shift.id,
      status: 'closed',
      opening_cash: parseFloat(shift.opening_cash),
      closing_cash: actualClosing,
      expected_cash: expectedCash,
      cash_difference: difference,
      total_sales: parseFloat(summary.total_sales),
      total_transactions: summary.total_transactions,
      cash_sales: parseFloat(summary.cash_sales),
      upi_sales: parseFloat(summary.upi_sales),
      card_sales: parseFloat(summary.card_sales),
      credit_sales: parseFloat(summary.credit_sales),
      total_returns: parseFloat(returnSummary.total_returns),
      opened_at: shift.opened_at,
      closed_at: new Date().toISOString(),
    }, 'Shift closed');
  } catch (error) { next(error); }
});

/**
 * GET /api/shifts/history — get past shifts
 */
router.get('/history', authenticate, permit('reports:read'), async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT s.*, u.name as user_name FROM shifts s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.shop_id = ? ORDER BY s.opened_at DESC LIMIT 30`,
      [req.user.shop_id]
    );
    return ApiResponse.success(res, rows);
  } catch (error) { next(error); }
});

module.exports = router;
