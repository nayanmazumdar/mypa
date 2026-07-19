const express = require('express');
const router = express.Router();
const { Shop, User } = require('../models');
const { authenticate, permit, authorize } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const { getPool } = require('../config/db');

/**
 * GET /api/shop/stats — Get performance stats for a specific shop (admin only)
 */
router.get('/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const shopId = req.query.shop_id;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    if (!shopId) return ApiResponse.error(res, 'shop_id required', 400);

    let dateFilter = '';
    const dateParams = [];
    if (startDate) { dateFilter += ' AND DATE(created_at) >= ?'; dateParams.push(startDate); }
    if (endDate) { dateFilter += ' AND DATE(created_at) <= ?'; dateParams.push(endDate); }

    // Total sales (POS)
    const [[sales]] = await pool.query(
      `SELECT COUNT(*) as bills, COALESCE(SUM(net_amount), 0) as revenue,
              COALESCE(SUM(cgst_amount), 0) as cgst, COALESCE(SUM(sgst_amount), 0) as sgst
       FROM pos_transactions WHERE shop_id = ? AND status = 'completed'${dateFilter}`, [shopId, ...dateParams]
    );

    // Total expenses
    let expenseDateFilter = '';
    const expDateParams = [];
    if (startDate) { expenseDateFilter += ' AND expense_date >= ?'; expDateParams.push(startDate); }
    if (endDate) { expenseDateFilter += ' AND expense_date <= ?'; expDateParams.push(endDate); }
    const [[expenses]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shop_id = ?${expenseDateFilter}`, [shopId, ...expDateParams]
    );

    // Total purchases
    let purchaseDateFilter = '';
    const purDateParams = [];
    if (startDate) { purchaseDateFilter += ' AND DATE(created_at) >= ?'; purDateParams.push(startDate); }
    if (endDate) { purchaseDateFilter += ' AND DATE(created_at) <= ?'; purDateParams.push(endDate); }
    const [[purchases]] = await pool.query(
      `SELECT COALESCE(SUM(net_amount), 0) as total FROM purchases WHERE shop_id = ? AND status != 'cancelled'${purchaseDateFilter}`, [shopId, ...purDateParams]
    );

    // Active staff count and list (with online status from login logs)
    const [staffList] = await pool.query(
      `SELECT u.name, u.email, us.role, us.is_active,
              (SELECT COUNT(*) FROM shop_login_logs l WHERE l.user_id = u.id AND l.shop_id = us.shop_id AND l.logout_at IS NULL) > 0 AS is_online,
              (SELECT MAX(l.logout_at) FROM shop_login_logs l WHERE l.user_id = u.id AND l.shop_id = us.shop_id AND l.logout_at IS NOT NULL) AS last_logout
       FROM user_shops us JOIN users u ON us.user_id = u.id
       WHERE us.shop_id = ? AND us.role != 'admin'
       ORDER BY is_online DESC, u.name ASC`, [shopId]
    );
    const activeStaffCount = staffList.filter(s => s.is_online).length;

    // Low stock count and details: products below min_stock_level OR with zero/no stock
    const [lowStockItems] = await pool.query(
      `SELECT p.name, COALESCE(i.quantity, 0) as quantity, p.min_stock_level
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id AND i.shop_id = p.shop_id
       WHERE p.shop_id = ? AND p.is_active = 1
       AND ((p.min_stock_level > 0 AND COALESCE(i.quantity, 0) <= p.min_stock_level)
            OR (COALESCE(i.quantity, 0) <= 0))
       ORDER BY COALESCE(i.quantity, 0) ASC LIMIT 10`, [shopId]
    );
    const lowStockCount = lowStockItems.length;

    // Daily sales breakdown for the selected range (for chart)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let chartDays = [];
    if (startDate && endDate) {
      const [dailyRows] = await pool.query(
        `SELECT DATE(created_at) as day, COALESCE(SUM(net_amount), 0) as revenue
         FROM pos_transactions WHERE shop_id = ? AND status = 'completed' AND DATE(created_at) >= ? AND DATE(created_at) <= ?
         GROUP BY DATE(created_at) ORDER BY day ASC`, [shopId, startDate, endDate]
      );
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const match = dailyRows.find(r => {
          if (!r.day) return false;
          const rDate = new Date(r.day);
          return `${rDate.getFullYear()}-${String(rDate.getMonth()+1).padStart(2,'0')}-${String(rDate.getDate()).padStart(2,'0')}` === dateStr;
        });
        chartDays.push({ label: `${d.getDate()}/${d.getMonth()+1} (${dayNames[d.getDay()]})`, revenue: match ? parseFloat(match.revenue) : 0 });
      }
      if (chartDays.length > 7) chartDays = chartDays.slice(-7);
    } else {
      const now = new Date();
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const [[row]] = await pool.query(
          `SELECT COALESCE(SUM(net_amount), 0) as revenue FROM pos_transactions WHERE shop_id = ? AND status = 'completed' AND DATE(created_at) = ?`, [shopId, dateStr]
        );
        chartDays.push({ label: `${d.getDate()}/${d.getMonth()+1} (${dayNames[d.getDay()]})`, revenue: parseFloat(row.revenue) });
      }
    }

    return ApiResponse.success(res, {
      total_sales: parseFloat(sales.revenue),
      total_bills: Number(sales.bills),
      total_cgst: parseFloat(sales.cgst),
      total_sgst: parseFloat(sales.sgst),
      total_expenses: parseFloat(expenses.total),
      total_purchases: parseFloat(purchases.total),
      active_staff: activeStaffCount,
      staff_list: staffList,
      low_stock: lowStockCount,
      low_stock_items: lowStockItems,
      last3days: chartDays,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/shop:
 *   get:
 *     tags: [Shop]
 *     summary: Get current shop details
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Shop information }
 *       404: { description: Shop not found }
 */
router.get('/', authenticate, permit('shop:read'), async (req, res, next) => {
  try {
    const shop = await Shop.findByPk(req.user.shop_id);
    if (!shop) return ApiResponse.notFound(res, 'Shop not found');
    return ApiResponse.success(res, shop);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/shop:
 *   put:
 *     tags: [Shop]
 *     summary: Update shop details
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
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               gst_number: { type: string }
 *               logo_url: { type: string }
 *     responses:
 *       200: { description: Shop updated }
 */
router.put('/', authenticate, permit('shop:update'), async (req, res, next) => {
  try {
    const { name, address, phone, email, gst_number, logo_url } = req.body;
    if (!name || !name.trim()) return ApiResponse.error(res, 'Shop name is required', 400);

    await Shop.update(
      { name: name.trim(), address: address || null, phone: phone || null, email: email || null, gst_number: gst_number || null, logo_url: logo_url || null },
      { where: { id: req.user.shop_id } }
    );

    await User.update({ shop_name: name.trim() }, { where: { id: req.user.id } });

    return ApiResponse.success(res, { name, address, phone, email, gst_number }, 'Shop updated');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
