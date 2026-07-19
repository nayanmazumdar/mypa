/**
 * admin-dashboard.routes.js
 * Business overview & analytics endpoints for the admin panel.
 * Aggregates data across all shops the admin manages.
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

router.use(authenticate, authorize('admin'));

/**
 * GET /api/admin/dashboard/overview
 * High-level business stats across all admin's shops
 */
router.get('/overview', async (req, res, next) => {
  try {
    const pool = getPool();
    const adminId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    // Get admin's shop IDs
    const [adminShops] = await pool.query(
      `SELECT DISTINCT s.id FROM shops s
       WHERE s.owner_id = ? OR s.id IN (SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin')`,
      [adminId, adminId]
    );
    if (adminShops.length === 0) return ApiResponse.success(res, { shops: 0 });
    const shopIds = adminShops.map(s => s.id);
    const ph = shopIds.map(() => '?').join(',');

    // Parallel queries
    const [[shopCount]]  = await pool.query(`SELECT COUNT(*) as c FROM shops WHERE id IN (${ph})`, shopIds);
    const [[staffCount]] = await pool.query(`SELECT COUNT(DISTINCT user_id) as c FROM user_shops WHERE shop_id IN (${ph})`, shopIds);
    const [[productCount]] = await pool.query(`SELECT COUNT(*) as c FROM products WHERE shop_id IN (${ph})`, shopIds);
    const [[customerCount]] = await pool.query(`SELECT COUNT(*) as c FROM customers WHERE shop_id IN (${ph})`, shopIds);

    // Today's sales
    const [[todaySales]] = await pool.query(
      `SELECT COALESCE(SUM(net_amount), 0) as revenue, COUNT(*) as count
       FROM pos_transactions WHERE shop_id IN (${ph}) AND DATE(created_at) = ?`,
      [...shopIds, today]
    );

    // This month's sales
    const monthStart = today.slice(0, 7) + '-01';
    const [[monthSales]] = await pool.query(
      `SELECT COALESCE(SUM(net_amount), 0) as revenue, COUNT(*) as count
       FROM pos_transactions WHERE shop_id IN (${ph}) AND DATE(created_at) >= ?`,
      [...shopIds, monthStart]
    );

    // Today's expenses
    const [[todayExpenses]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE shop_id IN (${ph}) AND DATE(created_at) = ?`,
      [...shopIds, today]
    );

    // Low stock items
    const [[lowStockCount]] = await pool.query(
      `SELECT COUNT(*) as c FROM inventory
       WHERE shop_id IN (${ph}) AND quantity <= min_stock_level AND quantity > 0 AND min_stock_level > 0`,
      shopIds
    );

    // Out of stock
    const [[outOfStockCount]] = await pool.query(
      `SELECT COUNT(*) as c FROM inventory WHERE shop_id IN (${ph}) AND quantity <= 0`,
      shopIds
    );

    // Active staff today (logged in)
    const [[activeToday]] = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as c FROM shop_login_logs
       WHERE shop_id IN (${ph}) AND date = ? AND logout_at IS NULL`,
      [...shopIds, today]
    );

    return ApiResponse.success(res, {
      shops:         shopCount.c,
      staff:         staffCount.c,
      products:      productCount.c,
      customers:     customerCount.c,
      today_revenue: parseFloat(todaySales.revenue),
      today_sales:   todaySales.count,
      month_revenue: parseFloat(monthSales.revenue),
      month_sales:   monthSales.count,
      today_expenses:parseFloat(todayExpenses.total),
      today_profit:  parseFloat(todaySales.revenue) - parseFloat(todayExpenses.total),
      low_stock:     lowStockCount.c,
      out_of_stock:  outOfStockCount.c,
      active_staff:  activeToday.c,
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/dashboard/sales-chart?days=7
 * Daily sales data for charts
 */
router.get('/sales-chart', async (req, res, next) => {
  try {
    const pool = getPool();
    const adminId = req.user.id;
    const days = parseInt(req.query.days) || 7;

    const [adminShops] = await pool.query(
      `SELECT DISTINCT s.id FROM shops s
       WHERE s.owner_id = ? OR s.id IN (SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin')`,
      [adminId, adminId]
    );
    if (adminShops.length === 0) return ApiResponse.success(res, []);
    const shopIds = adminShops.map(s => s.id);
    const ph = shopIds.map(() => '?').join(',');

    const [rows] = await pool.query(
      `SELECT DATE(created_at) as date,
              COALESCE(SUM(net_amount), 0) as revenue,
              COUNT(*) as transactions
       FROM pos_transactions
       WHERE shop_id IN (${ph}) AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [...shopIds, days]
    );

    return ApiResponse.success(res, rows);
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/dashboard/top-products?limit=10
 * Top selling products across all shops
 */
router.get('/top-products', async (req, res, next) => {
  try {
    const pool = getPool();
    const adminId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const [adminShops] = await pool.query(
      `SELECT DISTINCT s.id FROM shops s
       WHERE s.owner_id = ? OR s.id IN (SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin')`,
      [adminId, adminId]
    );
    if (adminShops.length === 0) return ApiResponse.success(res, []);
    const shopIds = adminShops.map(s => s.id);
    const ph = shopIds.map(() => '?').join(',');

    const [rows] = await pool.query(
      `SELECT p.name, p.sku, SUM(pti.quantity) as total_sold, SUM(pti.total) as total_revenue
       FROM pos_transaction_items pti
       JOIN pos_transactions pt ON pt.id = pti.transaction_id
       JOIN products p ON p.id = pti.product_id
       WHERE pt.shop_id IN (${ph}) AND DATE(pt.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY p.id
       ORDER BY total_sold DESC
       LIMIT ?`,
      [...shopIds, limit]
    );

    return ApiResponse.success(res, rows);
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/dashboard/shop-comparison
 * Performance comparison across shops
 */
router.get('/shop-comparison', async (req, res, next) => {
  try {
    const pool = getPool();
    const adminId = req.user.id;

    const [adminShops] = await pool.query(
      `SELECT DISTINCT s.id FROM shops s
       WHERE s.owner_id = ? OR s.id IN (SELECT shop_id FROM user_shops WHERE user_id = ? AND role = 'admin')`,
      [adminId, adminId]
    );
    if (adminShops.length === 0) return ApiResponse.success(res, []);
    const shopIds = adminShops.map(s => s.id);
    const ph = shopIds.map(() => '?').join(',');

    const monthStart = new Date().toISOString().slice(0, 7) + '-01';

    const [rows] = await pool.query(
      `SELECT s.id, s.name,
              COALESCE(SUM(pt.net_amount), 0) as month_revenue,
              COUNT(pt.id) as month_transactions,
              (SELECT COUNT(DISTINCT us.user_id) FROM user_shops us WHERE us.shop_id = s.id) as staff_count,
              (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id) as product_count
       FROM shops s
       LEFT JOIN pos_transactions pt ON pt.shop_id = s.id AND DATE(pt.created_at) >= ?
       WHERE s.id IN (${ph})
       GROUP BY s.id
       ORDER BY month_revenue DESC`,
      [monthStart, ...shopIds]
    );

    return ApiResponse.success(res, rows);
  } catch (err) { next(err); }
});

module.exports = router;
