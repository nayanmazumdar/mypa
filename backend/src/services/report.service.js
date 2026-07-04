const { getPool } = require('../config/db');
const logger = require('../config/logger');

class ReportService {
  async getDailySales(userId, date) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(net_amount), 0) as total_revenue,
        COALESCE(SUM(discount), 0) as total_discount
       FROM sales
       WHERE user_id = ? AND sale_date = ? AND status = 'completed'`,
      [userId, date]
    );
    return rows[0];
  }

  async getMonthlySales(userId, year, month) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT 
        DATE(sale_date) as date,
        COUNT(*) as total_sales,
        COALESCE(SUM(net_amount), 0) as total_revenue
       FROM sales
       WHERE user_id = ? AND YEAR(sale_date) = ? AND MONTH(sale_date) = ? AND status = 'completed'
       GROUP BY DATE(sale_date)
       ORDER BY date`,
      [userId, year, month]
    );
    return rows;
  }

  async getTopProducts(userId, startDate, endDate, limit = 10) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT 
        p.id, p.name, p.sku,
        SUM(si.quantity) as total_quantity,
        SUM(si.total) as total_revenue
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       JOIN products p ON si.product_id = p.id
       WHERE s.user_id = ? AND s.sale_date BETWEEN ? AND ? AND s.status = 'completed'
       GROUP BY p.id, p.name, p.sku
       ORDER BY total_revenue DESC
       LIMIT ?`,
      [userId, startDate, endDate, limit]
    );
    return rows;
  }

  async getProfitReport(userId, startDate, endDate) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT 
        COALESCE(SUM(s.net_amount), 0) as total_sales,
        COALESCE(SUM(si.quantity * p.purchase_price), 0) as total_cost,
        COALESCE(SUM(s.net_amount), 0) - COALESCE(SUM(si.quantity * p.purchase_price), 0) as profit
       FROM sales s
       JOIN sale_items si ON s.id = si.sale_id
       JOIN products p ON si.product_id = p.id
       WHERE s.user_id = ? AND s.sale_date BETWEEN ? AND ? AND s.status = 'completed'`,
      [userId, startDate, endDate]
    );
    return rows[0];
  }

  async getDashboardSummary(userId) {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    const [[todaySales]] = await pool.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(net_amount), 0) as revenue
       FROM sales WHERE user_id = ? AND sale_date = ? AND status = 'completed'`,
      [userId, today]
    );

    const [[totalProducts]] = await pool.execute(
      'SELECT COUNT(*) as count FROM products WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    const [[totalCustomers]] = await pool.execute(
      'SELECT COUNT(*) as count FROM customers WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    const [[lowStock]] = await pool.execute(
      'SELECT COUNT(*) as count FROM inventory WHERE user_id = ? AND quantity <= min_stock_level',
      [userId]
    );

    return {
      today_sales: todaySales,
      total_products: totalProducts.count,
      total_customers: totalCustomers.count,
      low_stock_items: lowStock.count,
    };
  }
}

module.exports = new ReportService();
