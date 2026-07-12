const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { localDateStr } = require('../utils/helper');
const reportService = require('../services/report.service');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     tags: [Reports]
 *     summary: Get dashboard summary
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard data }
 */
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const data = await reportService.getDashboardSummary(req.user.id);
    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/daily-sales:
 *   get:
 *     tags: [Reports]
 *     summary: Get daily sales report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Daily sales data }
 */
router.get('/daily-sales', authenticate, async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const data = await reportService.getDailySales(req.user.id, date);
    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/monthly-sales:
 *   get:
 *     tags: [Reports]
 *     summary: Get monthly sales report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Monthly sales data }
 */
router.get('/monthly-sales', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const data = await reportService.getMonthlySales(req.user.id, year, month);
    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/top-products:
 *   get:
 *     tags: [Reports]
 *     summary: Get top selling products
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Top products }
 */
router.get('/top-products', authenticate, async (req, res, next) => {
  try {
    const { start_date, end_date, limit } = req.query;
    const data = await reportService.getTopProducts(req.user.id, start_date, end_date, parseInt(limit) || 10);
    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/profit:
 *   get:
 *     tags: [Reports]
 *     summary: Get profit report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profit data }
 */
router.get('/profit', authenticate, async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const data = await reportService.getProfitReport(req.user.id, start_date, end_date);
    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/today
 * Combined today snapshot: sales (invoice + POS), purchases, expenses, net cash flow
 */
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const pool   = getPool();
    const shopId = req.user.shop_id;
    const today  = localDateStr();

    // Run all queries in parallel; POS table may not exist on all installs
    const results = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(net_amount),0) as revenue
         FROM sales WHERE shop_id=? AND sale_date=? AND status='completed'`,
        [shopId, today]
      ),
      pool.query(
        `SELECT COUNT(*) as count,
                COALESCE(SUM(net_amount),0)  as total,
                COALESCE(SUM(paid_amount),0) as paid,
                COALESCE(SUM(due_amount),0)  as due
         FROM purchases WHERE shop_id=? AND purchase_date=?`,
        [shopId, today]
      ),
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total
         FROM expenses WHERE shop_id=? AND expense_date=?`,
        [shopId, today]
      ),
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(net_amount),0) as revenue
         FROM pos_transactions WHERE shop_id=? AND DATE(created_at)=? AND status='completed'`,
        [shopId, today]
      ).catch(() => [[{ count: 0, revenue: 0 }]]),
    ]);

    // pool.query returns [rows, fields]; grab row[0] from each
    const invoiceSales = results[0][0][0];
    const purchases    = results[1][0][0];
    const expenses     = results[2][0][0];
    const posTx        = results[3][0][0];

    const totalSalesRevenue = parseFloat(invoiceSales.revenue) + parseFloat(posTx.revenue);
    const totalSalesCount   = Number(invoiceSales.count)       + Number(posTx.count);
    const totalPurchases    = parseFloat(purchases.total);
    const totalExpenses     = parseFloat(expenses.total);
    const netCashFlow       = totalSalesRevenue - totalPurchases - totalExpenses;

    return ApiResponse.success(res, {
      date: today,
      sales: {
        count:           totalSalesCount,
        revenue:         totalSalesRevenue,
        invoice_count:   Number(invoiceSales.count),
        invoice_revenue: parseFloat(invoiceSales.revenue),
        pos_count:       Number(posTx.count),
        pos_revenue:     parseFloat(posTx.revenue),
      },
      purchases: {
        count: Number(purchases.count),
        total: totalPurchases,
        paid:  parseFloat(purchases.paid),
        due:   parseFloat(purchases.due),
      },
      expenses: {
        count: Number(expenses.count),
        total: totalExpenses,
      },
      net_cash_flow: netCashFlow,
    });
  } catch (error) {
    next(error);
  }
});

// ── module export ────────────────────────────────────────────────
module.exports = router;
